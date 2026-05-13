# backend/app/utils/helpers.py
# Helper functions for data processing and cleaning

import os
import re
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Union, List, Dict, Any, Optional


def convert_to_serializable(obj: Any) -> Any:
    """
    Convert numpy/pandas types to Python native types for JSON serialization
    
    Args:
        obj: Any object that might contain numpy/pandas types
        
    Returns:
        Python native type that is JSON serializable
    """
    if isinstance(obj, (np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Series):
        return obj.tolist()
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient='records')
    elif pd.isna(obj):
        return None
    elif isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    elif isinstance(obj, (list, tuple)):
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    return obj


def safe_float_convert(value: Any, default: float = 0.0) -> float:
    """Safely convert a value to float"""
    try:
        if pd.isna(value):
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int_convert(value: Any, default: int = 0) -> int:
    """Safely convert a value to int"""
    try:
        if pd.isna(value):
            return default
        return int(float(value))
    except (ValueError, TypeError):
        return default


def safe_str_convert(value: Any, default: str = "") -> str:
    """Safely convert a value to string"""
    try:
        if pd.isna(value):
            return default
        return str(value)
    except (ValueError, TypeError):
        return default


def is_valid_email(email: str) -> bool:
    """Check if email is valid"""
    if not email or not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip().lower()))


def is_valid_phone(phone: str, min_digits: int = 10, max_digits: int = 15) -> bool:
    """Check if phone number is valid"""
    if not phone or not isinstance(phone, str):
        return False
    digits = re.sub(r'\D', '', phone)
    return min_digits <= len(digits) <= max_digits


def format_phone(phone: str) -> str:
    """Format phone number to (XXX) XXX-XXXX format"""
    if not phone:
        return phone
    
    digits = re.sub(r'\D', '', str(phone))
    
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11 and digits.startswith('1'):
        rest = digits[1:]
        return f"+1 ({rest[:3]}) {rest[3:6]}-{rest[6:]}"
    elif len(digits) == 11 and digits.startswith('0'):
        return f"{digits[:4]}-{digits[4:]}"
    else:
        return digits


def is_valid_date(date_str: str) -> bool:
    """Check if string is a valid date"""
    if not date_str:
        return False
    try:
        pd.to_datetime(date_str, errors='coerce')
        return True
    except:
        return False


def parse_date(date_str: str) -> Optional[str]:
    """Parse date to YYYY-MM-DD format"""
    if not date_str:
        return None
    try:
        date_obj = pd.to_datetime(date_str, errors='coerce')
        if pd.notna(date_obj):
            return date_obj.strftime('%Y-%m-%d')
    except:
        pass
    return None


def detect_outliers_iqr(data: pd.Series, multiplier: float = 1.5) -> Dict[str, Any]:
    """Detect outliers using IQR method"""
    non_null = data.dropna()
    if len(non_null) == 0:
        return {"count": 0, "indices": [], "values": [], "lower_bound": None, "upper_bound": None}
    
    Q1 = non_null.quantile(0.25)
    Q3 = non_null.quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - multiplier * IQR
    upper_bound = Q3 + multiplier * IQR
    
    outliers = non_null[(non_null < lower_bound) | (non_null > upper_bound)]
    
    return {
        "count": len(outliers),
        "indices": outliers.index.tolist(),
        "values": outliers.tolist(),
        "lower_bound": float(lower_bound),
        "upper_bound": float(upper_bound)
    }


def detect_outliers_zscore(data: pd.Series, threshold: float = 3.0) -> Dict[str, Any]:
    """Detect outliers using Z-score method"""
    from scipy import stats
    
    non_null = data.dropna()
    if len(non_null) < 10:
        return {"count": 0, "indices": [], "values": []}
    
    z_scores = np.abs(stats.zscore(non_null))
    outlier_mask = z_scores > threshold
    outliers = non_null[outlier_mask]
    
    return {
        "count": len(outliers),
        "indices": outliers.index.tolist(),
        "values": outliers.tolist()
    }


def clean_column_name(name: str) -> str:
    """Clean column name for SQL/CSV compatibility"""
    # Remove special characters
    cleaned = re.sub(r'[^\w\s]', '', name)
    # Replace spaces with underscores
    cleaned = cleaned.replace(' ', '_')
    # Convert to lowercase
    cleaned = cleaned.lower()
    # Remove duplicate underscores
    cleaned = re.sub(r'_+', '_', cleaned)
    # Remove leading/trailing underscores
    cleaned = cleaned.strip('_')
    return cleaned


def chunk_data(data: pd.DataFrame, chunk_size: int = 1000):
    """Yield chunks of data for processing"""
    for i in range(0, len(data), chunk_size):
        yield data.iloc[i:i + chunk_size]


def get_file_info(file_path: str) -> Dict[str, Any]:
    """Get file information"""
    if not os.path.exists(file_path):
        return {}
    
    stat = os.stat(file_path)
    return {
        "size": stat.st_size,
        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "extension": os.path.splitext(file_path)[1].lower()
    }


def ensure_directory(directory: str) -> None:
    """Ensure directory exists, create if not"""
    os.makedirs(directory, exist_ok=True)


def generate_summary_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate summary statistics for a DataFrame"""
    return {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "total_cells": len(df) * len(df.columns),
        "missing_cells": int(df.isnull().sum().sum()),
        "missing_percent": round(df.isnull().sum().sum() / (len(df) * len(df.columns)) * 100, 2),
        "duplicate_rows": int(df.duplicated().sum()),
        "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
        "numeric_columns": len(df.select_dtypes(include=[np.number]).columns),
        "categorical_columns": len(df.select_dtypes(include=['object']).columns),
        "date_columns": len(df.select_dtypes(include=['datetime64']).columns)
    }


# Export all helper functions
__all__ = [
    'convert_to_serializable',
    'safe_float_convert',
    'safe_int_convert',
    'safe_str_convert',
    'is_valid_email',
    'is_valid_phone',
    'format_phone',
    'is_valid_date',
    'parse_date',
    'detect_outliers_iqr',
    'detect_outliers_zscore',
    'clean_column_name',
    'chunk_data',
    'get_file_info',
    'ensure_directory',
    'generate_summary_stats'
]