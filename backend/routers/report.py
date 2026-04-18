import logging
from fastapi import APIRouter, HTTPException
from models.schemas import ReportRequest, ReportResponse, BiasSeverity
from services.gemini_client import generate_bias_report

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=ReportResponse)
def generate_report(req: ReportRequest):
    """
    Send analysis results to Gemini 1.5 Flash and return a plain-English
    bias audit report with root causes and recommendations.
    """
    analyses = req.analysis.attribute_analyses
    if not analyses:
        raise HTTPException(
            status_code=400,
            detail="No attribute analyses found in the provided analysis object.",
        )

    severity_order = [
        BiasSeverity.CRITICAL, BiasSeverity.HIGH,
        BiasSeverity.MODERATE, BiasSeverity.LOW, BiasSeverity.FAIR,
    ]
    sorted_analyses = sorted(
        analyses, key=lambda a: severity_order.index(a.severity)
    )
    primary = sorted_analyses[0]

    def _get(name: str) -> float:
        for m in primary.metrics:
            if m.name == name:
                return m.value
        return 0.0

    group_stats_payload = [
        {"group": g.group, "count": g.count, "positive_rate": g.positive_rate}
        for g in primary.groups
    ]

    try:
        result = generate_bias_report(
            dataset_name=req.analysis.dataset_summary.get("filename", "unknown"),
            attribute=primary.attribute,
            dpd=_get("demographic_parity_difference"),
            dir_val=_get("disparate_impact_ratio"),
            eod=_get("equalized_odds_difference"),
            spd=_get("statistical_parity_difference"),
            group_stats=group_stats_payload,
        )
    except Exception as e:
        logger.exception("Report generation failed")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}")

    severity_map = {
        "CRITICAL": BiasSeverity.CRITICAL,
        "HIGH": BiasSeverity.HIGH,
        "MODERATE": BiasSeverity.MODERATE,
        "LOW": BiasSeverity.LOW,
        "FAIR": BiasSeverity.FAIR,
    }
    severity = severity_map.get(
        result.get("severity", "").upper(),
        req.analysis.overall_severity,
    )

    return ReportResponse(
        session_id=req.session_id,
        summary=result.get("summary", ""),
        root_causes=result.get("root_causes", []),
        recommendations=result.get("recommendations", []),
        severity=severity,
        raw_json=result,
    )
