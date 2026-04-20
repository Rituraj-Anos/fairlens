"""
bias_engine.py — Day 5 update
Fixed: Equalized Odds and Average Odds now compute correctly.
Returns None for metrics that cannot be computed instead of 0.
"""
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
from sklearn.preprocessing import LabelEncoder

from models.schemas import (
    AttributeAnalysis,
    FairnessMetric,
    GroupStats,
    BiasSeverity,
)

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
        "Difference in P(Ŷ=1) between groups. ≤0.05 is fair.",
    "average_odds_difference":
        "Average of TPR difference and FPR difference. ≤0.10 is fair.",
}


def _encode_labels(series: pd.Series) -> np.ndarray:
    if series.dtype == bool:
        return series.astype(int).values
    if set(series.dropna().unique()).issubset({0, 1, "0", "1"}):
        return series.astype(int).values
    le = LabelEncoder()
    return le.fit_transform(series.astype(str))


def _has_both_classes(y: np.ndarray) -> bool:
    return len(np.unique(y)) == 2


def _severity_from_metrics(metrics: List[FairnessMetric]) -> BiasSeverity:
    failures = [m for m in metrics if not m.passed and not m.not_applicable]
    if not failures:
        return BiasSeverity.FAIR

    worst_dpd = next((abs(m.value) for m in failures
                      if m.name == "demographic_parity_difference"), None)
    worst_dir = next((m.value for m in failures
                      if m.name == "disparate_impact_ratio"), None)

    if worst_dpd is not None:
        if worst_dpd >= 0.30: return BiasSeverity.CRITICAL
        if worst_dpd >= 0.20: return BiasSeverity.HIGH
        if worst_dpd >= 0.10: return BiasSeverity.MODERATE
    if worst_dir is not None:
        if worst_dir < 0.60: return BiasSeverity.CRITICAL
        if worst_dir < 0.70: return BiasSeverity.HIGH

    return BiasSeverity.LOW


def _group_stats(y_true, y_pred, sensitive) -> List[GroupStats]:
    stats = []
    for grp in sorted(sensitive.unique()):
        mask = sensitive == grp
        yt, yp = y_true[mask], y_pred[mask]
        n = int(mask.sum())
        pos_rate = float(yp.mean()) if n > 0 else 0.0
        tpr = fpr = None
        if n > 0 and _has_both_classes(yt):
            try:
                tpr = round(float(true_positive_rate(yt, yp)), 4)
                fpr = round(float(false_positive_rate(yt, yp)), 4)
            except Exception:
                pass
        stats.append(GroupStats(
            group=str(grp), count=n,
            positive_rate=round(pos_rate, 4),
            true_positive_rate=tpr,
            false_positive_rate=fpr,
        ))
    return stats


def _safe_equalized_odds(y_true, y_pred, sensitive) -> Tuple[Optional[float], Optional[float]]:
    if not _has_both_classes(y_true):
        return None, None
    for grp in sensitive.unique():
        if not _has_both_classes(y_true[sensitive == grp]):
            return None, None
    try:
        eod = round(float(equalized_odds_difference(
            y_true, y_pred, sensitive_features=sensitive)), 4)
        mf = MetricFrame(
            metrics={"tpr": true_positive_rate, "fpr": false_positive_rate},
            y_true=y_true, y_pred=y_pred, sensitive_features=sensitive,
        )
        aod = round((float(mf.difference()["tpr"]) + float(mf.difference()["fpr"])) / 2, 4)
        return eod, aod
    except Exception:
        return None, None


def compute_metrics_for_attribute(
    df: pd.DataFrame,
    label_col: str,
    attribute_col: str,
    positive_label: Any = 1,
    prediction_col: Optional[str] = None,
) -> AttributeAnalysis:

    y_true = _encode_labels(df[label_col])
    y_pred = _encode_labels(df[prediction_col]) if prediction_col and prediction_col in df.columns else y_true
    sensitive = df[attribute_col].astype(str)

    dpd = round(float(demographic_parity_difference(y_true, y_pred, sensitive_features=sensitive)), 4)
    dir_val = round(float(demographic_parity_ratio(y_true, y_pred, sensitive_features=sensitive)), 4)
    spd = dpd
    eod, aod = _safe_equalized_odds(y_true, y_pred, sensitive)

    metrics = [
        FairnessMetric(
            name="demographic_parity_difference", value=dpd,
            threshold=THRESHOLDS["demographic_parity_difference"],
            passed=abs(dpd) <= THRESHOLDS["demographic_parity_difference"],
            description=METRIC_DESCRIPTIONS["demographic_parity_difference"],
            not_applicable=False,
        ),
        FairnessMetric(
            name="disparate_impact_ratio", value=dir_val,
            threshold=THRESHOLDS["disparate_impact_ratio"],
            passed=dir_val >= THRESHOLDS["disparate_impact_ratio"],
            description=METRIC_DESCRIPTIONS["disparate_impact_ratio"],
            not_applicable=False,
        ),
        FairnessMetric(
            name="equalized_odds_difference",
            value=eod if eod is not None else 0.0,
            threshold=THRESHOLDS["equalized_odds_difference"],
            passed=abs(eod) <= THRESHOLDS["equalized_odds_difference"] if eod is not None else True,
            description=METRIC_DESCRIPTIONS["equalized_odds_difference"],
            not_applicable=eod is None,
        ),
        FairnessMetric(
            name="statistical_parity_difference", value=spd,
            threshold=THRESHOLDS["statistical_parity_difference"],
            passed=abs(spd) <= THRESHOLDS["statistical_parity_difference"],
            description=METRIC_DESCRIPTIONS["statistical_parity_difference"],
            not_applicable=False,
        ),
        FairnessMetric(
            name="average_odds_difference",
            value=aod if aod is not None else 0.0,
            threshold=THRESHOLDS["average_odds_difference"],
            passed=abs(aod) <= THRESHOLDS["average_odds_difference"] if aod is not None else True,
            description=METRIC_DESCRIPTIONS["average_odds_difference"],
            not_applicable=aod is None,
        ),
    ]

    return AttributeAnalysis(
        attribute=attribute_col,
        groups=_group_stats(y_true, y_pred, sensitive),
        metrics=metrics,
        severity=_severity_from_metrics(metrics),
    )


def run_full_analysis(
    df: pd.DataFrame,
    label_col: str,
    protected_attributes: List[str],
    positive_label: Any = 1,
    prediction_col: Optional[str] = None,
) -> Tuple[List[AttributeAnalysis], BiasSeverity]:

    analyses = []
    for attr in protected_attributes:
        if attr not in df.columns:
            continue
        analyses.append(compute_metrics_for_attribute(
            df, label_col, attr, positive_label, prediction_col
        ))

    severity_order = [
        BiasSeverity.CRITICAL, BiasSeverity.HIGH,
        BiasSeverity.MODERATE, BiasSeverity.LOW, BiasSeverity.FAIR,
    ]
    severities = [a.severity for a in analyses]
    overall = BiasSeverity.FAIR
    for s in severity_order:
        if s in severities:
            overall = s
            break

    return analyses, overall
