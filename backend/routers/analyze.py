import logging
from fastapi import APIRouter, HTTPException
from models.schemas import AnalysisRequest, AnalysisResponse
from services.data_processor import get_session, normalize_column_name
from services.bias_engine import run_full_analysis

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=AnalysisResponse)
def analyze_bias(req: AnalysisRequest):
    """
    Run full fairness analysis on an uploaded dataset.
    Column names are auto-normalized to lowercase_snake_case.
    """
    try:
        session = get_session(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    df = session["df"]

    # Normalize incoming column names to match the stored df
    label_col = normalize_column_name(req.label_column)
    protected_attrs = [normalize_column_name(a) for a in req.protected_attributes]

    if label_col not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Label column '{req.label_column}' not found. "
                   f"Available: {list(df.columns)}",
        )

    missing = [a for a in protected_attrs if a not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Protected attribute columns not found: {missing}. "
                   f"Available: {list(df.columns)}",
        )

    try:
        analyses, overall_severity = run_full_analysis(
            df=df,
            label_col=label_col,
            protected_attributes=protected_attrs,
            positive_label=req.positive_label,
            prediction_col=(
                normalize_column_name(req.prediction_column)
                if req.prediction_column else None
            ),
        )
    except Exception as e:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    dataset_summary = {
        "filename": session["filename"],
        "rows": len(df),
        "columns": len(df.columns),
        "label_column": label_col,
        "protected_attributes": protected_attrs,
        "positive_label": req.positive_label,
    }

    return AnalysisResponse(
        session_id=req.session_id,
        dataset_summary=dataset_summary,
        attribute_analyses=analyses,
        overall_severity=overall_severity,
    )
