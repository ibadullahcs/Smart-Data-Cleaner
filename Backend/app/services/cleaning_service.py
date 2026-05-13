# backend/app/services/cleaning_service.py
# Complete Cleaning Operations Service - Production Ready

import pandas as pd
import numpy as np
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple, Union


class CleaningService:
    """Complete data cleaning service with all operations"""
    
    def __init__(self):
        self.operation_log = []
    
    # ============================================
    # 1. MISSING VALUES HANDLING
    # ============================================
    
    def fill_missing_mean(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Fill missing values with column mean"""
        before_count = int(df[column].isna().sum())
        if pd.api.types.is_numeric_dtype(df[column]):
            df[column].fillna(df[column].mean(), inplace=True)
        return df, before_count
    
    def fill_missing_median(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Fill missing values with column median"""
        before_count = int(df[column].isna().sum())
        if pd.api.types.is_numeric_dtype(df[column]):
            df[column].fillna(df[column].median(), inplace=True)
        return df, before_count
    
    def fill_missing_mode(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Fill missing values with column mode (most frequent)"""
        before_count = int(df[column].isna().sum())
        mode_val = df[column].mode()
        if len(mode_val) > 0:
            df[column].fillna(mode_val[0], inplace=True)
        return df, before_count
    
    def fill_missing_constant(self, df: pd.DataFrame, column: str, value: Any) -> Tuple[pd.DataFrame, int]:
        """Fill missing values with custom constant value"""
        before_count = int(df[column].isna().sum())
        df[column].fillna(value, inplace=True)
        return df, before_count
    
    def fill_missing_forward(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Forward fill missing values"""
        before_count = int(df[column].isna().sum())
        df[column].fillna(method='ffill', inplace=True)
        return df, before_count
    
    def fill_missing_backward(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Backward fill missing values"""
        before_count = int(df[column].isna().sum())
        df[column].fillna(method='bfill', inplace=True)
        return df, before_count
    
    # ============================================
    # 2. DUPLICATES HANDLING
    # ============================================
    
    def remove_exact_duplicates(self, df: pd.DataFrame, keep: str = 'first') -> Tuple[pd.DataFrame, int]:
        """Remove exact duplicate rows"""
        before_count = len(df)
        df.drop_duplicates(keep=keep, inplace=True)
        removed = before_count - len(df)
        return df, removed
    
    def remove_key_duplicates(self, df: pd.DataFrame, keys: List[str], keep: str = 'first') -> Tuple[pd.DataFrame, int]:
        """Remove duplicates based on specific columns (keys)"""
        before_count = len(df)
        df.drop_duplicates(subset=keys, keep=keep, inplace=True)
        removed = before_count - len(df)
        return df, removed
    
    # ============================================
    # 3. TEXT CLEANING
    # ============================================
    
    def trim_spaces(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Remove leading and trailing whitespace"""
        before = df[column].copy()
        df[column] = df[column].astype(str).str.strip()
        changed = int((before.astype(str).str.strip() != df[column].astype(str)).sum())
        return df, changed
    
    def to_lowercase(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Convert text to lowercase"""
        before = df[column].copy()
        df[column] = df[column].astype(str).str.lower()
        changed = int((before.astype(str).str.lower() != df[column].astype(str)).sum())
        return df, changed
    
    def to_uppercase(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Convert text to uppercase"""
        before = df[column].copy()
        df[column] = df[column].astype(str).str.upper()
        changed = int((before.astype(str).str.upper() != df[column].astype(str)).sum())
        return df, changed
    
    def to_titlecase(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Convert text to title case (First Letter Capitalized)"""
        before = df[column].copy()
        df[column] = df[column].astype(str).str.title()
        changed = int((before.astype(str).str.title() != df[column].astype(str)).sum())
        return df, changed
    
    def remove_special_characters(self, df: pd.DataFrame, column: str, keep: str = 'alphanumeric') -> Tuple[pd.DataFrame, int]:
        """Remove special characters, keep only alphanumeric + spaces"""
        before = df[column].copy()
        if keep == 'alphanumeric':
            df[column] = df[column].astype(str).apply(lambda x: re.sub(r'[^a-zA-Z0-9\s]', '', x))
        elif keep == 'letters':
            df[column] = df[column].astype(str).apply(lambda x: re.sub(r'[^a-zA-Z\s]', '', x))
        elif keep == 'numbers':
            df[column] = df[column].astype(str).apply(lambda x: re.sub(r'[^0-9]', '', x))
        changed = int((before.astype(str) != df[column].astype(str)).sum())
        return df, changed
    
    def fix_encoding(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Fix common encoding issues (mojibake)"""
        def fix_text(text):
            if not isinstance(text, str):
                return text
            fixes = [
                ('Ã©', 'é'), ('Ã¨', 'è'), ('Ãª', 'ê'), ('Ã«', 'ë'),
                ('Ã¤', 'ä'), ('Ã¶', 'ö'), ('Ã¼', 'ü'), ('Ã§', 'ç'),
                ('â€œ', '"'), ('â€�', '"'), ('â€™', "'"), ('â€“', '-'),
                ('\\xa0', ' '), ('\\n', ' '), ('\\r', ' ')
            ]
            for wrong, correct in fixes:
                text = text.replace(wrong, correct)
            return text
        
        before = df[column].copy()
        df[column] = df[column].apply(lambda x: fix_text(x) if isinstance(x, str) else x)
        changed = int((before.astype(str) != df[column].astype(str)).sum())
        return df, changed
    
    # ============================================
    # 4. OUTLIER HANDLING
    # ============================================
    
    def detect_outliers_iqr(self, df: pd.DataFrame, column: str, multiplier: float = 1.5) -> Dict:
        """Detect outliers using IQR method"""
        Q1 = df[column].quantile(0.25)
        Q3 = df[column].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - multiplier * IQR
        upper_bound = Q3 + multiplier * IQR
        outliers = df[(df[column] < lower_bound) | (df[column] > upper_bound)]
        return {
            'count': len(outliers),
            'indices': outliers.index.tolist(),
            'values': outliers[column].tolist(),
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound)
        }
    
    def remove_outliers_iqr(self, df: pd.DataFrame, column: str, multiplier: float = 1.5) -> Tuple[pd.DataFrame, int]:
        """Remove outliers using IQR method"""
        before_count = len(df)
        Q1 = df[column].quantile(0.25)
        Q3 = df[column].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - multiplier * IQR
        upper_bound = Q3 + multiplier * IQR
        df = df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]
        removed = before_count - len(df)
        return df, removed
    
    def cap_outliers_percentile(self, df: pd.DataFrame, column: str, lower_percentile: int = 1, upper_percentile: int = 99) -> Tuple[pd.DataFrame, int]:
        """Cap outliers at specific percentiles"""
        lower = df[column].quantile(lower_percentile / 100)
        upper = df[column].quantile(upper_percentile / 100)
        df[column] = df[column].clip(lower=lower, upper=upper)
        return df, 0
    
    # ============================================
    # 5. DATA TYPE CONVERSION
    # ============================================
    
    def to_numeric(self, df: pd.DataFrame, column: str, errors: str = 'coerce') -> Tuple[pd.DataFrame, int]:
        """Convert column to numeric type"""
        before_non_null = df[column].notna().sum()
        df[column] = pd.to_numeric(df[column], errors=errors)
        after_non_null = df[column].notna().sum()
        invalid = before_non_null - after_non_null
        return df, max(0, invalid)
    
    def to_datetime(self, df: pd.DataFrame, column: str, format: str = None) -> Tuple[pd.DataFrame, int]:
        """Convert column to datetime type"""
        before_non_null = df[column].notna().sum()
        if format:
            df[column] = pd.to_datetime(df[column], format=format, errors='coerce')
        else:
            df[column] = pd.to_datetime(df[column], errors='coerce')
        after_non_null = df[column].notna().sum()
        invalid = before_non_null - after_non_null
        return df, max(0, invalid)
    
    # ============================================
    # 6. EMAIL & PHONE VALIDATION
    # ============================================
    
    def validate_emails(self, df: pd.DataFrame, column: str) -> pd.DataFrame:
        """Validate email addresses and flag invalid ones"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        df[f'{column}_valid'] = df[column].astype(str).str.match(email_pattern, na=False)
        return df
    
    def format_phones(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        """Standardize phone numbers to consistent format"""
        def format_phone(phone):
            if pd.isna(phone):
                return phone
            digits = re.sub(r'\D', '', str(phone))
            if len(digits) == 10:
                return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
            elif len(digits) == 11 and digits.startswith('1'):
                rest = digits[1:]
                return f"+1 ({rest[:3]}) {rest[3:6]}-{rest[6:]}"
            return phone
        
        before = df[column].copy()
        df[column] = df[column].apply(format_phone)
        changed = int((before.astype(str) != df[column].astype(str)).sum())
        return df, changed
    
    # ============================================
    # 7. DATE OPERATIONS
    # ============================================
    
    def extract_year(self, df: pd.DataFrame, column: str, new_column: str = None) -> pd.DataFrame:
        """Extract year from date column"""
        new_col = new_column or f"{column}_year"
        df[new_col] = pd.to_datetime(df[column], errors='coerce').dt.year
        return df
    
    def extract_month(self, df: pd.DataFrame, column: str, new_column: str = None) -> pd.DataFrame:
        """Extract month from date column"""
        new_col = new_column or f"{column}_month"
        df[new_col] = pd.to_datetime(df[column], errors='coerce').dt.month
        return df
    
    def extract_day(self, df: pd.DataFrame, column: str, new_column: str = None) -> pd.DataFrame:
        """Extract day from date column"""
        new_col = new_column or f"{column}_day"
        df[new_col] = pd.to_datetime(df[column], errors='coerce').dt.day
        return df
    
    def extract_day_of_week(self, df: pd.DataFrame, column: str, new_column: str = None) -> pd.DataFrame:
        """Extract day of week from date column"""
        new_col = new_column or f"{column}_weekday"
        df[new_col] = pd.to_datetime(df[column], errors='coerce').dt.dayofweek
        return df
    
    def calculate_age(self, df: pd.DataFrame, birth_column: str, reference_date: str = None) -> pd.DataFrame:
        """Calculate age from birth date"""
        if reference_date is None:
            reference_date = datetime.now().strftime('%Y-%m-%d')
        birth = pd.to_datetime(df[birth_column], errors='coerce')
        ref = pd.to_datetime(reference_date)
        df['age'] = (ref - birth).dt.days // 365
        df['age'] = df['age'].clip(lower=0, upper=120)
        return df
    
    # ============================================
    # 8. STRING OPERATIONS
    # ============================================
    
    def split_column(self, df: pd.DataFrame, column: str, delimiter: str = ' ', into: int = 2, new_names: List[str] = None) -> pd.DataFrame:
        """Split a column into multiple columns"""
        split_data = df[column].astype(str).str.split(delimiter, expand=True, n=into-1)
        if new_names:
            for i, name in enumerate(new_names[:into]):
                df[name] = split_data[i]
        else:
            for i in range(into):
                df[f"{column}_{i+1}"] = split_data[i]
        return df
    
    def merge_columns(self, df: pd.DataFrame, columns: List[str], new_column: str, delimiter: str = ' ', remove_original: bool = True) -> pd.DataFrame:
        """Merge multiple columns into one"""
        df[new_column] = df[columns].astype(str).agg(delimiter.join, axis=1)
        if remove_original:
            df.drop(columns=columns, inplace=True)
        return df
    
    def find_replace(self, df: pd.DataFrame, column: str, find: str, replace: str, regex: bool = False) -> Tuple[pd.DataFrame, int]:
        """Find and replace text in column"""
        before = df[column].copy()
        if regex:
            df[column] = df[column].astype(str).str.replace(find, replace, regex=True)
        else:
            df[column] = df[column].astype(str).str.replace(find, replace)
        changed = int((before.astype(str) != df[column].astype(str)).sum())
        return df, changed
    
    # ============================================
    # 9. SMART CLEAN (Combined Operations)
    # ============================================
    
    def smart_clean(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """
        Apply all recommended cleaning operations automatically
        Preserves ID columns, applies operations in correct order
        """
        changes = {'operations': [], 'total_changes': 0}
        
        # Step 1: Identify columns to preserve (IDs, dates)
        id_columns = []
        date_columns = []
        
        for col in df.columns:
            col_lower = col.lower()
            if 'id' in col_lower or col_lower.endswith('_id') or col_lower == 'patient_id':
                id_columns.append(col)
            if 'date' in col_lower or 'appointment' in col_lower or 'timestamp' in col_lower or 'birth' in col_lower:
                date_columns.append(col)
        
        print(f"🔍 Detected ID columns to preserve: {id_columns}")
        print(f"🔍 Detected Date columns: {date_columns}")
        
        # Step 2: Remove duplicate rows (keep first)
        before_rows = len(df)
        df = df.drop_duplicates(keep='first')
        removed = before_rows - len(df)
        if removed > 0:
            changes['operations'].append({
                'column': None,
                'operation': 'remove_duplicates',
                'rows': removed
            })
            changes['total_changes'] += removed
        
        # Step 3: Fix encoding issues in text columns (skip ID columns)
        for col in df.select_dtypes(include=['object']).columns:
            if col in id_columns:
                continue
            df, changed = self.fix_encoding(df, col)
            if changed > 0:
                changes['operations'].append({
                    'column': col,
                    'operation': 'fix_encoding',
                    'rows': changed
                })
                changes['total_changes'] += changed
        
        # Step 4: Trim spaces in string columns (skip ID columns)
        for col in df.select_dtypes(include=['object']).columns:
            if col in id_columns:
                continue
            df, changed = self.trim_spaces(df, col)
            if changed > 0:
                changes['operations'].append({
                    'column': col,
                    'operation': 'trim_spaces',
                    'rows': changed
                })
                changes['total_changes'] += changed
        
        # Step 5: Fill missing values in numeric columns with median (skip ID columns)
        for col in df.select_dtypes(include=[np.number]).columns:
            if col in id_columns:
                continue
            if df[col].isna().sum() > 0:
                missing_count = int(df[col].isna().sum())
                df, _ = self.fill_missing_median(df, col)
                changes['operations'].append({
                    'column': col,
                    'operation': 'fill_missing_median',
                    'rows': missing_count
                })
                changes['total_changes'] += missing_count
        
        # Step 6: Convert date columns and extract features
        for col in date_columns:
            if col not in id_columns:
                before_null = df[col].isna().sum()
                df, invalid = self.to_datetime(df, col)
                if invalid > 0:
                    changes['operations'].append({
                        'column': col,
                        'operation': 'convert_to_datetime',
                        'rows': invalid
                    })
                    changes['total_changes'] += invalid
                
                # Extract year as new feature
                if not df[col].isna().all():
                    df = self.extract_year(df, col, f"{col}_year")
        
        # Step 7: Standardize case for text columns (skip IDs and dates)
        for col in df.select_dtypes(include=['object']).columns:
            if col in id_columns or col in date_columns:
                continue
            df, changed = self.to_lowercase(df, col)
            if changed > 0:
                changes['operations'].append({
                    'column': col,
                    'operation': 'to_lowercase',
                    'rows': changed
                })
                changes['total_changes'] += changed
        
        return df, changes


# Singleton instance
cleaning_service = CleaningService()