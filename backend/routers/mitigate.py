import logging
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from models.schemas import (
    MitigationRequest, MitigationResponse, MetricComparison, BiasSeverity
)
from services.data_processor import get_session, save_mitigated_df, normalize_column_name
from services.bias_engine import run_full_analysis, _encode_labels

router = APIRouter()
logger = logging.getLogger(__name__)

SUPPORTED_METHODS = ["reweighing", "resampling", "exponentiated_gradient"]


@router.post("/", response_model=MitigationResponse)
def mitigate_bias(req: MitigationRequest):
    """
    Apply a debiasing technique and return before/after metric comparison.
    Currently implemented: 'resampling' (full Day 5-6 brings AIF360 + Fairlearn methods).
    """
    try:
        session = get_session(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if req.method not in SUPPORTED_METHODS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown method '{req.method}'. Choose from: {SUPPORTED_METHODS}",
        )

    df = session["df"]
    label_col = normalize_column_name(req.label_column)
    protected_attrs = [normalize_column_name(a) for a in req.protected_attributes]

    if label_col not in df.columns:
        raise HTTPException(status_code=400,
                            detail=f"Label column '{label_col}' not found.")

    # ── Before metrics ──────────────────────────────────────────────────────
    before_analyses, before_severity = run_full_analysis(
        df=df, label_col=label_col,
        protected_attributes=protected_attrs,
        positive_label=req.positive_label,
    )

    # ── Apply mitigation ────────────────────────────────────────────────────
    try:
        df_mitigated = _apply_mitigation(df, label_col, protected_attrs,
                                         req.positive_label, req.method)
    except Exception as e:
        logger.exception("Mitigation failed")
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {e}")

    mitigated_session_id = save_mitigated_df(req.session_id, df_mitigated)

    after_analyses, after_severity = run_full_analysis(
        df=df_mitigated, label_col=label_col,
        protected_attributes=protected_attrs,
        positive_label=req.positive_label,
    )

    # ── Build comparison ────────────────────────────────────────────────────
    comparisons: list[MetricComparison] = []
    for b_analysis, a_analysis in zip(before_analyses, after_analyses):
        for b_metric, a_metric in zip(b_analysis.metrics, a_analysis.metrics):
            if b_metric.name == "disparate_impact_ratio":
                improved = a_metric.value > b_metric.value
            else:
                improved = abs(a_metric.value) < abs(b_metric.value)
            comparisons.append(MetricComparison(
                metric_name=f"{b_analysis.attribute}:{b_metric.name}",
                before=b_metric.value,
                after=a_metric.value,
                improved=improved,
            ))

    return MitigationResponse(
        session_id=req.session_id,
        method=req.method,
        comparisons=comparisons,
        before_severity=before_severity,
        after_severity=after_severity,
        mitigated_session_id=mitigated_session_id,
    )


def _apply_mitigation(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: list,
    positive_label,
    method: str,
) -> pd.DataFrame:
    """
    Day 3-4 implementation: rebalanced resampling across (attribute × label) groups.
    Works without AIF360/Fairlearn dependencies — guaranteed stable for demo.
    Day 5-6 will add AIF360 Reweighing + Fairlearn ExponentiatedGradient.
    """
    if method in ("reweighing", "resampling"):
        return _rebalance_resample(df, label_col, protected_attrs[0], positive_label)
    elif method == "exponentiated_gradient":
        # Placeholder until Day 6 — apply resampling as best-effort
        return _rebalance_resample(df, label_col, protected_attrs[0], positive_label)
    return df.copy()


def _rebalance_resample(
    df: pd.DataFrame,
    label_col: str,
    attribute: str,
    positive_label,
) -> pd.DataFrame:
    """
    Upsample positive examples in underprivileged groups to equalize
    positive rates across groups. Demonstrates real mitigation effect.
    """
    y = _encode_labels(df[label_col], positive_label)
    df_copy = df.copy()
    df_copy["__y"] = y

    groups = df_copy[attribute].astype(str).unique()
    pos_rates = {
        g: df_copy.loc[df_copy[attribute].astype(str) == g, "__y"].mean()
        for g in groups
    }
    max_rate = max(pos_rates.values())

    frames = []
    rng = np.random.RandomState(42)
    for g in groups:
        grp_df = df_copy[df_copy[attribute].astype(str) == g]
        pos = grp_df[grp_df["__y"] == 1]
        neg = grp_df[grp_df["__y"] == 0]

        # How many positives we need for this group to match max_rate
        target_pos = int(round(max_rate * len(grp_df)))
        if len(pos) > 0 and target_pos > len(pos):
            extra = pos.sample(target_pos - len(pos), replace=True,
                               random_state=rng.randint(10_000))
            pos = pd.concat([pos, extra])

        frames.append(pd.concat([pos, neg]))

    result = pd.concat(frames).drop(columns=["__y"]).reset_index(drop=True)
    return result
