// frontend/src/utils/constants.js
// Application constants

export const APP_NAME = 'Smart Cleaner';
export const APP_VERSION = '1.0.0';

// API endpoints
export const API_ENDPOINTS = {
  UPLOAD: '/upload',
  PROFILE: '/profile',
  CLEAN: '/clean',
  SMART_CLEAN: '/smart-clean',
  DOWNLOAD: '/download',
  EXPORT_SQL: '/export/sql',
  ANALYZE: '/analyze',
  CHARTS: '/charts',
  REPORT: '/report'
};

// File upload limits
export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ['.csv', '.xlsx', '.xls'];
export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Pagination defaults
export const DEFAULT_ROWS_PER_PAGE = 50;
export const ROWS_PER_PAGE_OPTIONS = [25, 50, 100, 250];

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_TIME: 'MMM DD, YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  API: 'YYYY-MM-DDTHH:mm:ss',
  FILENAME: 'YYYY-MM-DD-HHmmss'
};

// Number formats
export const NUMBER_FORMATS = {
  DECIMAL: 'en-US',
  CURRENCY: 'USD',
  PERCENT: 'en-US'
};

// Cleaning thresholds
export const CLEANING_THRESHOLDS = {
  AGE_MIN: 0,
  AGE_MAX: 120,
  YEAR_MIN: 1900,
  YEAR_MAX: 2100,
  SALARY_MAX: 10000000,
  PHONE_MIN_DIGITS: 10,
  PHONE_MAX_DIGITS: 15
};

// Quality score thresholds
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0
};

// Storage keys
export const STORAGE_KEYS = {
  THEME: 'smart-cleaner-theme',
  SETTINGS: 'smart-cleaner-settings',
  HISTORY: 'smart-cleaner-history',
  AUTH_TOKEN: 'smart-cleaner-auth-token'
};

// Default settings
export const DEFAULT_SETTINGS = {
  theme: 'light',
  autoSaveHistory: true,
  maxHistoryItems: 50,
  defaultExportFormat: 'csv',
  showColumnTypes: true,
  confirmBeforeClean: true,
  rowsPerPage: 50
};

// Error messages
export const ERROR_MESSAGES = {
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  PROFILE_FAILED: 'Failed to analyze data. Please try again.',
  CLEAN_FAILED: 'Cleaning operation failed. Please try again.',
  DOWNLOAD_FAILED: 'Failed to download file. Please try again.',
  FILE_TOO_LARGE: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
  INVALID_FILE_TYPE: `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}`,
  NO_DATA: 'No data found. Please upload a file first.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: 'File uploaded successfully!',
  PROFILE_SUCCESS: 'Data analysis complete!',
  CLEAN_SUCCESS: 'Data cleaned successfully!',
  DOWNLOAD_SUCCESS: 'File downloaded successfully!',
  EXPORT_SUCCESS: 'Export completed successfully!'
};

export default {
  APP_NAME,
  APP_VERSION,
  API_ENDPOINTS,
  MAX_FILE_SIZE_MB,
  ALLOWED_FILE_TYPES,
  DEFAULT_ROWS_PER_PAGE,
  ROWS_PER_PAGE_OPTIONS,
  CLEANING_THRESHOLDS,
  QUALITY_THRESHOLDS,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};