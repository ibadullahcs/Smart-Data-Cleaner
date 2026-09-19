// frontend/src/services/api.js
// Complete API Service - All Backend Endpoints with Supabase Auth

import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

function buildAuthHeaders(token, extra = {}) {
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...extra,
  };
}

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorDetail;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      if (response.status === 401) {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session) {
          const retryConfig = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${session.access_token}`,
            },
          };
          const retryResponse = await fetch(url, retryConfig);
          if (retryResponse.ok) {
            return await retryResponse.json();
          }
        }
      }
      
      throw new Error(errorDetail);
    }
    
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

async function uploadFile(file, onProgress) {
  const url = `${API_BASE_URL}/upload`;

  const attempt = (token, alreadyRetried) => new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
        return;
      }

      if (xhr.status === 401 && !alreadyRetried) {
        try {
          const { data: { session } } = await supabase.auth.refreshSession();
          if (session) {
            const retryResult = await attempt(session.access_token, true);
            resolve(retryResult);
            return;
          }
        } catch (refreshErr) {
          console.error('Session refresh failed during upload retry:', refreshErr);
        }
      }

      try {
        const error = JSON.parse(xhr.responseText);
        reject(new Error(error.detail || `Upload failed: ${xhr.status}`));
      } catch (e) {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred during upload'));
    });

    xhr.open('POST', url);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });

  const token = await getAuthToken();
  return attempt(token, false);
}

async function downloadFile(jobId, format = 'csv') {
  const url = `${API_BASE_URL}/download/${jobId}?format=${encodeURIComponent(format)}`;

  const attempt = async (token, alreadyRetried) => {
    const response = await fetch(url, {
      headers: buildAuthHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 401 && !alreadyRetried) {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session) {
          return attempt(session.access_token, true);
        }
      }

      let errorDetail;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    return response;
  };

  try {
    const token = await getAuthToken();
    const response = await attempt(token, false);

    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `cleaned_data_${jobId}.${format}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }

    const blob = await response.blob();
    const url_blob = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url_blob;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url_blob);

    return { success: true, filename };
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// ============================================
// 1. MISSING VALUES ENDPOINTS
// ============================================

async function fillMean(jobId, column) {
  return apiCall(`/clean/fill-mean/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function fillMedian(jobId, column) {
  return apiCall(`/clean/fill-median/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function fillMode(jobId, column) {
  return apiCall(`/clean/fill-mode/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function fillConstant(jobId, column, value) {
  return apiCall(`/clean/fill-constant/${jobId}?column=${encodeURIComponent(column)}&value=${encodeURIComponent(value)}`, { method: 'POST' });
}

async function fillForward(jobId, column) {
  return apiCall(`/clean/fill-forward/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function fillBackward(jobId, column) {
  return apiCall(`/clean/fill-backward/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

// ============================================
// 2. DUPLICATES ENDPOINTS
// ============================================

async function removeDuplicates(jobId, keep = 'first', keys = null) {
  let url = `/clean/remove-duplicates/${jobId}?keep=${encodeURIComponent(keep)}`;
  if (keys) url += `&keys=${encodeURIComponent(keys)}`;
  return apiCall(url, { method: 'POST' });
}

// ============================================
// 3. TEXT CLEANING ENDPOINTS
// ============================================

async function trimSpaces(jobId, column) {
  return apiCall(`/clean/trim-spaces/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function toLowercase(jobId, column) {
  return apiCall(`/clean/to-lowercase/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function toUppercase(jobId, column) {
  return apiCall(`/clean/to-uppercase/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function toTitlecase(jobId, column) {
  return apiCall(`/clean/to-titlecase/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function removeSpecialChars(jobId, column, keep = 'alphanumeric') {
  return apiCall(`/clean/remove-special/${jobId}?column=${encodeURIComponent(column)}&keep=${encodeURIComponent(keep)}`, { method: 'POST' });
}

async function fixEncoding(jobId, column) {
  return apiCall(`/clean/fix-encoding/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function standardizeCategories(jobId, column, mode = 'auto') {
  return apiCall(
    `/clean/standardize-categories/${jobId}?column=${encodeURIComponent(column)}&mode=${encodeURIComponent(mode)}`,
    { method: 'POST' }
  );
}

// ============================================
// 4. OUTLIER ENDPOINTS
// ============================================

async function previewOutliers(jobId, column, multiplier = 1.5) {
  return apiCall(
    `/clean/preview-outliers/${jobId}?column=${encodeURIComponent(column)}&multiplier=${encodeURIComponent(multiplier)}`
  );
}

async function removeOutliersIQR(jobId, column, multiplier = 1.5) {
  return apiCall(
    `/clean/remove-outliers-iqr/${jobId}?column=${encodeURIComponent(column)}&multiplier=${encodeURIComponent(multiplier)}`,
    { method: 'POST' }
  );
}

async function capOutliers(jobId, column, lowerPercentile = 1, upperPercentile = 99) {
  return apiCall(`/clean/cap-outliers/${jobId}?column=${encodeURIComponent(column)}&lower_percentile=${lowerPercentile}&upper_percentile=${upperPercentile}`, { method: 'POST' });
}

// ============================================
// 5. DATA TYPE CONVERSION ENDPOINTS
// ============================================

async function toNumeric(jobId, column, errors = 'coerce') {
  return apiCall(`/clean/to-numeric/${jobId}?column=${encodeURIComponent(column)}&errors=${encodeURIComponent(errors)}`, { method: 'POST' });
}

async function toDatetime(jobId, column, format = null) {
  let url = `/clean/to-datetime/${jobId}?column=${encodeURIComponent(column)}`;
  if (format) url += `&format=${encodeURIComponent(format)}`;
  return apiCall(url, { method: 'POST' });
}

// ============================================
// 6. DATE OPERATIONS ENDPOINTS
// ============================================

async function extractYear(jobId, column, newColumn = null) {
  let url = `/clean/extract-year/${jobId}?column=${encodeURIComponent(column)}`;
  if (newColumn) url += `&new_column=${encodeURIComponent(newColumn)}`;
  return apiCall(url, { method: 'POST' });
}

async function extractMonth(jobId, column, newColumn = null) {
  let url = `/clean/extract-month/${jobId}?column=${encodeURIComponent(column)}`;
  if (newColumn) url += `&new_column=${encodeURIComponent(newColumn)}`;
  return apiCall(url, { method: 'POST' });
}

async function extractDay(jobId, column, newColumn = null) {
  let url = `/clean/extract-day/${jobId}?column=${encodeURIComponent(column)}`;
  if (newColumn) url += `&new_column=${encodeURIComponent(newColumn)}`;
  return apiCall(url, { method: 'POST' });
}

async function extractDayOfWeek(jobId, column, newColumn = null) {
  let url = `/clean/extract-dayofweek/${jobId}?column=${encodeURIComponent(column)}`;
  if (newColumn) url += `&new_column=${encodeURIComponent(newColumn)}`;
  return apiCall(url, { method: 'POST' });
}

async function calculateAge(jobId, birthColumn, referenceDate = null) {
  let url = `/clean/calculate-age/${jobId}?birth_column=${encodeURIComponent(birthColumn)}`;
  if (referenceDate) url += `&reference_date=${encodeURIComponent(referenceDate)}`;
  return apiCall(url, { method: 'POST' });
}

// ============================================
// 7. STRING OPERATIONS ENDPOINTS
// ============================================

async function splitColumn(jobId, column, delimiter = ' ', into = 2, newNames = null) {
  let url = `/clean/split-column/${jobId}?column=${encodeURIComponent(column)}&delimiter=${encodeURIComponent(delimiter)}&into=${into}`;
  if (newNames) url += `&new_names=${encodeURIComponent(newNames)}`;
  return apiCall(url, { method: 'POST' });
}

async function mergeColumns(jobId, columns, newColumn, delimiter = ' ', removeOriginal = true) {
  return apiCall(`/clean/merge-columns/${jobId}?columns=${encodeURIComponent(columns)}&new_column=${encodeURIComponent(newColumn)}&delimiter=${encodeURIComponent(delimiter)}&remove_original=${removeOriginal}`, { method: 'POST' });
}

async function findReplace(jobId, column, find, replace, useRegex = false) {
  return apiCall(`/clean/find-replace/${jobId}?column=${encodeURIComponent(column)}&find=${encodeURIComponent(find)}&replace=${encodeURIComponent(replace)}&regex=${useRegex}`, { method: 'POST' });
}

async function renameColumn(jobId, oldName, newName) {
  return apiCall(`/clean/rename-column/${jobId}?old_name=${encodeURIComponent(oldName)}&new_name=${encodeURIComponent(newName)}`, { method: 'POST' });
}

async function dropColumn(jobId, column) {
  return apiCall(`/clean/drop-column/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

// ============================================
// 8. EMAIL & PHONE ENDPOINTS
// ============================================

async function fixEmails(jobId, column) {
  return apiCall(`/clean/fix-emails/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

async function formatPhones(jobId, column) {
  return apiCall(`/clean/format-phones/${jobId}?column=${encodeURIComponent(column)}`, { method: 'POST' });
}

// ============================================
// 9. SMART & QUICK CLEAN ENDPOINTS
// ============================================

async function smartClean(jobId, options = {}) {
  const params = new URLSearchParams();
  if (options.profile) params.set('profile', options.profile);
  if (options.autoRemoveDuplicates !== undefined) params.set('auto_remove_duplicates', options.autoRemoveDuplicates);
  if (options.trimSpaces !== undefined) params.set('trim_spaces', options.trimSpaces);
  if (options.missingStrategy) params.set('missing_strategy', options.missingStrategy);
  if (options.enableDropThreshold !== undefined) params.set('enable_drop_threshold', options.enableDropThreshold);
  if (options.dropThreshold !== undefined) params.set('drop_threshold', options.dropThreshold);
  const qs = params.toString();
  return apiCall(`/smart-clean/${jobId}${qs ? `?${qs}` : ''}`, { method: 'POST' });
}

async function quickClean(jobId) {
  return apiCall(`/clean/quick/${jobId}`, { method: 'POST' });
}

// ============================================
// 10. UNDO ENDPOINT
// ============================================

async function undoLastAction(jobId) {
  return apiCall(`/clean/undo/${jobId}`, { method: 'POST' });
}

// ============================================
// 11. PROFILE, ANALYSIS, HISTORY ENDPOINTS
// ============================================

async function profileData(jobId) {
  return apiCall(`/profile/${jobId}`);
}

async function getAnalysis(jobId) {
  return apiCall(`/analyze/${jobId}`);
}

async function getJobs() {
  return apiCall('/jobs');
}

async function getJobHistory(jobId) {
  return apiCall(`/history/${jobId}`);
}

async function deleteJob(jobId) {
  return apiCall(`/jobs/${jobId}`, { method: 'DELETE' });
}

// ============================================
// 12. PREVIEW ACTION ENDPOINTS
// ============================================

async function previewAction(jobId, column, operation, value = null) {
  let url = `/clean/preview/${jobId}?column=${encodeURIComponent(column)}&operation=${encodeURIComponent(operation)}`;
  if (value) url += `&value=${encodeURIComponent(value)}`;
  return apiCall(url, { method: 'POST' });
}

// ============================================
// API SERVICE OBJECT
// ============================================

export const api = {
  uploadFile,
  downloadFile,
  profileData,
  smartClean,
  quickClean,
  undoLastAction,
  getAnalysis,
  getJobs,
  getJobHistory,
  deleteJob,
  fillMean,
  fillMedian,
  fillMode,
  fillConstant,
  fillForward,
  fillBackward,
  removeDuplicates,
  trimSpaces,
  toLowercase,
  toUppercase,
  toTitlecase,
  removeSpecialChars,
  fixEncoding,
  standardizeCategories,
  previewOutliers,
  removeOutliersIQR,
  capOutliers,
  toNumeric,
  toDatetime,
  extractYear,
  extractMonth,
  extractDay,
  extractDayOfWeek,
  calculateAge,
  splitColumn,
  mergeColumns,
  findReplace,
  renameColumn,
  dropColumn,
  fixEmails,
  formatPhones,
  previewAction,
  apiCall
};

// ============================================
// COLUMN TYPE MAPPINGS FOR UI
// ============================================

export const COLUMN_TYPE_LABELS = {
  'EMAIL': 'Email',
  'PHONE': 'Phone',
  'DATE': 'Date',
  'DATETIME': 'Date/Time',
  'CURRENCY': 'Currency',
  'NUMERIC': 'Number',
  'AGE': 'Age',
  'NAME': 'Name',
  'ADDRESS': 'Address',
  'CITY': 'City',
  'PROVINCE': 'Province/State',
  'GENDER': 'Gender',
  'CATEGORICAL': 'Category',
  'ID': 'Identifier',
  'URL': 'URL',
  'TEXT': 'Text',
  'BOOLEAN': 'Yes/No',
  'UNKNOWN': 'Unknown'
};

export const COLUMN_TYPE_COLORS = {
  'EMAIL': '#ef4444',
  'PHONE': '#0891b2',
  'DATE': '#8b5cf6',
  'DATETIME': '#8b5cf6',
  'CURRENCY': '#f59e0b',
  'NUMERIC': '#f97316',
  'AGE': '#3b82f6',
  'NAME': '#6366f1',
  'ADDRESS': '#4b5563',
  'CITY': '#06b6d4',
  'PROVINCE': '#14b8a6',
  'GENDER': '#7c3aed',
  'CATEGORICAL': '#ec4899',
  'ID': '#6b7280',
  'URL': '#10b981',
  'TEXT': '#64748b',
  'BOOLEAN': '#059669',
  'UNKNOWN': '#9ca3af'
};

export const COLUMN_TYPE_ICONS = {
  'EMAIL': '📧',
  'PHONE': '📞',
  'DATE': '📅',
  'DATETIME': '📅',
  'CURRENCY': '💰',
  'NUMERIC': '#️⃣',
  'AGE': '🎂',
  'NAME': '👤',
  'ADDRESS': '🏠',
  'CITY': '🏙️',
  'PROVINCE': '🗺️',
  'GENDER': '👥',
  'CATEGORICAL': '🏷️',
  'ID': '🆔',
  'URL': '🔗',
  'TEXT': '📝',
  'BOOLEAN': '✅',
  'UNKNOWN': '❓'
};

export default api;