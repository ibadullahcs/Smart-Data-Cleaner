# backend/app/services/type_detector.py
# Priority-based type detection

import pandas as pd
import numpy as np
import re
from dateutil import parser
from dateutil.parser import ParserError
from typing import Tuple, Dict, Any, List, Optional
import chardet


class AdvancedTypeDetector:
    """
    Priority-based column type detection
    - First confident match in priority order wins
    - Uses column_name parameter consistently (no series.name)
    - Name hints only apply if content didn't strongly reject
    """
    
    def __init__(self, confidence_threshold: float = 0.6):
        self.confidence_threshold = confidence_threshold

    @staticmethod
    def _name_has_word(name_lower: str, keywords: List[str]) -> bool:
        for kw in keywords:
            pattern = r'(?<![a-z0-9])' + re.escape(kw) + r'(?![a-z0-9])'
            if re.search(pattern, name_lower):
                return True
        return False
    
    def detect_encoding(self, file_path: str) -> Tuple[str, float]:
        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read(100000)
                result = chardet.detect(raw_data)
                return result['encoding'], result['confidence']
        except Exception as e:
            print(f"Encoding detection failed: {e}")
            return 'utf-8', 0.5
    
    def _is_id_column_name(self, column_name: str) -> Tuple[bool, float]:
        name_lower = column_name.lower()
        
        strong_id_suffixes = ['_id', '-id', '.id']
        for suffix in strong_id_suffixes:
            if name_lower.endswith(suffix):
                return True, 0.9
        
        strong_id_words = ['identifier', 'primary_key', 'foreign_key']
        for word in strong_id_words:
            if word in name_lower:
                return True, 0.85
        
        weak_code_words = ['code', 'number']
        name_parts = re.split(r'[_\s-]', name_lower)
        for part in name_parts:
            if part in weak_code_words:
                return False, 0.4
        
        if 'id' in name_parts:
            return True, 0.8
        
        return False, 0.0
    
    def detect_id(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        total_count = len(series)
        if total_count == 0:
            return False, 0.0
        
        is_id_name, name_confidence = self._is_id_column_name(column_name)
        
        if total_count < 10:
            return is_id_name, name_confidence * 0.7
        
        unique_ratio = series.nunique() / total_count
        is_highly_unique = unique_ratio > 0.9
        
        sample = series.dropna().head(100).astype(str)
        if len(sample) == 0:
            return is_id_name, name_confidence * 0.5
        
        alphanumeric_ratio = sample.str.match(r'^[A-Za-z0-9\-_]+$', na=False).mean()
        
        confidence = (alphanumeric_ratio * 0.4) + (unique_ratio * 0.3) + (name_confidence * 0.4)
        confidence = min(confidence, 1.0)
        
        if (is_highly_unique or is_id_name) and alphanumeric_ratio > 0.7:
            return True, confidence
        
        return False, confidence

    def detect_boolean(self, series: pd.Series) -> Tuple[bool, float]:
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str).str.strip().str.lower()
        boolean_values = {'true', 'false', 'yes', 'no', 't', 'f', 'y', 'n', '1', '0'}
        matches = sample.isin(boolean_values).mean()

        if non_null.nunique() > 3:
            return False, 0.0
        
        return matches > 0.8, matches
    
    def detect_email(self, series: pd.Series) -> Tuple[bool, float]:
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str)
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        matches = sample.str.match(email_pattern, na=False).mean()
        return matches > 0.6, matches
    
    def detect_phone(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str)
        
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
        
        name_lower = column_name.lower()
        has_phone_keyword = self._name_has_word(name_lower, ['phone', 'mobile', 'tel', 'cell'])
        
        if pattern_ratio > 0.5:
            return True, pattern_ratio
        if has_phone_keyword and pattern_ratio > 0.3:
            return True, pattern_ratio + 0.2
        
        return False, pattern_ratio
    
    def detect_url(self, series: pd.Series) -> Tuple[bool, float]:
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str)
        url_pattern = r'^https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+(?::\d+)?(?:/[-\w\.~:/?#[\]@!$&\'()*+,;=]*)?$'
        matches = sample.str.match(url_pattern, na=False).mean()
        return matches > 0.6, matches
    
    def detect_currency(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        """
        Currency detection.

        FIX (root cause of age -> Currency misclassification): the
        content-based fallback patterns previously made the currency
        SYMBOL optional (`[\$€£¥₹]?`), so a column of plain digits like
        76, 69, 79 (an "age" column) matched the pattern with a ~1.0
        ratio and got classified as CURRENCY purely because it "looked
        like a formatted number" — with no currency symbol anywhere in
        the data. The symbol is now REQUIRED for this content-only
        path; a column is only inferred as currency from its raw values
        if it actually contains a currency symbol. The name+numeric
        path below (for columns named "price", "salary", etc. with no
        symbol in the data) is unchanged and still works correctly.
        """
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        sample = non_null.head(100).astype(str)
        
        numeric_series = pd.to_numeric(series, errors='coerce')
        numeric_ratio = numeric_series.notna().mean()
        
        name_lower = column_name.lower()
        currency_keywords = ['price', 'salary', 'amount', 'cost', 'fee', 'budget', 'payment', 'wage']
        has_currency_keyword = self._name_has_word(name_lower, currency_keywords)
        
        if numeric_ratio > 0.7 and has_currency_keyword:
            confidence = min(0.5 + (numeric_ratio * 0.4), 0.95)
            return True, confidence
        
        # FIX: symbol is now REQUIRED (no trailing `?` on the symbol
        # group) — previously these matched plain digit strings with
        # no currency symbol at all.
        currency_patterns = [
            r'^[\$€£¥₹]\d+(?:,\d{3})*(?:\.\d{2})?$',
            r'^\d+(?:,\d{3})*(?:\.\d{2})?[\$€£¥₹]$',
        ]
        for pattern in currency_patterns:
            matches = sample.str.match(pattern, na=False).mean()
            if matches > 0.6:
                return True, matches
        
        currency_symbols = r'[\$€£¥₹]'
        symbol_matches = sample.str.contains(currency_symbols, na=False).mean()
        if symbol_matches > 0.4:
            return True, symbol_matches * 0.8
        
        return False, 0.0

    def detect_age(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0

        name_lower = column_name.lower()
        if not self._name_has_word(name_lower, ['age']):
            return False, 0.0

        numeric_series = pd.to_numeric(series, errors='coerce')
        valid_numeric = numeric_series.dropna()
        if len(valid_numeric) == 0:
            return False, 0.0

        numeric_ratio = len(valid_numeric) / len(non_null)
        in_range_ratio = ((valid_numeric >= 0) & (valid_numeric <= 120)).mean()

        if numeric_ratio > 0.7 and in_range_ratio > 0.7:
            confidence = min(0.6 + (in_range_ratio * 0.3), 0.95)
            return True, confidence

        return False, 0.0
    
    def detect_numeric(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0
        
        is_id, _ = self._is_id_column_name(column_name)
        if is_id:
            return False, 0.0
        
        numeric_series = pd.to_numeric(series, errors='coerce')
        success_rate = numeric_series.notna().mean()
        
        name_lower = column_name.lower()
        numeric_keywords = ['score', 'grade', 'percentage', 'percent', 'rate', 'count', 'total']
        has_numeric_keyword = self._name_has_word(name_lower, numeric_keywords)
        
        if success_rate > 0.7:
            confidence = success_rate + (0.1 if has_numeric_keyword else 0)
            return True, min(confidence, 1.0)
        
        return False, success_rate

    @staticmethod
    def _looks_date_like(sample: pd.Series) -> float:
        month_names = (
            r'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec'
        )
        date_ish = re.compile(
            r'(\d{1,4}[\-/\.]\d{1,2}[\-/\.]\d{1,4})'
            r'|(\d{1,2}\s*[-/\s]\s*(' + month_names + r'))'
            r'|((' + month_names + r')\s*[-/\s,]\s*\d{1,4})',
            re.IGNORECASE
        )
        return sample.apply(lambda v: bool(date_ish.search(str(v)))).mean()
    
    def detect_date(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        non_null = series.dropna()
        if len(non_null) < 5:
            return False, 0.0
        
        is_id, _ = self._is_id_column_name(column_name)
        if is_id:
            return False, 0.0
        
        name_lower = column_name.lower()
        numeric_hints = ['age', 'score', 'grade', 'count', 'total', 'percent', 'rate']
        if self._name_has_word(name_lower, numeric_hints):
            return False, 0.0

        numeric_series = pd.to_numeric(series, errors='coerce')
        if numeric_series.notna().mean() > 0.8:
            return False, 0.0
        
        sample = non_null.head(200).astype(str).str.strip()
        
        date_patterns = [
            r'^\d{4}-\d{1,2}-\d{1,2}$',
            r'^\d{4}/\d{1,2}/\d{1,2}$',
            r'^\d{1,2}/\d{1,2}/\d{4}$',
            r'^\d{1,2}-\d{1,2}-\d{4}$',
            r'^\d{1,2}\.\d{1,2}\.\d{4}$',
            r'^\d{4}\.\d{1,2}\.\d{1,2}$',
            r'^\d{1,2}/\d{1,2}/\d{2}$',
            r'^\d{4}-\d{1,2}-\d{1,2}[T\s]\d{1,2}:\d{2}',
            r'^\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}',
            r'^\d{1,2}\s\w{3}\s\d{4}$',
            r'^\w{3}\s\d{1,2},?\s\d{4}$',
            r'^\d{1,2}-\w{3}-\d{4}$',
            r'^\w{3,9}\s+\d{4}$',
            r'^\w{3}-\d{4}$',
        ]
        
        matched = 0
        for val in sample:
            for pattern in date_patterns:
                if re.match(pattern, val, re.IGNORECASE):
                    matched += 1
                    break
        
        date_ratio = matched / len(sample) if len(sample) > 0 else 0
        if date_ratio > 0.7:
            return True, min(date_ratio, 0.97)

        date_like_ratio = self._looks_date_like(sample)
        if date_like_ratio > 0.7:
            parsed = pd.to_datetime(sample, errors='coerce', format='mixed', dayfirst=False)
            parse_ratio = parsed.notna().mean()
            if parse_ratio > 0.8:
                return True, min(0.65 + (parse_ratio * 0.25), 0.92)

        return False, max(date_ratio, 0.0)

    def detect_gender(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0

        unique_count = non_null.nunique()
        if unique_count > 8:
            return False, 0.0

        name_lower = column_name.lower()
        has_gender_hint = self._name_has_word(name_lower, ['gender', 'sex'])

        sample = non_null.head(200).astype(str).str.strip().str.lower()
        known_values = {
            'male', 'female', 'm', 'f', 'other', 'non-binary', 'nonbinary',
            'prefer not to say', 'unknown', 'transgender', 'nb'
        }
        match_ratio = sample.isin(known_values).mean()

        if match_ratio > 0.8:
            return True, min(0.6 + match_ratio * 0.3, 0.95)
        if has_gender_hint and match_ratio > 0.5:
            return True, 0.75
        if has_gender_hint and unique_count <= 6:
            return True, 0.65

        return False, 0.0

    def detect_province(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        non_null = series.dropna()
        if len(non_null) < 3:
            return False, 0.0

        name_lower = column_name.lower()
        has_hint = self._name_has_word(name_lower, ['province', 'state', 'region'])
        if not has_hint:
            return False, 0.0

        total = len(non_null)
        unique_ratio = non_null.nunique() / total if total > 0 else 1.0
        if unique_ratio < 0.5:
            return True, 0.65

        return False, 0.0
    
    def detect_categorical(self, series: pd.Series) -> Tuple[bool, float]:
        non_null = series.dropna()
        total_count = len(non_null)
        if total_count < 3:
            return False, 0.0

        unique_count = non_null.nunique()

        if unique_count <= 1:
            return False, 0.0
        if unique_count == total_count:
            return False, 0.0

        unique_ratio = unique_count / total_count
        avg_repetition = total_count / unique_count

        if unique_count <= 25 and avg_repetition >= 2:
            confidence = min(0.62 + (min(avg_repetition, 20) / 20) * 0.3, 0.93)
            return True, confidence

        if unique_ratio < 0.1 and unique_count <= 60:
            return True, min(1 - unique_ratio, 0.9)

        return False, 0.0

    def detect_name(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        name_lower = column_name.lower()
        name_keywords = ['name', 'first_name', 'last_name', 'full_name', 'patient_name', 'student_name', 'employee_name']
        
        if self._name_has_word(name_lower, name_keywords):
            sample = series.dropna().head(100).astype(str)
            alpha_ratio = sample.str.match(r'^[a-zA-Z\s\.\-\']+$', na=False).mean()
            if alpha_ratio > 0.7:
                return True, 0.7 + (alpha_ratio * 0.2)
        
        return False, 0.0
    
    def detect_city(self, series: pd.Series, column_name: str) -> Tuple[bool, float]:
        name_lower = column_name.lower()
        location_keywords = ['city', 'town', 'location', 'address', 'street']
        
        if self._name_has_word(name_lower, location_keywords):
            return True, 0.65
        return False, 0.0
    
    def classify_column(self, series: pd.Series, column_name: str) -> Tuple[str, float, Dict]:
        detection_details = {}
        
        priority_chain = [
            ('ID',          lambda: self.detect_id(series, column_name)),
            ('BOOLEAN',     lambda: self.detect_boolean(series)),
            ('EMAIL',       lambda: self.detect_email(series)),
            ('PHONE',       lambda: self.detect_phone(series, column_name)),
            ('URL',         lambda: self.detect_url(series)),
            ('CURRENCY',    lambda: self.detect_currency(series, column_name)),
            ('AGE',         lambda: self.detect_age(series, column_name)),
            ('NUMERIC',     lambda: self.detect_numeric(series, column_name)),
            ('DATE',        lambda: self.detect_date(series, column_name)),
            ('GENDER',      lambda: self.detect_gender(series, column_name)),
            ('PROVINCE',    lambda: self.detect_province(series, column_name)),
            ('NAME',        lambda: self.detect_name(series, column_name)),
            ('CITY',        lambda: self.detect_city(series, column_name)),
            ('CATEGORICAL', lambda: self.detect_categorical(series)),
        ]
        
        for type_name, detector in priority_chain:
            is_match, confidence = detector()
            detection_details[type_name] = confidence
            if is_match and confidence > self.confidence_threshold:
                return type_name, confidence, detection_details

        name_lower = column_name.lower()
        
        name_hints = {
            'score': 'NUMERIC',
            'grade': 'NUMERIC',
            'percentage': 'NUMERIC',
            'percent': 'NUMERIC',
            'salary': 'CURRENCY',
            'price': 'CURRENCY',
            'amount': 'CURRENCY',
            'cost': 'CURRENCY',
            'wage': 'CURRENCY',
            'city': 'CATEGORICAL',
            'country': 'CATEGORICAL',
            'status': 'CATEGORICAL',
            'type': 'CATEGORICAL',
            'category': 'CATEGORICAL',
            'name': 'NAME',
            'full_name': 'NAME',
            'patient_name': 'NAME',
            'address': 'ADDRESS',
            'date': 'DATE',
            'dob': 'DATE',
            'birthdate': 'DATE',
            'timestamp': 'DATE',
            'created': 'DATE',
            'updated': 'DATE',
        }
        
        for hint_word, suggested_type in name_hints.items():
            if self._name_has_word(name_lower, [hint_word]):
                previously_tried_score = detection_details.get(suggested_type, 0.5)
                if previously_tried_score > 0.2:
                    return suggested_type, 0.65, detection_details
        
        return 'TEXT', 0.5, detection_details


class EncodingDetector:
    """Detect and handle file encoding issues"""
    
    @staticmethod
    def detect_encoding(file_path: str) -> Tuple[str, float]:
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
        ]
        
        for wrong, correct in mojibake_fixes:
            text = text.replace(wrong, correct)
        
        return text

    @staticmethod
    def read_file_with_encoding(file_path: str, file_type: str = 'csv') -> pd.DataFrame:
        encoding, confidence = EncodingDetector.detect_encoding(file_path)
        print(f"Detected encoding: {encoding} (confidence: {confidence:.2f})")
        
        try:
            if file_type == 'csv':
                return pd.read_csv(file_path, encoding=encoding)
            else:
                return pd.read_excel(file_path)
        except Exception as e:
            print(f"Failed with {encoding}: {e}")

        if file_type != 'csv':
            raise Exception(f"Could not read Excel file: {file_path}")

        fallback_encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-16']
        for enc in fallback_encodings:
            try:
                print(f"Trying fallback encoding: {enc}")
                return pd.read_csv(file_path, encoding=enc)
            except Exception:
                continue
        
        raise Exception("Could not read file with any encoding")


__all__ = ['AdvancedTypeDetector', 'EncodingDetector']