// frontend/src/utils/validators.js
// Professional Validation Utilities for Data Cleaning

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim().toLowerCase());
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @param {number} minDigits - Minimum digits (default: 10)
 * @param {number} maxDigits - Maximum digits (default: 15)
 * @returns {boolean}
 */
export const isValidPhone = (phone, minDigits = 10, maxDigits = 15) => {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= minDigits && digits.length <= maxDigits;
};

/**
 * Validate date format
 * @param {string|Date} date - Date to validate
 * @returns {boolean}
 */
export const isValidDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
};

/**
 * Validate age value (0-120)
 * @param {number} age - Age to validate
 * @returns {boolean}
 */
export const isValidAge = (age) => {
  if (age === null || age === undefined) return false;
  const num = Number(age);
  return !isNaN(num) && num >= 0 && num <= 120;
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate that a value is not empty
 * @param {any} value - Value to check
 * @returns {boolean}
 */
export const isNotEmpty = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

/**
 * Validate that a string contains only letters and spaces
 * @param {string} value - String to validate
 * @returns {boolean}
 */
export const isAlphaWithSpaces = (value) => {
  if (!value || typeof value !== 'string') return false;
  return /^[A-Za-z\s\-.']+$/.test(value);
};

/**
 * Validate that a string contains only numbers
 * @param {string} value - String to validate
 * @returns {boolean}
 */
export const isNumeric = (value) => {
  if (!value) return false;
  return /^\d+$/.test(String(value));
};

/**
 * Validate that a value is a number within range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean}
 */
export const isInRange = (value, min, max) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Validate file type
 * @param {File} file - The file to validate
 * @param {Array} allowedExtensions - Array of allowed extensions
 * @returns {Object} { isValid, errorMessage }
 */
export const validateFileType = (file, allowedExtensions = ['.csv', '.xlsx', '.xls']) => {
  if (!file) {
    return { isValid: false, errorMessage: 'No file selected' };
  }

  const fileName = file.name;
  const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      errorMessage: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`
    };
  }
  
  return { isValid: true, errorMessage: null };
};

/**
 * Validate file size
 * @param {File} file - The file to validate
 * @param {number} maxSizeMB - Maximum file size in MB (default: 100MB)
 * @returns {Object} { isValid, errorMessage }
 */
export const validateFileSize = (file, maxSizeMB = 100) => {
  if (!file) {
    return { isValid: false, errorMessage: 'No file selected' };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      errorMessage: `File too large. Maximum size is ${maxSizeMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    };
  }
  
  return { isValid: true, errorMessage: null };
};

/**
 * Validate CSV content structure
 * @param {string} content - CSV content as string
 * @returns {Object} { isValid, errorMessage }
 */
export const validateCsvContent = (content) => {
  if (!content || content.trim().length === 0) {
    return { isValid: false, errorMessage: 'File is empty' };
  }
  
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return { isValid: false, errorMessage: 'File must contain at least a header row and one data row' };
  }
  
  const headerCount = lines[0].split(',').length;
  for (let i = 1; i < Math.min(lines.length, 10); i++) {
    const columnCount = lines[i].split(',').length;
    if (columnCount !== headerCount) {
      return {
        isValid: false,
        errorMessage: `Row ${i + 1} has ${columnCount} columns, but header has ${headerCount} columns`
      };
    }
  }
  
  return { isValid: true, errorMessage: null };
};

/**
 * Validate table name for SQL export
 * @param {string} tableName - Table name to validate
 * @returns {Object} { isValid, errorMessage, sanitized }
 */
export const validateTableName = (tableName) => {
  if (!tableName || tableName.trim().length === 0) {
    return { isValid: false, errorMessage: 'Table name cannot be empty', sanitized: '' };
  }
  
  // Remove special characters and replace spaces with underscores
  let sanitized = tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  sanitized = sanitized.replace(/_+/g, '_').replace(/^_|_$/g, '');
  
  if (sanitized.length === 0) {
    return { isValid: false, errorMessage: 'Table name contains no valid characters', sanitized: '' };
  }
  
  // Check if it starts with a number (invalid in SQL)
  if (/^\d/.test(sanitized)) {
    sanitized = `table_${sanitized}`;
  }
  
  return { isValid: true, errorMessage: null, sanitized };
};

/**
 * Sanitize column name for SQL
 * @param {string} columnName - Column name to sanitize
 * @returns {string} Sanitized column name
 */
export const sanitizeColumnName = (columnName) => {
  if (!columnName) return 'column';
  let sanitized = columnName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  sanitized = sanitized.replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (/^\d/.test(sanitized)) sanitized = `col_${sanitized}`;
  return sanitized || 'column';
};

/**
 * Combined file validation
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} { isValid, errors }
 */
export const validateFile = (file, options = {}) => {
  const errors = [];
  
  const typeValidation = validateFileType(file, options.allowedExtensions);
  if (!typeValidation.isValid) {
    errors.push(typeValidation.errorMessage);
  }
  
  const sizeValidation = validateFileSize(file, options.maxSizeMB);
  if (!sizeValidation.isValid) {
    errors.push(sizeValidation.errorMessage);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate column value based on detected type
 * @param {any} value - Value to validate
 * @param {string} columnType - Detected column type
 * @returns {Object} { isValid, message }
 */
export const validateColumnValue = (value, columnType) => {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, message: 'Missing value' };
  }
  
  switch (columnType) {
    case 'EMAIL':
      return { isValid: isValidEmail(value), message: isValidEmail(value) ? '' : 'Invalid email format' };
    case 'PHONE':
      return { isValid: isValidPhone(value), message: isValidPhone(value) ? '' : 'Invalid phone number' };
    case 'DATE':
      return { isValid: isValidDate(value), message: isValidDate(value) ? '' : 'Invalid date format' };
    case 'AGE':
      return { isValid: isValidAge(value), message: isValidAge(value) ? '' : 'Age must be between 0 and 120' };
    case 'URL':
      return { isValid: isValidUrl(value), message: isValidUrl(value) ? '' : 'Invalid URL format' };
    case 'NUMERIC':
      return { isValid: !isNaN(Number(value)), message: !isNaN(Number(value)) ? '' : 'Must be a number' };
    case 'CURRENCY':
      const num = Number(String(value).replace(/[^0-9.-]/g, ''));
      return { isValid: !isNaN(num), message: !isNaN(num) ? '' : 'Invalid currency format' };
    default:
      return { isValid: true, message: '' };
  }
};

/**
 * Check if a value is a duplicate in an array
 * @param {Array} array - Array to check
 * @param {any} value - Value to find
 * @param {string} key - Optional key for objects
 * @returns {boolean}
 */
export const isDuplicate = (array, value, key = null) => {
  if (!array || array.length === 0) return false;
  
  if (key) {
    return array.filter(item => item[key] === value).length > 1;
  }
  return array.filter(item => item === value).length > 1;
};

/**
 * Find duplicate values in an array
 * @param {Array} array - Array to check
 * @param {string} key - Optional key for objects
 * @returns {Array} Array of duplicate values
 */
export const findDuplicates = (array, key = null) => {
  if (!array || array.length === 0) return [];
  
  const seen = new Set();
  const duplicates = new Set();
  
  array.forEach(item => {
    const value = key ? item[key] : item;
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  });
  
  return Array.from(duplicates);
};

export default {
  isValidEmail,
  isValidPhone,
  isValidDate,
  isValidAge,
  isValidUrl,
  isNotEmpty,
  isAlphaWithSpaces,
  isNumeric,
  isInRange,
  validateFileType,
  validateFileSize,
  validateCsvContent,
  validateTableName,
  sanitizeColumnName,
  validateFile,
  validateColumnValue,
  isDuplicate,
  findDuplicates
};