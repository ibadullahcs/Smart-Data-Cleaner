# backend/app/services/type_detector.py
# FINAL: Priority-based type detection - All issues fixed

import pandas as pd
import numpy as np
import re
from dateutil import parser
from dateutil.parser import ParserError
from typing import Tuple, Dict, Any, List, Optional
import chardet


class AdvancedTypeDetector:
    """
    FINAL: Priority-based column type detection
    - First confident match in priority order wins
    - Uses column_name parameter consistently (no series.name)
    - Name hints only apply if content didn't strongly reject
    """
    
    def __init__(self, confidence_threshold: float = 0.6):
        self.confidence_threshold = confidence_threshold
    
    def detect_encoding(self, file_path: str) -> Tuple[str, float]:
        """Detect file encoding using chardet"""
        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read(100000)
                result = chardet.detect(raw_data)
                return result['encoding'], result['confidence']
        except Exception as e:
            print(f"Encoding detection failed: {e}")
            return 'utf-8', 0.5
    
    def _is_id_column_name(self, column_name: str) -> Tuple[bool, float]:
        """
        Check if column name suggests an ID field.
        Returns (is_id, confidence)
        Differentiates between strong ID indicators and weaker code indicators.
        """
        name_lower = column_name.lower()
        
        # Strong ID indicators (exact suffix/whole word)
        strong_id_suffixes = ['_id', '-id', '.id']
        for suffix in strong_id_suffixes:
            if name_lower.endswith(suffix):
                return True, 0.9
        
        strong_id_words = ['identifier', 'primary_key', 'foreign_key']
        for word in strong_id_words:
            if word in name_lower:
                return True, 0.85
        
        # Weak code/identifier indicators (boost confidence but don't auto-trigger)
        weak_code_words = ['code', 'number']
        name_parts = re.split(r'[_\s-]', name_lower)
        for part in name_parts:
            if part in weak_code_words:
                return False, 0.4  # Not auto-trigger, just boost
        
        # Exact whole word 'id'
        if 'id' in name_parts:
            return True, 0.8
        
        return False, 0.0
    
    def detect_id(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        """ID detection - highest priority"""
        total_count = len(series)
        if total_count == 0:
            return False, 0.0
        
        # Name-based detection
        is_id_name, name_confidence = self._is_id_column_name(column_name)
        
        # Need at least 10 rows for meaningful uniqueness check
        if total_count < 10:
            return is_id_name, name_confidence * 0.7
        
        # Uniqueness ratio
        unique_ratio = series.nunique() / total_count
        is_highly_unique = unique_ratio > 0.9
        
        # Check for ID patterns in content
        sample = series.dropna().head(100).astype(str)
        if len(sample) == 0:
            return is_id_name, name_confidence * 0.5
        
        # Check if mostly alphanumeric with ID pattern
        alphanumeric_ratio = sample.str.match(r'^[A-Za-z0-9\-_]+$', na=False).mean()
        
        # Calculate confidence
        confidence = (alphanumeric_ratio * 0.4) + (unique_ratio * 0.3) + (name_confidence * 0.4)
        confidence = min(confidence, 1.0)
        
        # Must meet minimum criteria
        if (is_highly_unique or is_id_name) and alphanumeric_ratio > 0.7:
            return True, confidence
        
        return False, confidence
    
    def detect_boolean(self, series: pd.Series) -> Tuple[bool, float]:
        """Boolean detection"""
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str).str.lower()
        boolean_values = {'true', 'false', 'yes', 'no', 't', 'f', 'y', 'n', '1', '0'}
        matches = sample.isin(boolean_values).mean()
        
        return matches > 0.8, matches
    
    def detect_email(self, series: pd.Series) -> Tuple[bool, float]:
        """Email detection"""
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str)
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        matches = sample.str.match(email_pattern, na=False).mean()
        return matches > 0.6, matches
    
    def detect_phone(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        """Phone detection - stricter pattern matching, uses column_name parameter"""
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str)
        
        # Strict phone patterns - must have phone-specific formatting
        phone_patterns = [
            r'^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$',
            r'^\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}$',
            r'^\+?\d{1,3}[-\.\s]?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}$',
        ]
        
        pattern_matches = 0
        for val in sample:
            for pattern in phone_patterns:
                if re.match(pattern, val):
                    pattern_matches += 1
                    break
        
        pattern_ratio = pattern_matches / len(sample) if len(sample) > 0 else 0
        
        # Check for phone-specific keywords in column_name (parameter, not series.name)
        name_lower = column_name.lower()
        has_phone_keyword = any(kw in name_lower for kw in ['phone', 'mobile', 'tel', 'cell'])
        
        if pattern_ratio > 0.5:
            return True, pattern_ratio
        if has_phone_keyword and pattern_ratio > 0.3:
            return True, pattern_ratio + 0.2
        
        return False, pattern_ratio
    
    def detect_url(self, series: pd.Series) -> Tuple[bool, float]:
        """URL detection"""
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str)
        url_pattern = r'^https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+(?::\d+)?(?:/[-\w\.~:/?#[\]@!$&\'()*+,;=]*)?$'
        matches = sample.str.match(url_pattern, na=False).mean()
        return matches > 0.6, matches
    
    def detect_currency(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        """Currency detection - uses column_name parameter"""
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str)
        
        # Try to convert to numeric
        numeric_series = pd.to_numeric(series, errors='coerce')
        numeric_ratio = numeric_series.notna().mean()
        
        # Check for currency in column name (parameter, not series.name)
        name_lower = column_name.lower()
        currency_keywords = ['price', 'salary', 'amount', 'cost', 'fee', 'budget', 'payment', 'wage']
        has_currency_keyword = any(kw in name_lower for kw in currency_keywords)
        
        # If mostly numeric and has currency keyword -> likely currency
        if numeric_ratio > 0.7 and has_currency_keyword:
            return True, 0.7
        
        # Check for currency symbols in values
        currency_patterns = [
            r'^[\$€£¥₹]?\d+(?:,\d{3})*(?:\.\d{2})?$',
            r'^\d+(?:,\d{3})*(?:\.\d{2})?[\$€£¥₹]?$',
        ]
        
        for pattern in currency_patterns:
            matches = sample.str.match(pattern, na=False).mean()
            if matches > 0.6:
                return True, matches
        
        # Check for currency symbols
        currency_symbols = r'[\$€£¥₹]'
        symbol_matches = sample.str.contains(currency_symbols, na=False).mean()
        if symbol_matches > 0.4:
            return True, symbol_matches * 0.8
        
        return False, 0.0
    
    def detect_numeric(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        """Enhanced numeric detection - excludes IDs"""
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        # Skip if it's a strong ID column
        is_id, _ = self._is_id_column_name(column_name)
        if is_id:
            return False, 0.0
        
        # Try converting to numeric
        numeric_series = pd.to_numeric(series, errors='coerce')
        success_rate = numeric_series.notna().mean()
        
        # Check for numeric keywords in name
        name_lower = column_name.lower()
        numeric_keywords = ['score', 'grade', 'percentage', 'percent', 'rate', 'count', 'total']
        has_numeric_keyword = any(kw in name_lower for kw in numeric_keywords)
        
        if success_rate > 0.7:
            # Boost if name suggests numeric
            confidence = success_rate + (0.1 if has_numeric_keyword else 0)
            return True, min(confidence, 1.0)
        
        return False, success_rate
    
    def detect_date(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        """Strict date detection - only if likely date"""
        non_null = series.dropna()
        if len(non_null) < 5:  # Need at least 5 values
            return False, 0.0
        
        # SKIP if column name suggests ID or code
        is_id, _ = self._is_id_column_name(column_name)
        if is_id:
            return False, 0.0
        
        # SKIP if column name suggests numeric
        name_lower = column_name.lower()
        numeric_hints = ['age', 'score', 'grade', 'count', 'total', 'percent', 'rate']
        if any(hint in name_lower for hint in numeric_hints):
            return False, 0.0
        
        # SKIP if column is mostly numeric
        numeric_series = pd.to_numeric(series, errors='coerce')
        if numeric_series.notna().mean() > 0.8:
            return False, 0.0
        
        # Check for date patterns
        sample = non_null.head(100).astype(str)
        
        date_patterns = [
            r'^\d{4}-\d{1,2}-\d{1,2}$',      # 2024-01-15
            r'^\d{1,2}/\d{1,2}/\d{4}$',      # 01/15/2024
            r'^\d{1,2}-\d{1,2}-\d{4}$',      # 01-15-2024
            r'^\d{1,2}\s\w{3}\s\d{4}$',      # 15 Jan 2024
            r'^\w{3}\s\d{1,2},\s\d{4}$',     # Jan 15, 2024
            r'^\d{1,2}-\w{3}-\d{4}$',        # 15-Jan-2024
        ]
        
        matched = 0
        for val in sample:
            is_date = False
            for pattern in date_patterns:
                if re.match(pattern, val):
                    is_date = True
                    break
            if is_date:
                matched += 1
        
        date_ratio = matched / len(sample) if len(sample) > 0 else 0
        return date_ratio > 0.7, date_ratio
    
    def detect_categorical(self, series: pd.Series) -> Tuple[bool, float]:
        """Categorical detection - with minimum row guard"""
        total_count = len(series)
        if total_count < 10:  # Need at least 10 rows
            return False, 0.0
        
        unique_count = series.nunique()
        unique_ratio = unique_count / total_count
        
        # Low cardinality = good candidate for categorical
        if unique_ratio < 0.05 and unique_count < 30:
            confidence = 1 - unique_ratio
            return True, min(confidence, 1.0)
        
        return False, 0.0
    
    def detect_name(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        """Name detection - for columns containing person names"""
        # Check column name hints
        name_lower = column_name.lower()
        name_keywords = ['name', 'first_name', 'last_name', 'full_name', 'patient_name', 'student_name', 'employee_name']
        
        if any(keyword in name_lower for keyword in name_keywords):
            # Check content: mostly alphabetic with spaces
            sample = series.dropna().head(100).astype(str)
            alpha_ratio = sample.str.match(r'^[a-zA-Z\s\.\-\']+$', na=False).mean()
            if alpha_ratio > 0.7:
                return True, 0.7 + (alpha_ratio * 0.2)
        
        return False, 0.0
    
    def detect_city(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        """City/location detection"""
        name_lower = column_name.lower()
        location_keywords = ['city', 'town', 'location', 'address', 'street']
        
        if any(keyword in name_lower for keyword in location_keywords):
            return True, 0.65
        return False, 0.0
    
    def classify_column(self, series: pd.Series, column_name: str) -> Tuple[str, float, Dict]:
        """
        PRIORITY-BASED classification - first confident match wins
        Order matters: higher priority types checked first
        Name hints only apply if content didn't strongly reject the type
        """
        detection_details = {}
        
        # Priority chain - order determines precedence
        # First type that meets threshold wins
        priority_chain = [
            ('ID',          lambda: self.detect_id(series, column_name)),
            ('BOOLEAN',     lambda: self.detect_boolean(series)),
            ('EMAIL',       lambda: self.detect_email(series)),
            ('PHONE',       lambda: self.detect_phone(series, column_name)),
            ('URL',         lambda: self.detect_url(series)),
            ('CURRENCY',    lambda: self.detect_currency(series, column_name)),
            ('NUMERIC',     lambda: self.detect_numeric(series, column_name)),
            ('DATE',        lambda: self.detect_date(series, column_name)),
            ('NAME',        lambda: self.detect_name(series, column_name)),
            ('CITY',        lambda: self.detect_city(series, column_name)),
            ('CATEGORICAL', lambda: self.detect_categorical(series)),
        ]
        
        # Run priority detection
        for type_name, detector in priority_chain:
            is_match, confidence = detector()
            detection_details[type_name] = confidence
            if is_match and confidence > self.confidence_threshold:
                return type_name, confidence, detection_details
        
        # Name hints fallback - only if content didn't strongly reject the type
        name_lower = column_name.lower()
        
        # Define name hints with their expected types
        name_hints = {
            'age': 'NUMERIC',
            'score': 'NUMERIC',
            'grade': 'NUMERIC',
            'percentage': 'NUMERIC',
            'percent': 'NUMERIC',
            'salary': 'CURRENCY',
            'price': 'CURRENCY',
            'amount': 'CURRENCY',
            'cost': 'CURRENCY',
            'wage': 'CURRENCY',
            'gender': 'CATEGORICAL',
            'sex': 'CATEGORICAL',
            'city': 'CATEGORICAL',
            'country': 'CATEGORICAL',
            'state': 'CATEGORICAL',
            'province': 'CATEGORICAL',
            'status': 'CATEGORICAL',
            'type': 'CATEGORICAL',
            'category': 'CATEGORICAL',
            'name': 'NAME',
            'full_name': 'NAME',
            'patient_name': 'NAME',
            'address': 'ADDRESS',
        }
        
        for hint_word, suggested_type in name_hints.items():
            if hint_word in name_lower:
                # Check if this type was already tried and scored very low (strong rejection)
                previously_tried_score = detection_details.get(suggested_type, 0.5)
                # Only use name hint if content didn't strongly reject (score > 0.2)
                if previously_tried_score > 0.2:
                    return suggested_type, 0.65, detection_details
        
        # Default to TEXT
        return 'TEXT', 0.5, detection_details


class EncodingDetector:
    """Detect and handle file encoding issues"""
    
    @staticmethod
    def detect_encoding(file_path: str) -> Tuple[str, float]:
        """Detect file encoding using chardet"""
        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read(100000)
                result = chardet.detect(raw_data)
                return result['encoding'], result['confidence']
        except Exception as e:
            print(f"Encoding detection failed: {e}")
            return 'utf-8', 0.5
    
    @staticmethod
    def fix_mojibake(text: str) -> str:
        """Fix common mojibake (garbled text) issues"""
        if not isinstance(text, str):
            return text
        
        mojibake_fixes = [
            ('Ã¢â‚¬â€œ', '–'),
            ('Ã¢â‚¬â€�', '—'),
            ('Ã¢â€šÂ¬', '€'),
            ('Ã‚Â£', '£'),
            ('Ã¢â€žÂ¢', '™'),
            ('Ã‚Â®', '®'),
            ('Ã‚Â©', '©'),
            ('ÃƒÂ¼', 'ü'),
            ('ÃƒÂ¶', 'ö'),
            ('ÃƒÂ¤', 'ä'),
            ('ÃƒÅ¸', 'ß'),
            ('ÃƒÂ©', 'é'),
            ('ÃƒÂ¨', 'è'),
            ('ÃƒÂ§', 'ç'),
            ('Ã¢â€š', '€'),
            ('â‚¬', '€'),
            ('â€œ', '"'),
            ('â€�', '"'),
            ('â€™', "'"),
            ('Â', ''),
        ]
        
        for wrong, correct in mojibake_fixes:
            text = text.replace(wrong, correct)
        
        return text
    
    @staticmethod
    def read_file_with_encoding(file_path: str, file_type: str = 'csv') -> pd.DataFrame:
        """Read file with automatic encoding detection"""
        encoding, confidence = EncodingDetector.detect_encoding(file_path)
        print(f"Detected encoding: {encoding} (confidence: {confidence:.2f})")
        
        try:
            if file_type == 'csv':
                return pd.read_csv(file_path, encoding=encoding)
            else:
                return pd.read_excel(file_path)
        except Exception as e:
            print(f"Failed with {encoding}: {e}")
        
        fallback_encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-16']
        for enc in fallback_encodings:
            try:
                print(f"Trying fallback encoding: {enc}")
                if file_type == 'csv':
                    return pd.read_csv(file_path, encoding=enc)
                else:
                    return pd.read_excel(file_path)
            except:
                continue
        
        raise Exception("Could not read file with any encoding")


# Export all classes
__all__ = ['AdvancedTypeDetector', 'EncodingDetector']