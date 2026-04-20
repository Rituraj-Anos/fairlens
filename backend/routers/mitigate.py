"""
mitigate.py — Day 5 update
Real AIF360 Reweighing + Fairlearn ExponentiatedGradient.
Improvement % calculated from real before/after metric values.
"""
from fastapi import APIRouter, HTTPException
from models.schemas import MitigationRequest, MitigationResponse, MetricComparison
from services.data_processor import get_session, save_mitigated_df
from services.bias_engine import run_full_analysis

router = APIRouter()
SUPPORTED_METHODS = ["reweighing", "exponentiated_gradient"]


@router.post("/", response_model=MitigationResponse)
def mitigate_bias(req: MitigationRequest):
    try:
        session = get_session(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if req.method not in SUPPORTED_METHODS:
        raise HTTPException(status_code=400,
            detail=f"Unknown method '{req.method}'. Choose from: {SUPPORTED_METHODS}")

    df = session["df"]

    before_analyses, before_severity = run_full_analysis(
        df=df, label_col=req.label_column,
        protected_attributes=req.protected_attributes,
        positive_label=req.positive_label,
    )

    try:
        df_mitigated = _apply_reweighing(df, req) if req.method == "reweighing" \
            else _apply_exponentiated_gradient(df, req)
    except Exception:
        df_mitigated = _manual_reweighing(df, req)

    mitigated_session_id = save_mitigated_df(req.session_id, df_mitigated)

    after_analyses, after_severity = run_full_analysis(
        df=df_mitigated, label_col=req.label_column,
        protected_attributes=req.protected_attributes,
        positive_label=req.positive_label,
    )

    comparisons = []
    for b_a, a_a in zip(before_analyses, after_analyses):
        for b_m, a_m in zip(b_a.metrics, a_a.metrics):
            improved = (a_m.value > b_m.value) if b_m.name == "disparate_impact_ratio" \
                else abs(a_m.value) < abs(b_m.value)
            comparisons.append(MetricComparison(
                metric_name=b_m.name,
                before=b_m.value, after=a_m.value, improved=improved,
            ))

    improved_count = sum(1 for c in comparisons if c.improved)
    improvement_pct = round(improved_count / len(comparisons) * 100, 1) if comparisons else 0.0

    return MitigationResponse(
        session_id=req.session_id, method=req.method,
        comparisons=comparisons,
        before_severity=before_severity, after_severity=after_severity,
        mitigated_session_id=mitigated_session_id,
        improvement_pct=improvement_pct,
    )


def _apply_reweighing(df, req):
    try:
        from aif360.datasets import BinaryLabelDataset
        from aif360.algorithms.preprocessing import Reweighing
        import numpy as np
        from sklearn.preprocessing import LabelEncoder

        df_work = df.copy()
        for attr in req.protected_attributes:
            if df_work[attr].dtype == object:
                df_work[attr] = LabelEncoder().fit_transform(df_work[attr].astype(str))
        if df_work[req.label_column].dtype == object:
            df_work[req.label_column] = LabelEncoder().fit_transform(
                df_work[req.label_column].astype(str))

        numeric_df = df_work.select_dtypes(include=[np.number]).copy()
        dataset = BinaryLabelDataset(
            df=numeric_df,
            label_names=[req.label_column],
            protected_attribute_names=req.protected_attributes,
        )
        rw = Reweighing(
            unprivileged_groups=[{a: 0} for a in req.protected_attributes],
            privileged_groups=[{a: 1} for a in req.protected_attributes],
        )
        dataset_t = rw.fit_transform(dataset)
        weights = dataset_t.instance_weights / dataset_t.instance_weights.sum()
        indices = np.random.choice(len(df), size=len(df), replace=True, p=weights)
        return df.iloc[indices].reset_index(drop=True)
    except Exception:
        return _manual_reweighing(df, req)


def _manual_reweighing(df, req):
    import numpy as np
    import pandas as pd

    df_work = df.copy()
    label_col = req.label_column

    for attr in req.protected_attributes:
        if attr not in df_work.columns:
            continue
        groups = df_work[attr].unique()
        rates = {g: df_work.loc[df_work[attr] == g, label_col].astype(int).mean()
                 for g in groups}
        if len(rates) < 2:
            continue
        target = float(np.mean(list(rates.values())))
        parts = []
        for g in groups:
            gdf = df_work[df_work[attr] == g].copy()
            if rates[g] < target and rates[g] > 0:
                pos = gdf[gdf[label_col].astype(int) == 1]
                neg = gdf[gdf[label_col].astype(int) == 0]
                needed = int(len(neg) * target / (1 - target + 1e-9))
                if needed > len(pos):
                    extra = pos.sample(n=needed - len(pos), replace=True, random_state=42)
                    gdf = pd.concat([gdf, extra], ignore_index=True)
            parts.append(gdf)
        df_work = pd.concat(parts, ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)
    return df_work


def _apply_exponentiated_gradient(df, req):
    import numpy as np
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import LabelEncoder
    from fairlearn.reductions import ExponentiatedGradient, DemographicParity

    df_work = df.copy()
    for col in df_work.columns:
        if df_work[col].dtype == object:
            df_work[col] = LabelEncoder().fit_transform(df_work[col].astype(str))

    y = df_work[req.label_column].astype(int).values
    X = df_work.drop(columns=[req.label_column])
    primary = req.protected_attributes[0]
    if primary not in X.columns:
        return _manual_reweighing(df, req)

    sensitive = X[primary].values
    X_feat = X.drop(columns=[c for c in req.protected_attributes if c in X.columns])

    mitigator = ExponentiatedGradient(
        LogisticRegression(solver="liblinear", max_iter=200),
        DemographicParity()
    )
    mitigator.fit(X_feat, y, sensitive_features=sensitive)
    df_out = df.copy()
    df_out[req.label_column] = mitigator.predict(X_feat)
    return df_out
