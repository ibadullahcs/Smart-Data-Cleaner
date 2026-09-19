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
        before_count = int(df[column].isna().sum())
        if pd.api.types.is_numeric_dtype(df[column]):
            df[column] = df[column].fillna(df[column].mean())
            return df, before_count
        return df, 0
    
    def fill_missing_median(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        before_count = int(df[column].isna().sum())
        if pd.api.types.is_numeric_dtype(df[column]):
            df[column] = df[column].fillna(df[column].median())
            return df, before_count
        return df, 0
    
    def fill_missing_mode(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        before_count = int(df[column].isna().sum())
        mode_val = df[column].mode()
        if len(mode_val) > 0:
            df[column] = df[column].fillna(mode_val[0])
            return df, before_count
        return df, 0
    
    def fill_missing_constant(self, df: pd.DataFrame, column: str, value: Any) -> Tuple[pd.DataFrame, int]:
        before_count = int(df[column].isna().sum())
        if before_count == 0:
            return df, 0

        coerced_value = value
        if pd.api.types.is_numeric_dtype(df[column]):
            try:
                coerced_value = float(value)
                if pd.api.types.is_integer_dtype(df[column]) and coerced_value.is_integer():
                    coerced_value = int(coerced_value)
            except (TypeError, ValueError):
                raise ValueError(
                    f"Column '{column}' is numeric, but '{value}' is not a valid number."
                )

        df[column] = df[column].fillna(coerced_value)
        return df, before_count
    
    def fill_missing_forward(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        before_count = int(df[column].isna().sum())
        df[column] = df[column].ffill()
        return df, before_count
    
    def fill_missing_backward(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        before_count = int(df[column].isna().sum())
        df[column] = df[column].bfill()
        return df, before_count
    
    # ============================================
    # 2. DUPLICATES HANDLING
    # ============================================
    
    def remove_exact_duplicates(self, df: pd.DataFrame, keep: str = 'first') -> Tuple[pd.DataFrame, int]:
        before_count = len(df)
        df = df.drop_duplicates(keep=keep)
        removed = before_count - len(df)
        return df, removed
    
    def remove_key_duplicates(self, df: pd.DataFrame, keys: List[str], keep: str = 'first') -> Tuple[pd.DataFrame, int]:
        before_count = len(df)
        df = df.drop_duplicates(subset=keys, keep=keep)
        removed = before_count - len(df)
        return df, removed
    
    # ============================================
    # 3. TEXT CLEANING - NULL-SAFE
    # ============================================
    
    def trim_spaces(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        mask = df[column].notna()
        before = df.loc[mask, column].astype(str)
        after = before.str.strip()
        df.loc[mask, column] = after
        changed = int((before != after).sum())
        return df, changed
    
    def to_lowercase(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        mask = df[column].notna()
        before = df.loc[mask, column].astype(str)
        after = before.str.lower()
        df.loc[mask, column] = after
        changed = int((before != after).sum())
        return df, changed
    
    def to_uppercase(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        mask = df[column].notna()
        before = df.loc[mask, column].astype(str)
        after = before.str.upper()
        df.loc[mask, column] = after
        changed = int((before != after).sum())
        return df, changed
    
    def to_titlecase(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        mask = df[column].notna()
        before = df.loc[mask, column].astype(str)
        after = before.str.title()
        df.loc[mask, column] = after
        changed = int((before != after).sum())
        return df, changed
    
    def remove_special_characters(self, df: pd.DataFrame, column: str, keep: str = 'alphanumeric') -> Tuple[pd.DataFrame, int]:
        def clean_text(x):
            if pd.isna(x):
                return x
            text = str(x)
            if keep == 'alphanumeric':
                text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
            elif keep == 'letters':
                text = re.sub(r'[^a-zA-Z\s]', '', text)
            elif keep == 'numbers':
                text = re.sub(r'[^0-9]', '', text)
            return text
        
        before = df[column].copy()
        df[column] = df[column].apply(clean_text)
        changed = int((before.astype(str) != df[column].astype(str)).sum())
        return df, changed
    
    def fix_encoding(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        def fix_text(text):
            if pd.isna(text) or not isinstance(text, str):
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

    def standardize_categorical(self, df: pd.DataFrame, column: str, mode: str = 'auto') -> Tuple[pd.DataFrame, int, str]:
        """
        Normalizes inconsistent category labels — e.g. a gender column
        mixing 'F', 'f', 'Female', 'female' into one consistent value,
        or a yes/no column mixing '1', 'Y', 'Yes', 'No' into one.

        mode='auto' (default) inspects the actual values and picks:
        - a gender synonym map, if enough values match known gender terms
        - a yes/no synonym map, if enough values match known boolean terms
        - otherwise, generic case/whitespace normalization: values that
          are identical except for case or spacing are grouped and
          standardized to whichever original spelling appears most
          often.

        A stray value that matches NEITHER map (like a "1" sitting in a
        gender column) is deliberately left UNCHANGED rather than
        force-mapped — an automatic wrong guess would be worse than
        leaving it visible as something to review manually.
        """
        non_null_mask = df[column].notna()
        non_null = df.loc[non_null_mask, column].astype(str).str.strip()
        if len(non_null) == 0:
            return df, 0, 'none'

        normalized_lower = non_null.str.lower()

        GENDER_MAP = {
            'm': 'Male', 'male': 'Male', 'man': 'Male', 'boy': 'Male',
            'f': 'Female', 'female': 'Female', 'woman': 'Female', 'girl': 'Female',
            'other': 'Other', 'non-binary': 'Non-binary', 'nonbinary': 'Non-binary', 'nb': 'Non-binary',
            'prefer not to say': 'Prefer not to say', 'unknown': 'Unknown', 'transgender': 'Transgender',
        }
        BOOLEAN_MAP = {
            'y': 'Yes', 'yes': 'Yes', 'true': 'Yes', 't': 'Yes', '1': 'Yes', '1.0': 'Yes',
            'n': 'No', 'no': 'No', 'false': 'No', 'f': 'No', '0': 'No', '0.0': 'No',
        }

        gender_coverage = normalized_lower.isin(GENDER_MAP.keys()).mean()
        boolean_coverage = normalized_lower.isin(BOOLEAN_MAP.keys()).mean()

        if mode == 'gender' or (mode == 'auto' and gender_coverage >= 0.6):
            applied_map, detected_mode = GENDER_MAP, 'gender'
        elif mode == 'boolean' or (mode == 'auto' and boolean_coverage >= 0.8):
            applied_map, detected_mode = BOOLEAN_MAP, 'boolean'
        else:
            applied_map, detected_mode = None, 'generic'

        before = non_null.copy()

        if applied_map:
            mapped = normalized_lower.map(applied_map)
            new_values = mapped.where(mapped.notna(), before)
        else:
            group_key = before.str.strip().str.lower()
            most_common_per_group = (
                before.groupby(group_key)
                .agg(lambda vals: vals.value_counts().idxmax())
            )
            new_values = group_key.map(most_common_per_group)

        changed = int((before != new_values).sum())
        df.loc[non_null_mask, column] = new_values
        return df, changed, detected_mode
    
    # ============================================
    # 4. OUTLIER HANDLING
    # ============================================
    
    def detect_outliers_iqr(self, df: pd.DataFrame, column: str, multiplier: float = 1.5) -> Dict:
        """
        Read-only outlier detection — used by the /clean/preview-outliers
        route so the user can see counts/bounds/sample values BEFORE
        anything is deleted. Coerces to numeric first so this works
        even when the column's dtype is still 'object'.
        """
        numeric_col = pd.to_numeric(df[column], errors='coerce')
        non_null = numeric_col.dropna()
        if len(non_null) == 0:
            return {
                'count': 0, 'indices': [], 'values': [],
                'lower_bound': None, 'upper_bound': None
            }
        Q1 = non_null.quantile(0.25)
        Q3 = non_null.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - multiplier * IQR
        upper_bound = Q3 + multiplier * IQR
        outlier_mask = (numeric_col < lower_bound) | (numeric_col > upper_bound)
        outliers = df[outlier_mask.fillna(False)]
        return {
            'count': len(outliers),
            'indices': outliers.index.tolist(),
            'values': numeric_col[outlier_mask.fillna(False)].tolist(),
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound)
        }
    
    def remove_outliers_iqr(self, df: pd.DataFrame, column: str, multiplier: float = 1.5) -> Tuple[pd.DataFrame, int]:
        """
        Removes rows outside the IQR bounds for `column`. Rows where
        this column is MISSING are deliberately preserved (not treated
        as outliers).
        """
        before_count = len(df)
        numeric_col = pd.to_numeric(df[column], errors='coerce')
        non_null = numeric_col.dropna()
        if len(non_null) == 0:
            return df, 0
        Q1 = non_null.quantile(0.25)
        Q3 = non_null.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - multiplier * IQR
        upper_bound = Q3 + multiplier * IQR
        is_missing = numeric_col.isna()
        in_bounds = (numeric_col >= lower_bound) & (numeric_col <= upper_bound)
        df = df[in_bounds | is_missing]
        removed = before_count - len(df)
        return df, removed
    
    def cap_outliers_percentile(self, df: pd.DataFrame, column: str, lower_percentile: int = 1, upper_percentile: int = 99) -> Tuple[pd.DataFrame, int]:
        """Caps (clips) values outside the given percentile range, instead of removing rows."""
        numeric_col = pd.to_numeric(df[column], errors='coerce')
        non_null = numeric_col.dropna()
        if len(non_null) == 0:
            return df, 0
        
        lower_bound = non_null.quantile(lower_percentile / 100)
        upper_bound = non_null.quantile(upper_percentile / 100)
        
        before = numeric_col.copy()
        capped = numeric_col.clip(lower=lower_bound, upper=upper_bound)
        changed = int(((before != capped) & before.notna()).sum())
        
        df[column] = capped
        return df, changed
    
    # ============================================
    # 5. DATA TYPE CONVERSION
    # ============================================
    
    def to_numeric(self, df: pd.DataFrame, column: str, errors: str = 'coerce') -> Tuple[pd.DataFrame, int]:
        """
        Converts a column to numeric. Strips currency SYMBOLS
        (£ $ € ¥ ₹) and TEXT PREFIXES (Rs, INR, USD, GBP, EUR — common
        in real-world billing data) before conversion, plus thousands
        separators and whitespace.
        """
        before_valid = df[column].notna().sum()

        if pd.api.types.is_numeric_dtype(df[column]):
            converted = pd.to_numeric(df[column], errors=errors)
        else:
            cleaned = (
                df[column]
                .astype(str)
                .str.replace(r'(?i)\b(rs|inr|usd|gbp|eur)\.?\s*', '', regex=True)
                .str.replace(r'[£$€¥₹]', '', regex=True)
                .str.replace(',', '', regex=False)
                .str.strip()
            )
            cleaned = cleaned.replace({'': np.nan, 'nan': np.nan, 'None': np.nan})
            converted = pd.to_numeric(cleaned, errors=errors)

        after_valid = converted.notna().sum()
        invalid_count = int(before_valid - after_valid)

        df[column] = converted
        return df, max(invalid_count, 0)
    
    def to_datetime(self, df: pd.DataFrame, column: str, date_format: Optional[str] = None) -> Tuple[pd.DataFrame, int]:
        """
        Converts a column to datetime. Uses format='mixed' when no
        explicit format is given, so columns that genuinely mix
        multiple date formats row-to-row convert correctly instead of
        raising. Falls back gracefully for pandas < 2.0.
        """
        before_valid = df[column].notna().sum()

        try:
            if date_format:
                converted = pd.to_datetime(df[column], format=date_format, errors='coerce')
            else:
                converted = pd.to_datetime(df[column], format='mixed', errors='coerce', dayfirst=False)
        except TypeError:
            converted = pd.to_datetime(df[column], errors='coerce')

        after_valid = converted.notna().sum()
        invalid_count = int(before_valid - after_valid)

        df[column] = converted
        return df, max(invalid_count, 0)
    
    # ============================================
    # 6. DATE OPERATIONS
    # ============================================
    
    def extract_year(self, df: pd.DataFrame, column: str, new_column: Optional[str] = None) -> pd.DataFrame:
        new_col_name = new_column or f"{column}_year"
        date_series = pd.to_datetime(df[column], format='mixed', errors='coerce') \
            if not pd.api.types.is_datetime64_any_dtype(df[column]) else df[column]
        df[new_col_name] = date_series.dt.year
        return df
    
    def extract_month(self, df: pd.DataFrame, column: str, new_column: Optional[str] = None) -> pd.DataFrame:
        new_col_name = new_column or f"{column}_month"
        date_series = pd.to_datetime(df[column], format='mixed', errors='coerce') \
            if not pd.api.types.is_datetime64_any_dtype(df[column]) else df[column]
        df[new_col_name] = date_series.dt.month
        return df
    
    def extract_day(self, df: pd.DataFrame, column: str, new_column: Optional[str] = None) -> pd.DataFrame:
        new_col_name = new_column or f"{column}_day"
        date_series = pd.to_datetime(df[column], format='mixed', errors='coerce') \
            if not pd.api.types.is_datetime64_any_dtype(df[column]) else df[column]
        df[new_col_name] = date_series.dt.day
        return df
    
    def extract_day_of_week(self, df: pd.DataFrame, column: str, new_column: Optional[str] = None) -> pd.DataFrame:
        new_col_name = new_column or f"{column}_dayofweek"
        date_series = pd.to_datetime(df[column], format='mixed', errors='coerce') \
            if not pd.api.types.is_datetime64_any_dtype(df[column]) else df[column]
        df[new_col_name] = date_series.dt.day_name()
        return df
    
    def calculate_age(self, df: pd.DataFrame, birth_column: str, reference_date: Optional[str] = None) -> pd.DataFrame:
        birth_series = pd.to_datetime(df[birth_column], format='mixed', errors='coerce') \
            if not pd.api.types.is_datetime64_any_dtype(df[birth_column]) else df[birth_column]
        
        ref_date = pd.to_datetime(reference_date) if reference_date else pd.Timestamp.now()
        
        age = ((ref_date - birth_series).dt.days / 365.25).astype('float')
        df[f"{birth_column}_age"] = age.round(0)
        return df
    
    # ============================================
    # 7. STRING OPERATIONS
    # ============================================
    
    def split_column(self, df: pd.DataFrame, column: str, delimiter: str = ' ', into: int = 2, new_names: Optional[List[str]] = None) -> pd.DataFrame:
        split_data = df[column].astype(str).str.split(delimiter, n=into - 1, expand=True)
        
        for i in range(min(into, split_data.shape[1])):
            col_name = new_names[i] if new_names and i < len(new_names) else f"{column}_part{i+1}"
            df[col_name] = split_data[i]
        
        return df
    
    def merge_columns(self, df: pd.DataFrame, columns: List[str], new_column: str, delimiter: str = ' ', remove_original: bool = True) -> pd.DataFrame:
        df[new_column] = df[columns].astype(str).agg(delimiter.join, axis=1)
        
        if remove_original:
            df = df.drop(columns=columns)
        
        return df
    
    def find_replace(self, df: pd.DataFrame, column: str, find: str, replace: str, regex: bool = False) -> Tuple[pd.DataFrame, int]:
        mask = df[column].notna()
        before = df.loc[mask, column].astype(str)
        
        if regex:
            after = before.str.replace(find, replace, regex=True)
        else:
            after = before.str.replace(find, replace, regex=False)
        
        df.loc[mask, column] = after
        changed = int((before != after).sum())
        return df, changed
    
    # ============================================
    # 8. EMAIL & PHONE VALIDATION/FORMATTING
    # ============================================
    
    def validate_emails(self, df: pd.DataFrame, column: str) -> pd.DataFrame:
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        df[f'{column}_valid'] = df[column].astype(str).str.match(email_pattern, na=False)
        return df
    
    def format_phones(self, df: pd.DataFrame, column: str) -> Tuple[pd.DataFrame, int]:
        def format_phone(phone):
            if pd.isna(phone):
                return phone
            digits = re.sub(r'\D', '', str(phone))
            if len(digits) == 10:
                return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
            elif len(digits) == 11 and digits[0] == '1':
                return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
            return phone
        
        before = df[column].copy()
        df[column] = df[column].apply(format_phone)
        changed = int((before.astype(str) != df[column].astype(str)).sum())
        return df, changed
    
    # ============================================
    # 9. SMART CLEAN (Combined Operations)
    # ============================================
    
    def smart_clean(
        self,
        df: pd.DataFrame,
        profile: str = 'balanced',
        auto_remove_duplicates: bool = True,
        trim_spaces: bool = True,
        missing_strategy: str = 'median',
        enable_drop_threshold: bool = False,
        drop_threshold: int = 50,
    ) -> Tuple[pd.DataFrame, Dict]:
        """
        Apply recommended cleaning operations automatically. Preserves
        ID columns, applies operations in correct order. Every
        parameter genuinely changes behavior, driven by the app's
        Cleaning settings.
        """
        changes = {'operations': [], 'total_changes': 0}
        
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
        print(f"🧹 Smart Clean profile={profile}, dedup={auto_remove_duplicates}, "
              f"trim={trim_spaces}, missing_strategy={missing_strategy}, "
              f"drop_threshold={'on(' + str(drop_threshold) + '%)' if enable_drop_threshold else 'off'}")

        # Step 0: drop columns exceeding the missing-value threshold (opt-in)
        if enable_drop_threshold:
            total_rows = len(df)
            if total_rows > 0:
                cols_to_drop = []
                for col in df.columns:
                    if col in id_columns:
                        continue
                    missing_pct = (df[col].isna().sum() / total_rows) * 100
                    if missing_pct > drop_threshold:
                        cols_to_drop.append((col, int(df[col].isna().sum())))
                for col, missing_count in cols_to_drop:
                    df = df.drop(columns=[col])
                    changes['operations'].append({
                        'column': col,
                        'operation': 'drop_high_missing_column',
                        'rows': missing_count
                    })
                    changes['total_changes'] += missing_count
                    if col in date_columns:
                        date_columns.remove(col)

        # Step 1: Remove duplicate rows (opt-out via auto_remove_duplicates)
        if auto_remove_duplicates:
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
        
        # Step 2: Trim spaces in string columns (opt-out via trim_spaces)
        if trim_spaces:
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

        if profile == 'fast':
            return df, changes

        # Step 3: Fix encoding issues in text columns (balanced + deep)
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
        
        # Step 4: Fill missing values in numeric columns (balanced + deep)
        fill_fn = {
            'mean': self.fill_missing_mean,
            'median': self.fill_missing_median,
            'mode': self.fill_missing_mode,
        }.get(missing_strategy, self.fill_missing_median)

        for col in df.select_dtypes(include=[np.number]).columns:
            if col in id_columns:
                continue
            if df[col].isna().sum() > 0:
                missing_count = int(df[col].isna().sum())
                df, _ = fill_fn(df, col)
                changes['operations'].append({
                    'column': col,
                    'operation': f'fill_missing_{missing_strategy}',
                    'rows': missing_count
                })
                changes['total_changes'] += missing_count
        
        # Step 5: Convert date columns and extract features (balanced + deep)
        for col in date_columns:
            if col not in id_columns and col in df.columns:
                df, invalid = self.to_datetime(df, col)
                if invalid > 0:
                    changes['operations'].append({
                        'column': col,
                        'operation': 'convert_to_datetime',
                        'rows': invalid
                    })
                    changes['total_changes'] += invalid
                
                if not df[col].isna().all():
                    df = self.extract_year(df, col, f"{col}_year")
        
        # Step 6: Standardize case for text columns (balanced + deep)
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

        if profile == 'deep':
            for col in df.select_dtypes(include=['object']).columns:
                if col in id_columns:
                    continue
                if df[col].isna().sum() > 0:
                    missing_count = int(df[col].isna().sum())
                    df, _ = self.fill_missing_mode(df, col)
                    changes['operations'].append({
                        'column': col,
                        'operation': 'fill_missing_mode',
                        'rows': missing_count
                    })
                    changes['total_changes'] += missing_count
        
        return df, changes


# Singleton instance used by all routes
cleaning_service = CleaningService()