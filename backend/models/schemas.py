from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class BiasSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    FAIR = "FAIR"


class ColumnInfo(BaseModel):
    name: str
    dtype: str
    unique_values: int
    null_count: int
    sample_values: List[Any]


class DatasetMeta(BaseModel):
    filename: str
    rows: int
    columns: int
    detected_label_column: Optional[str]
    detected_protected_attributes: List[str]
    all_columns: List[ColumnInfo]


class UploadResponse(BaseModel):
    session_id: str
    message: str
    meta: DatasetMeta


class FairnessMetric(BaseModel):
    name: str
    value: Optional[float]
    threshold: float
    passed: Optional[bool]
    description: str


class GroupStats(BaseModel):
    group: str
    count: int
    positive_rate: float
    true_positive_rate: Optional[float] = None
    false_positive_rate: Optional[float] = None


class AttributeAnalysis(BaseModel):
    attribute: str
    groups: List[GroupStats]
    metrics: List[FairnessMetric]
    severity: BiasSeverity
    intersectional_matrix: Optional[Dict[str, Any]] = None


class AnalysisRequest(BaseModel):
    session_id: str
    label_column: str
    protected_attributes: List[str]
    positive_label: Optional[Any] = 1
    prediction_column: Optional[str] = None  # if None, use label as prediction


class AnalysisResponse(BaseModel):
    session_id: str
    dataset_summary: Dict[str, Any]
    attribute_analyses: List[AttributeAnalysis]
    overall_severity: BiasSeverity


class MitigationRequest(BaseModel):
    session_id: str
    label_column: str
    protected_attributes: List[str]
    positive_label: Optional[Any] = 1
    method: str = "reweighing"  # "reweighing" | "exponentiated_gradient"


class MetricComparison(BaseModel):
    metric_name: str
    before: float
    after: float
    improved: bool


class MitigationResponse(BaseModel):
    session_id: str
    method: str
    comparisons: List[MetricComparison]
    before_severity: BiasSeverity
    after_severity: BiasSeverity
    mitigated_session_id: str


class ReportRequest(BaseModel):
    session_id: str
    analysis: AnalysisResponse


class ReportResponse(BaseModel):
    session_id: str
    summary: str
    root_causes: List[str]
    recommendations: List[str]
    severity: BiasSeverity
    raw_json: Dict[str, Any]
