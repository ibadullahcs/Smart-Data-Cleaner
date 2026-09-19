# backend/app/services/profiler.py
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from datetime import datetime
import os
import chardet

from app.services.type_detector import AdvancedTypeDetector, EncodingDetector


class DataProfiler:
    """Advanced Data Profiler using multi-stage type detection"""
    
    def __init__(self):
        self.type_detector = AdvancedTypeDetector()
        self.encoding_detector = EncodingDetector()
    
    def profile_dataframe(self, df: pd.DataFrame, filename: str = None) -> Dict[str, Any]:
        """Profile a DataFrame and return comprehensive analysis"""
        
        total_rows = len(df)
        total_columns = len(df.columns)
        
        columns = []
        total_missing = 0
        total_cells = total_rows * total_columns
        
        for col in df.columns:
            col_profile = self._profile_column(df[col], col, total_rows)
            columns.append(col_profile)
            total_missing += col_profile.get('null_count', 0)
        
        # Calculate quality score
        quality_score = max(0, 100 - int((total_missing / total_cells) * 100)) if total_cells > 0 else 0
        
        # FIX (CRITICAL): previously hardcoded limit=500 — meant a
        # 700, 800, or 1000-row file was ALWAYS silently cut down to
        # its first 500 rows in the table, no matter how large the
        # actual file was. Every cleaning operation itself reads and
        # writes the FULL file correctly — only the preview shown in
        # the browser table was ever truncated. Raised to a genuinely
        # safe browser-rendering limit (5,000 rows — rendering more
        # than this in a plain HTML table starts to genuinely hurt
        # browser performance regardless of framework), AND the
        # response now honestly reports whether truncation happened,
        # instead of silently pretending the shown rows are the whole
        # dataset.
        PREVIEW_ROW_LIMIT = 5000
        preview_data = self._prepare_preview(df, limit=PREVIEW_ROW_LIMIT)
        preview_truncated = total_rows > PREVIEW_ROW_LIMIT

        return {
            "total_rows": total_rows,
            "total_columns": total_columns,
            "quality_score": quality_score,
            "columns": columns,
            "preview_data": preview_data,
            "preview_truncated": preview_truncated,
            "preview_rows_shown": len(preview_data),
            "filename": filename,
            "profiled_at": datetime.now().isoformat()
        }
    
    def _profile_column(self, series: pd.Series, column_name: str, total_rows: int) -> Dict[str, Any]:
        """Profile a single column"""
        
        # Get basic stats
        dtype = str(series.dtype)
        unique_count = int(series.nunique())
        null_count = int(series.isna().sum())
        null_percent = round((null_count / total_rows) * 100, 2)
        
        # Advanced type detection
        detected_type, confidence, detection_details = self.type_detector.classify_column(series, column_name)
        
        profile = {
            "name": column_name,
            "detected_type": detected_type,
            "confidence": confidence,
            "detection_details": detection_details,
            "data_type": dtype,
            "unique_count": unique_count,
            "null_count": null_count,
            "null_percent": null_percent,
            "sample_values": self._get_sample_values(series),
            "issues": [],
            "suggestions": []
        }
        
        # Numeric analysis
        if detected_type in ['NUMERIC', 'CURRENCY', 'AGE'] or pd.api.types.is_numeric_dtype(series):
            numeric_stats = self._get_numeric_stats(series)
            profile.update(numeric_stats)
        
        # Categorical analysis
        if detected_type in ['CATEGORICAL', 'GENDER', 'CITY', 'PROVINCE']:
            categorical_stats = self._get_categorical_stats(series)
            profile.update(categorical_stats)
        
        # Detect issues
        self._detect_issues(profile, series, total_rows)
        
        return profile
    
    def _get_sample_values(self, series: pd.Series, limit: int = 5) -> List:
        """Get sample values, handling NaN and encoding"""
        non_null = series.dropna()
        if len(non_null) == 0:
            return []
        samples = non_null.head(limit).tolist()
        # Fix encoding issues in samples
        return [self.encoding_detector.fix_mojibake(str(v)) if isinstance(v, str) else v for v in samples]
    
    def _get_numeric_stats(self, series: pd.Series) -> Dict[str, Any]:
        """Calculate numeric statistics"""
        numeric_series = pd.to_numeric(series, errors='coerce')
        non_null = numeric_series.dropna()
        
        if len(non_null) == 0:
            return {}
        
        return {
            "min": float(non_null.min()),
            "max": float(non_null.max()),
            "mean": float(non_null.mean()),
            "median": float(non_null.median()),
            "std": float(non_null.std()),
            "q1": float(non_null.quantile(0.25)),
            "q3": float(non_null.quantile(0.75)),
            "iqr": float(non_null.quantile(0.75) - non_null.quantile(0.25))
        }
    
    def _get_categorical_stats(self, series: pd.Series) -> Dict[str, Any]:
        """Calculate categorical statistics"""
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return {}
        
        value_counts = non_null.value_counts()
        
        return {
            "most_frequent": str(value_counts.index[0]) if len(value_counts) > 0 else None,
            "most_frequent_count": int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
            "most_frequent_percent": round(value_counts.iloc[0] / len(non_null) * 100, 2) if len(value_counts) > 0 else 0,
            "top_values": [
                {"value": str(val), "count": int(cnt), "percent": round(cnt / len(non_null) * 100, 2)}
                for val, cnt in value_counts.head(10).items()
            ]
        }
    
    def _detect_issues(self, profile: Dict, series: pd.Series, total_rows: int):
        """Detect data quality issues"""
        issues = []
        suggestions = []
        null_count = profile.get('null_count', 0)
        null_percent = profile.get('null_percent', 0)
        
        # Missing values issue
        if null_count > 0:
            severity = "high" if null_percent > 20 else "medium" if null_percent > 5 else "low"
            issues.append({
                "type": "missing_values",
                "message": f"{null_count} missing values ({null_percent:.1f}%)",
                "count": null_count,
                "severity": severity
            })
            suggestions.append(f"Fill {null_count} missing values")
        
        detected_type = profile.get('detected_type', 'UNKNOWN')
        confidence = profile.get('confidence', 0)
        
        # Low confidence detection
        if confidence < 0.6:
            issues.append({
                "type": "low_confidence_detection",
                "message": f"Type detection confidence is low ({confidence:.0%})",
                "severity": "low"
            })
        
        # Type-specific issues
        if detected_type == 'EMAIL':
            email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            invalid_emails = int((~series.astype(str).str.match(email_pattern, na=False)).sum())
            if invalid_emails > 0:
                issues.append({
                    "type": "invalid_email",
                    "message": f"{invalid_emails} invalid email addresses",
                    "count": invalid_emails,
                    "severity": "high"
                })
                suggestions.append(f"Fix {invalid_emails} invalid email addresses")
        
        elif detected_type == 'PHONE':
            digits_only = series.astype(str).str.replace(r'\D', '', regex=True)
            invalid_phones = int((~digits_only.str.len().between(10, 15)).sum())
            if invalid_phones > 0:
                issues.append({
                    "type": "invalid_phone",
                    "message": f"{invalid_phones} invalid phone numbers",
                    "count": invalid_phones,
                    "severity": "medium"
                })
                suggestions.append(f"Format {invalid_phones} phone numbers")
        
        elif detected_type == 'AGE':
            numeric_series = pd.to_numeric(series, errors='coerce')
            invalid_ages = int(((numeric_series < 0) | (numeric_series > 120)).sum())
            if invalid_ages > 0:
                issues.append({
                    "type": "invalid_age",
                    "message": f"{invalid_ages} ages outside 0-120 range",
                    "count": invalid_ages,
                    "severity": "high"
                })
                suggestions.append(f"Fix {invalid_ages} age values")

        elif detected_type == 'GENDER':
            known_values = {
                'male', 'female', 'm', 'f', 'other', 'non-binary', 'nonbinary',
                'prefer not to say', 'unknown', 'transgender', 'nb'
            }
            normalized = series.dropna().astype(str).str.strip().str.lower()
            if len(normalized) > 0:
                invalid_gender = int((~normalized.isin(known_values)).sum())
                if invalid_gender > 0:
                    issues.append({
                        "type": "invalid_gender",
                        "message": f"{invalid_gender} values don't match common gender categories",
                        "count": invalid_gender,
                        "severity": "low"
                    })
                    suggestions.append(f"Review {invalid_gender} unusual gender values")
        
        # Outlier detection for numeric columns
        elif detected_type in ['NUMERIC', 'CURRENCY']:
            numeric_series = pd.to_numeric(series, errors='coerce')
            non_null = numeric_series.dropna()
            if len(non_null) > 10:
                Q1 = non_null.quantile(0.25)
                Q3 = non_null.quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                outlier_mask = (non_null < lower_bound) | (non_null > upper_bound)
                outlier_count = int(outlier_mask.sum())
                if outlier_count > 0:
                    issues.append({
                        "type": "outliers_detected",
                        "message": f"{outlier_count} potential outliers detected",
                        "count": outlier_count,
                        "severity": "medium"
                    })
                    suggestions.append(f"Consider removing {outlier_count} outliers")
        
        profile['issues'] = issues
        profile['suggestions'] = suggestions
    
    def _prepare_preview(self, df: pd.DataFrame, limit: int = 5000) -> List[Dict]:
        """Prepare preview data (JSON serializable)"""
        preview = []
        for _, row in df.head(limit).iterrows():
            row_dict = {}
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    row_dict[col] = None
                elif isinstance(val, (pd.Timestamp, datetime)):
                    row_dict[col] = val.isoformat()
                elif isinstance(val, (np.int64, np.int32)):
                    row_dict[col] = int(val)
                elif isinstance(val, (np.float64, np.float32)):
                    row_dict[col] = float(val)
                else:
                    row_dict[col] = self.encoding_detector.fix_mojibake(str(val))
            preview.append(row_dict)
        return preview


def profile_data(df: pd.DataFrame, filename: str = None) -> Dict[str, Any]:
    """Main profiling function"""
    profiler = DataProfiler()
    return profiler.profile_dataframe(df, filename)


def detect_file_encoding(file_path: str) -> Tuple[str, float]:
    """Detect file encoding"""
    return EncodingDetector.detect_encoding(file_path)


def read_file_with_encoding(file_path: str, file_type: str = 'csv') -> pd.DataFrame:
    """Read file with automatic encoding detection"""
    return EncodingDetector.read_file_with_encoding(file_path, file_type)