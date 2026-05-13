# backend/app/models/schemas.py

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ColumnType(str, Enum):
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    DATE = "DATE"
    DATETIME = "DATETIME"
    CURRENCY = "CURRENCY"
    NUMERIC = "NUMERIC"
    AGE = "AGE"
    NAME = "NAME"
    ADDRESS = "ADDRESS"
    CITY = "CITY"
    PROVINCE = "PROVINCE"
    GENDER = "GENDER"
    CATEGORICAL = "CATEGORICAL"
    ID = "ID"
    URL = "URL"
    TEXT = "TEXT"
    BOOLEAN = "BOOLEAN"
    UNKNOWN = "UNKNOWN"

class ColumnIssue(BaseModel):
    type: str
    message: str
    count: int
    severity: str  # high, medium, low

class ColumnProfile(BaseModel):
    name: str
    detected_type: ColumnType
    confidence: float
    data_type: str  # int64, float64, object, datetime64
    unique_count: int
    null_count: int
    null_percent: float
    min: Optional[Any] = None
    max: Optional[Any] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    sample_values: List[Any] = []
    issues: List[ColumnIssue] = []
    suggestions: List[str] = []

class ProfileResponse(BaseModel):
    job_id: str
    filename: str
    total_rows: int
    total_columns: int
    quality_score: int
    columns: List[ColumnProfile]
    preview_data: List[Dict] = []

class CleanRequest(BaseModel):
    strategies: Dict[str, Dict[str, Any]] = {}

class CleanResponse(BaseModel):
    job_id: str
    status: str
    changes_count: int
    rows_affected: int
    columns_affected: List[str]
    health_score_before: int
    health_score_after: int

class ExportRequest(BaseModel):
    format: str  # csv, excel, pdf
    table_name: Optional[str] = "cleaned_data"

class ChartRequest(BaseModel):
    chart_type: str  # histogram, boxplot, correlation, missing_heatmap
    columns: Optional[List[str]] = None

class AnalysisResponse(BaseModel):
    job_id: str
    summary: Dict[str, Any]
    correlations: Dict[str, Any]
    outliers: Dict[str, Any]
    distributions: Dict[str, Any]