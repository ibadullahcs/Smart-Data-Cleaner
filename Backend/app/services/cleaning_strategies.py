# backend/app/services/cleaning_strategies.py
# Per-type cleaning strategies

import pandas as pd
import numpy as np
import re
from typing import Dict, Any, Tuple, List
from datetime import datetime

from .type_detector import ColumnType


class CleaningStrategies:
    """
    Cleaning strategies for each column type
    Each strategy knows how to clean its type
    """
    
    @staticmethod
    def clean_id_column(df: pd.DataFrame, col: str) -> Tuple[pd.DataFrame, Dict]:
        """Clean ID column - preserve or generate IDs"""
        changes = {'rows_affected': 0, 'operation': 'clean_id'}
        
        # Count nulls
        null_count = df[col].isna().sum()
        
        if null_count > 0:
            # Generate new IDs for missing ones
            max_id = 0
            for val in df[col].dropna():
                try:
                    # Try to extract numeric ID
                    if isinstance(val, (int, float)):
                        max_id = max(max_id, int(val))
                    elif isinstance(val, str):
                        nums = re.findall(r'\d+', val)
                        if nums:
                            max_id = max(max_id, int(nums[-1]))
                except:
                    pass
            
            # Fill missing IDs
            for idx in df[df[col].isna()].index:
                max_id += 1
                df.at[idx, col] = max_id
            
            changes['rows_affected'] = null_count
        
        return df, changes
    
    @staticmethod
    def clean_date_column(df: pd.DataFrame, col: str) -> Tuple[pd.DataFrame, Dict]:
        """Clean date column - standardize format"""
        changes = {'rows_affected': 0, 'operation': 'clean_date'}
        
        before_null = df[col].isna().sum()
        
        # Convert to datetime
        df[col] = pd.to_datetime(df[col], errors='coerce')
        
        # Format consistently
        df[col] = df[col].dt.strftime('%Y-%m-%d')
        
        after_null = df[col].isna().sum()
        changes['rows_affected'] = after_null - before_null
        
        return df, changes
    
    @staticmethod
    def clean_numeric_column(df: pd.DataFrame, col: str, fill_strategy: str = 'median') -> Tuple[pd.DataFrame, Dict]:
        """Clean numeric column - fill missing, handle outliers"""
        changes = {'rows_affected': 0, 'operation': 'clean_numeric'}
        
        # Convert to numeric
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Fill missing values
        null_count = df[col].isna().sum()
        if null_count > 0:
            if fill_strategy == 'mean':
                fill_value = df[col].mean()
            elif fill_strategy == 'median':
                fill_value = df[col].median()
            else:
                fill_value = df[col].median()
            
            df[col].fillna(fill_value, inplace=True)
            changes['rows_affected'] = null_count
        
        return df, changes
    
    @staticmethod
    def clean_text_column(df: pd.DataFrame, col: str) -> Tuple[pd.DataFrame, Dict]:
        """Clean text column - trim, fix encoding, normalize"""
        changes = {'rows_affected': 0, 'operation': 'clean_text'}
        
        # Convert to string
        df[col] = df[col].astype(str)
        
        # Track changes
        before = df[col].copy()
        
        # 1. Trim spaces
        df[col] = df[col].str.strip()
        
        # 2. Replace NaN strings
        df[col] = df[col].replace('nan', '')
        df[col] = df[col].replace('None', '')
        df[col] = df[col].replace('null', '')
        
        # 3. Fix common encoding issues
        encoding_fixes = [
            ('Ã©', 'é'), ('Ã¨', 'è'), ('Ãª', 'ê'), ('Ã«', 'ë'),
            ('Ã¤', 'ä'), ('Ã¶', 'ö'), ('Ã¼', 'ü'), ('Ã§', 'ç'),
            ('â€œ', '"'), ('â€�', '"'), ('â€™', "'"), ('â€“', '-'),
        ]
        
        for wrong, correct in encoding_fixes:
            df[col] = df[col].str.replace(wrong, correct, regex=False)
        
        # 4. Remove multiple spaces
        df[col] = df[col].str.replace(r'\s+', ' ', regex=True)
        
        # Count changes
        changes['rows_affected'] = int((before != df[col]).sum())
        
        return df, changes
    
    @staticmethod
    def clean_email_column(df: pd.DataFrame, col: str) -> Tuple[pd.DataFrame, Dict]:
        """Clean email column - validate and fix"""
        changes = {'rows_affected': 0, 'operation': 'clean_email'}
        
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        # First clean as text
        df, _ = CleaningStrategies.clean_text_column(df, col)
        
        # Identify invalid emails
        invalid_mask = ~df[col].str.match(email_pattern, na=False)
        invalid_count = invalid_mask.sum()
        
        # Mark invalid (but don't delete)
        df[f'{col}_valid'] = ~invalid_mask
        
        changes['rows_affected'] = invalid_count
        
        return df, changes
    
    @staticmethod
    def clean_phone_column(df: pd.DataFrame, col: str) -> Tuple[pd.DataFrame, Dict]:
        """Clean phone column - standardize format"""
        changes = {'rows_affected': 0, 'operation': 'clean_phone'}
        
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
        
        before = df[col].copy()
        df[col] = df[col].apply(format_phone)
        changes['rows_affected'] = int((before != df[col]).sum())
        
        return df, changes
    
    @staticmethod
    def clean_categorical_column(df: pd.DataFrame, col: str) -> Tuple[pd.DataFrame, Dict]:
        """Clean categorical column - standardize values"""
        changes = {'rows_affected': 0, 'operation': 'clean_categorical'}
        
        # Convert to string and trim
        df[col] = df[col].astype(str).str.strip().str.lower()
        
        # Fill missing with mode
        null_count = df[col].isna().sum()
        if null_count > 0:
            mode_val = df[col].mode()
            if len(mode_val) > 0:
                df[col].fillna(mode_val[0], inplace=True)
            else:
                df[col].fillna('unknown', inplace=True)
            changes['rows_affected'] = null_count
        
        return df, changes


class CleaningStrategyFactory:
    """Factory to get appropriate cleaning strategy for column type"""
    
    _strategies = {
        ColumnType.ID: CleaningStrategies.clean_id_column,
        ColumnType.DATE: CleaningStrategies.clean_date_column,
        ColumnType.DATETIME: CleaningStrategies.clean_date_column,
        ColumnType.NUMERIC: CleaningStrategies.clean_numeric_column,
        ColumnType.CURRENCY: CleaningStrategies.clean_numeric_column,
        ColumnType.EMAIL: CleaningStrategies.clean_email_column,
        ColumnType.PHONE: CleaningStrategies.clean_phone_column,
        ColumnType.CATEGORICAL: CleaningStrategies.clean_categorical_column,
        ColumnType.TEXT: CleaningStrategies.clean_text_column,
        ColumnType.BOOLEAN: CleaningStrategies.clean_text_column,
    }
    
    @classmethod
    def get_strategy(cls, column_type: str):
        """Get cleaning function for column type"""
        return cls._strategies.get(column_type, CleaningStrategies.clean_text_column)