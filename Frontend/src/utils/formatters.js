// frontend/src/utils/formatters.js
// Professional Formatting Utilities for Data Display

/**
 * Format number with commas (e.g., 1234567 -> 1,234,567)
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string}
 */
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '-';
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '-';
  return number.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Format currency (e.g., 1234.56 -> $1,234.56)
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string}
 */
export const formatCurrency = (amount, currency = '$') => {
  if (amount === null || amount === undefined) return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '-';
  return `${currency}${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Format percentage (e.g., 0.4567 -> 45.67%)
 * @param {number} value - Value to format (0-1)
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string}
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return `${(num * 100).toFixed(decimals)}%`;
};

/**
 * Format file size (e.g., 1234567 -> 1.18 MB)
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string}
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '-';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Format date (e.g., 2024-01-15 -> Jan 15, 2024)
 * @param {string|Date} date - Date to format
 * @param {string} format - Format style (short, long, iso, time)
 * @returns {string}
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    case 'iso':
      return d.toISOString().split('T')[0];
    case 'time':
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    default:
      return d.toLocaleDateString();
  }
};

/**
 * Format datetime
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return `${formatDate(d, 'short')} ${formatDate(d, 'time')}`;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string}
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string}
 */
export const capitalizeWords = (text) => {
  if (!text) return '';
  return text.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

/**
 * Convert to title case (preserves acronyms)
 * @param {string} text - Text to convert
 * @returns {string}
 */
export const toTitleCase = (text) => {
  if (!text) return '';
  
  // Words that should stay lowercase (unless first word)
  const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'with'];
  
  // Acronyms to preserve as uppercase
  const acronyms = ['AI', 'API', 'URL', 'HTML', 'CSS', 'JSON', 'XML', 'SQL', 'ID', 'CEO', 'CTO', 'CFO', 'PhD', 'MD'];
  
  return text.toLowerCase().split(' ').map((word, index) => {
    // Check if it's an acronym
    if (acronyms.includes(word.toUpperCase())) return word.toUpperCase();
    // Check if it's a small word (not first)
    if (index !== 0 && smallWords.includes(word)) return word;
    // Capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

/**
 * Convert to snake_case
 * @param {string} text - Text to convert
 * @returns {string}
 */
export const toSnakeCase = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
};

/**
 * Format phone number (e.g., 1234567890 -> (123) 456-7890)
 * @param {string} phone - Phone number to format
 * @returns {string}
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
};

/**
 * Format duration in seconds to readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string}
 */
export const formatDuration = (seconds) => {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

/**
 * Format number with suffix (K, M, B)
 * @param {number} num - Number to format
 * @returns {string}
 */
export const formatNumberWithSuffix = (num) => {
  if (num === null || num === undefined) return '-';
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
  return (num / 1000000000).toFixed(1) + 'B';
};

/**
 * Format column name for display (e.g., user_email -> User Email)
 * @param {string} columnName - Column name to format
 * @returns {string}
 */
export const formatColumnName = (columnName) => {
  if (!columnName) return '';
  return columnName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};

/**
 * Highlight search term in text
 * @param {string} text - Original text
 * @param {string} searchTerm - Term to highlight
 * @returns {string} HTML string with mark tags
 */
export const highlightText = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="highlight">$1</mark>');
};

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string}
 */
export const escapeHtml = (text) => {
  if (!text) return '';
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
};

/**
 * Parse CSV string to array of objects
 * @param {string} csvString - CSV content
 * @returns {Array} Parsed rows
 */
export const parseCSV = (csvString) => {
  if (!csvString) return [];
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] ? values[i].trim() : '';
    });
    return row;
  });
  return rows;
};

/**
 * Format SQL value (escapes quotes)
 * @param {any} value - Value to format for SQL
 * @returns {string}
 */
export const formatSQLValue = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) return `'${value.toISOString().split('T')[0]}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
};

/**
 * Format for Excel export (handles special characters)
 * @param {any} value - Value to format for Excel
 * @returns {string}
 */
export const formatExcelValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toString();
  if (value instanceof Date) return formatDate(value, 'iso');
  return String(value);
};

export default {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatFileSize,
  formatDate,
  formatDateTime,
  truncateText,
  capitalizeWords,
  toTitleCase,
  toSnakeCase,
  formatPhone,
  formatDuration,
  formatNumberWithSuffix,
  formatColumnName,
  highlightText,
  escapeHtml,
  parseCSV,
  formatSQLValue,
  formatExcelValue
};