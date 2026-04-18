"""
bias_engine.py
Computes fairness metrics for a dataset using Fairlearn.
All public functions accept a pandas DataFrame and string column names.
"""
import logging
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple

from fairlearn.metrics import (
    demographic_parity_difference,
    demographic_parity_ratio,
    equalized_odds_difference,
    false_positive_rate,
    true_positive_rate,
    MetricFrame,
)

from models.schemas import (
    AttributeAnalysis,
    FairnessMetric,
    GroupStats,
    BiasSeverity,
)

logger = logging.getLogger(__name__)

# ─── Threshold constants (industry standard) ────────────────────────────────
THRESHOLDS = {
    "demographic_parity_difference": 0.10,
    "disparate_impact_ratio":        0.80,
    "equalized_odds_difference":     0.10,
    "statistical_parity_difference": 0.05,
    "average_odds_difference":       0.10,
}

METRIC_DESCRIPTIONS = {
    "demographic_parity_difference":
        "Difference in positive prediction rates between groups. ≤0.10 is fair.",
    "disparate_impact_ratio":
        "Ratio of positive rates (minority/majority). ≥0.80 satisfies the 4/5 rule.",
    "equalized_odds_difference":
        "Max difference in TPR and FPR across groups. ≤0.10 is fair.",
    "statistical_parity_difference":
        "Signed difference in P(Ŷ=1) between unprivileged and privileged groups.",
    "average_odds_difference":
        "Average of TPR difference and FPR difference. ≤0.10 is fair.",
}


def _encode_labels(series: pd.Series, positive_label: Any = 1) -> np.ndarray:
    """Convert any label type to 0/1 integer array, honoring positive_label."""
    if series.dtype == bool:
        return series.astype(int).values

    unique_vals = set(series.dropna().unique())

    # Already binary 0/1 (int or string)
    if unique_vals.issubset({0, 1, "0", "1", True, False}):
        arr = series.astype(str).map({"0": 0, "1": 1, "True": 1, "False": 0}).values
        return arr.astype(int)

    # Use positive_label to assign 1
    pos = str(positive_label).lower()
    return series.astype(str).str.lower().apply(
        lambda v: 1 if v == pos else 0
    ).values.astype(int)


def _compute_spd(y_pred: np.ndarray, sensitive: pd.Series) -> float:
    """
    Statistical Parity Difference: signed difference between the group with
    the HIGHEST positive rate (privileged) and the LOWEST (unprivileged).
    Returns a negative number indicating how far unprivileged lags behind.
    """
    rates = {}
    for grp in sensitive.unique():
        mask = sensitive == grp
        if mask.sum() > 0:
            rates[grp] = float(y_pred[mask].mean())
    if len(rates) < 2:
        return 0.0
    privileged = max(rates, key=rates.get)
    unprivileged = min(rates, key=rates.get)
    return rates[unprivileged] - rates[privileged]  # negative = bias against unpriv.


def _severity_from_metrics(metrics: List[FairnessMetric]) -> BiasSeverity:
    """Derive overall severity from ALL failing metrics. Takes the worst."""
    failures = [m for m in metrics if not m.passed]
    if not failures:
        return BiasSeverity.FAIR

    worst_severity = BiasSeverity.LOW

    for m in failures:
        if m.name == "demographic_parity_difference":
            v = abs(m.value)
            if v >= 0.30: sev = BiasSeverity.CRITICAL
            elif v >= 0.20: sev = BiasSeverity.HIGH
            elif v >= 0.10: sev = BiasSeverity.MODERATE
            else: sev = BiasSeverity.LOW
        elif m.name == "disparate_impact_ratio":
            if m.value < 0.60: sev = BiasSeverity.CRITICAL
            elif m.value < 0.70: sev = BiasSeverity.HIGH
            elif m.value < 0.80: sev = BiasSeverity.MODERATE
            else: sev = BiasSeverity.LOW
        elif m.name == "statistical_parity_difference":
            v = abs(m.value)
            if v >= 0.30: sev = BiasSeverity.CRITICAL
            elif v >= 0.20: sev = BiasSeverity.HIGH
            elif v >= 0.10: sev = BiasSeverity.MODERATE
            else: sev = BiasSeverity.LOW
        else:
            sev = BiasSeverity.MODERATE

        # Keep the worst
        order = [BiasSeverity.CRITICAL, BiasSeverity.HIGH,
                 BiasSeverity.MODERATE, BiasSeverity.LOW, BiasSeverity.FAIR]
        if order.index(sev) < order.index(worst_severity):
            worst_severity = sev

    return worst_severity


def _group_stats(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    sensitive: pd.Series,
) -> List[GroupStats]:
    stats = []
    for grp in sorted(sensitive.unique()):
        mask = sensitive == grp
        yt, yp = y_true[mask], y_pred[mask]
        n = int(mask.sum())
        pos_rate = float(yp.mean()) if n > 0 else 0.0
        tpr = fpr = None
        if n > 0 and len(np.unique(yt)) == 2:
            try:
                tpr = float(true_positive_rate(yt, yp))
                fpr = float(false_positive_rate(yt, yp))
            except Exception as e:
                logger.warning(f"Could not compute TPR/FPR for group {grp}: {e}")
        stats.append(GroupStats(
            group=str(grp),
            count=n,
            positive_rate=round(pos_rate, 4),
            true_positive_rate=round(tpr, 4) if tpr is not None else None,
            false_positive_rate=round(fpr, 4) if fpr is not None else None,
        ))
    return stats


def _build_intersectional_matrix(
    y_pred: np.ndarray,
    df: pd.DataFrame,
    attributes: List[str],
) -> Optional[Dict[str, Any]]:
    """Build a 2-attribute intersectional heatmap matrix (first 2 attrs only)."""
    if len(attributes) < 2:
        return None
    a1, a2 = attributes[0], attributes[1]
    if a1 not in df.columns or a2 not in df.columns:
        return None
    groups1 = sorted(df[a1].astype(str).unique())
    groups2 = sorted(df[a2].astype(str).unique())
    matrix = {}
    for g1 in groups1:
        matrix[g1] = {}
        for g2 in groups2:
            mask = (df[a1].astype(str) == g1) & (df[a2].astype(str) == g2)
            if mask.sum() == 0:
                matrix[g1][g2] = None
            else:
                matrix[g1][g2] = round(float(y_pred[mask].mean()), 4)
    return {"row_attribute": a1, "col_attribute": a2, "matrix": matrix}


def compute_metrics_for_attribute(
    df: pd.DataFrame,
    label_col: str,
    attribute_col: str,
    positive_label: Any = 1,
    prediction_col: Optional[str] = None,
) -> AttributeAnalysis:
    """Compute all fairness metrics for a single protected attribute."""

    y_true = _encode_labels(df[label_col], positive_label)
    if prediction_col and prediction_col in df.columns:
        y_pred = _encode_labels(df[prediction_col], positive_label)
    else:
        y_pred = y_true

    sensitive = df[attribute_col].astype(str)

    # ── Demographic Parity Difference ──────────────────────────────────────
    dpd = float(demographic_parity_difference(
        y_true, y_pred, sensitive_features=sensitive
    ))

    # ── Disparate Impact Ratio ─────────────────────────────────────────────
    try:
        dir_val = float(demographic_parity_ratio(
            y_true, y_pred, sensitive_features=sensitive
        ))
    except Exception:
        dir_val = 0.0
    if np.isnan(dir_val) or np.isinf(dir_val):
        dir_val = 0.0

    # ── Statistical Parity Difference (SIGNED, unprivileged - privileged) ─
    spd = _compute_spd(y_pred, sensitive)

    # ── Equalized Odds / Average Odds ──────────────────────────────────────
    if len(np.unique(y_true)) == 2:
        try:
            eod = float(equalized_odds_difference(
                y_true, y_pred, sensitive_features=sensitive
            ))
            mf = MetricFrame(
                metrics={"tpr": true_positive_rate, "fpr": false_positive_rate},
                y_true=y_true, y_pred=y_pred,
                sensitive_features=sensitive,
            )
            tpr_diff = float(mf.difference()["tpr"])
            fpr_diff = float(mf.difference()["fpr"])
            aod = round((tpr_diff + fpr_diff) / 2, 4)
        except Exception as e:
            logger.warning(f"EOD/AOD computation failed: {e}")
            eod = 0.0
            aod = 0.0
    else:
        eod = 0.0
        aod = 0.0

    metrics = [
        FairnessMetric(
            name="demographic_parity_difference",
            value=round(dpd, 4),
            threshold=THRESHOLDS["demographic_parity_difference"],
            passed=abs(dpd) <= THRESHOLDS["demographic_parity_difference"],
            description=METRIC_DESCRIPTIONS["demographic_parity_difference"],
        ),
        FairnessMetric(
            name="disparate_impact_ratio",
            value=round(dir_val, 4),
            threshold=THRESHOLDS["disparate_impact_ratio"],
            passed=dir_val >= THRESHOLDS["disparate_impact_ratio"],
            description=METRIC_DESCRIPTIONS["disparate_impact_ratio"],
        ),
        FairnessMetric(
            name="equalized_odds_difference",
            value=round(eod, 4),
            threshold=THRESHOLDS["equalized_odds_difference"],
            passed=abs(eod) <= THRESHOLDS["equalized_odds_difference"],
            description=METRIC_DESCRIPTIONS["equalized_odds_difference"],
        ),
        FairnessMetric(
            name="statistical_parity_difference",
            value=round(spd, 4),
            threshold=THRESHOLDS["statistical_parity_difference"],
            passed=abs(spd) <= THRESHOLDS["statistical_parity_difference"],
            description=METRIC_DESCRIPTIONS["statistical_parity_difference"],
        ),
        FairnessMetric(
            name="average_odds_difference",
            value=aod,
            threshold=THRESHOLDS["average_odds_difference"],
            passed=abs(aod) <= THRESHOLDS["average_odds_difference"],
            description=METRIC_DESCRIPTIONS["average_odds_difference"],
        ),
    ]

    severity = _severity_from_metrics(metrics)
    group_stats = _group_stats(y_true, y_pred, sensitive)

    return AttributeAnalysis(
        attribute=attribute_col,
        groups=group_stats,
        metrics=metrics,
        severity=severity,
    )


def run_full_analysis(
    df: pd.DataFrame,
    label_col: str,
    protected_attributes: List[str],
    positive_label: Any = 1,
    prediction_col: Optional[str] = None,
) -> Tuple[List[AttributeAnalysis], BiasSeverity]:
    """Run bias analysis for all protected attributes. Returns (analyses, overall_severity)."""
    analyses = []
    for attr in protected_attributes:
        if attr not in df.columns:
            logger.warning(f"Skipping missing attribute: {attr}")
            continue
        analysis = compute_metrics_for_attribute(
            df, label_col, attr, positive_label, prediction_col
        )
        if len(protected_attributes) > 1:
            analysis.intersectional_matrix = _build_intersectional_matrix(
                _encode_labels(df[label_col], positive_label),
                df, protected_attributes,
            )
        analyses.append(analysis)

    severities = [a.severity for a in analyses]
    severity_order = [
        BiasSeverity.CRITICAL, BiasSeverity.HIGH,
        BiasSeverity.MODERATE, BiasSeverity.LOW, BiasSeverity.FAIR,
    ]
    overall = BiasSeverity.FAIR
    for s in severity_order:
        if s in severities:
            overall = s
            break

    return analyses, overall
