// frontend/src/context/AppContext.jsx
// Global Application State Management

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const SETTINGS_STORAGE_KEY = 'smart_cleaner_settings';

export const DEFAULT_SETTINGS = {
  version: '2.0',
  general: {
    defaultPage: 'upload',
    language: 'en',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '1,234.56',
    itemsPerPage: 50,
    autoSave: true
  },
  cleaning: {
    missingValueStrategy: 'median',
    enableDropThreshold: false,
    dropThreshold: 50,
    autoRemoveDuplicates: true,
    trimSpaces: true,
    lowercaseText: false,
    smartCleanProfile: 'balanced'
  },
  analysis: {
    defaultChartType: 'bar',
    enableAnimations: true,
    showAdvancedInsights: true,
    animationSpeed: 'normal'
  },
  appearance: {
    theme: 'system',
    accentColor: '#6366f1',
    fontSize: 'medium',
    enableGlassmorphism: true,
    reduceMotion: false
  },
  notifications: {
    cleaningComplete: true,
    showErrors: true,
    smartSuggestions: true,
    soundEnabled: false
  },
  privacy: {
    autoDeleteData: false,
    dataStorageLocation: 'server',
    shareAnalytics: false
  }
};

const loadPersistedSettings = () => {
  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      general: { ...DEFAULT_SETTINGS.general, ...parsed.general },
      cleaning: { ...DEFAULT_SETTINGS.cleaning, ...parsed.cleaning },
      analysis: { ...DEFAULT_SETTINGS.analysis, ...parsed.analysis },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
      privacy: { ...DEFAULT_SETTINGS.privacy, ...parsed.privacy }
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const AppProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState('upload');

  const [jobId, setJobId] = useState(null);
  const [filename, setFilename] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [totalRows, setTotalRows] = useState(0);
  const [totalColumns, setTotalColumns] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const [columnProfile, setColumnProfile] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [cleanedData, setCleanedData] = useState(null);

  // NEW: honest truncation tracking for the data table preview.
  // Set whenever the backend profile response includes
  // preview_truncated/preview_rows_shown (initial upload AND every
  // cleaning action afterward).
  const [previewTruncated, setPreviewTruncated] = useState(false);
  const [previewRowsShown, setPreviewRowsShown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cleaningProgress, setCleaningProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [cleaningHistory, setCleaningHistory] = useState(() => {
    const saved = localStorage.getItem('cleaningHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [pendingChanges, setPendingChanges] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [cleaningResults, setCleaningResults] = useState(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  const [settings, setSettings] = useState(loadPersistedSettings);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', settings.appearance.accentColor);
    document.documentElement.classList.toggle('reduce-motion', settings.appearance.reduceMotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySettings = useCallback((newSettings) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    setSettings(newSettings);
  }, []);

  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const showSuccess = useCallback((message) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
      icon: '✅',
      style: {
        background: 'var(--white)',
        color: 'var(--dark)',
        borderLeft: '4px solid var(--success)',
      },
    });
  }, []);

  const showError = useCallback((message) => {
    if (!settings.notifications.showErrors) {
      console.error('[Notifications disabled] Error:', message);
      return;
    }
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
      icon: '❌',
      style: {
        background: 'var(--white)',
        color: 'var(--dark)',
        borderLeft: '4px solid var(--error)',
      },
    });
  }, [settings.notifications.showErrors]);

  const showInfo = useCallback((message) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: 'var(--white)',
        color: 'var(--dark)',
        borderLeft: '4px solid var(--info)',
      },
    });
  }, []);

  const showWarning = useCallback((message) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: 'var(--white)',
        color: 'var(--dark)',
        borderLeft: '4px solid var(--warning)',
      },
    });
  }, []);

  const showCleaningComplete = useCallback((message) => {
    if (!settings.notifications.cleaningComplete) {
      console.log('[Cleaning-complete notifications disabled]', message);
      return;
    }
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
      icon: '✨',
      style: {
        background: 'var(--white)',
        color: 'var(--dark)',
        borderLeft: '4px solid var(--success)',
      },
    });
  }, [settings.notifications.cleaningComplete]);

  const clearData = useCallback(() => {
    setJobId(null);
    setFilename(null);
    setFileSize(null);
    setTotalRows(0);
    setTotalColumns(0);
    setQualityScore(0);
    setColumnProfile([]);
    setPreviewData([]);
    setPreviewTruncated(false);
    setPreviewRowsShown(0);
    setCleanedData(null);
    setCleaningResults(null);
    setCurrentPageNum(1);
    setSearchTerm('');
    setCurrentPage('upload');
    showInfo('Data cleared. Ready for new upload.');
  }, [showInfo]);

  const setUploadData = useCallback((data) => {
    setJobId(data.job_id);
    setFilename(data.filename);
    setFileSize(data.size);
    setTotalColumns(data.columns);
    showSuccess(`File "${data.filename}" uploaded successfully!`);
  }, [showSuccess]);

  const setProfileData = useCallback((data) => {
    setTotalRows(data.total_rows);
    setTotalColumns(data.total_columns);
    setQualityScore(data.quality_score);
    setColumnProfile(data.columns);
    setPreviewData(data.preview_data);
    // NEW: capture honest truncation info from the backend response.
    setPreviewTruncated(!!data.preview_truncated);
    setPreviewRowsShown(data.preview_rows_shown ?? data.preview_data?.length ?? 0);
    showSuccess(`Data profiled: ${data.total_rows.toLocaleString()} rows, ${data.total_columns} columns`);
  }, [showSuccess]);

  const addToHistory = useCallback((job) => {
    setCleaningHistory(prev => {
      const newHistory = [job, ...prev];
      const trimmedHistory = newHistory.slice(0, 50);
      localStorage.setItem('cleaningHistory', JSON.stringify(trimmedHistory));
      return trimmedHistory;
    });
    showSuccess('Job added to history');
  }, [showSuccess]);

  const clearHistory = useCallback(() => {
    setCleaningHistory([]);
    localStorage.removeItem('cleaningHistory');
    showInfo('Cleaning history cleared');
  }, [showInfo]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', newValue);
      if (newValue) {
        document.documentElement.classList.add('dark');
        showSuccess('Dark mode enabled');
      } else {
        document.documentElement.classList.remove('dark');
        showSuccess('Light mode enabled');
      }
      return newValue;
    });
  }, [showSuccess]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const value = {
    currentPage, setCurrentPage,
    jobId, setJobId,
    filename, setFilename,
    fileSize, setFileSize,
    totalRows, setTotalRows,
    totalColumns, setTotalColumns,
    qualityScore, setQualityScore,
    columnProfile, setColumnProfile,
    previewData, setPreviewData,
    // NEW
    previewTruncated, setPreviewTruncated,
    previewRowsShown, setPreviewRowsShown,
    cleanedData, setCleanedData,
    isLoading, setIsLoading,
    uploadProgress, setUploadProgress,
    cleaningProgress, setCleaningProgress,
    darkMode, toggleDarkMode,
    showSuccess, showError, showInfo, showWarning, showCleaningComplete,
    cleaningHistory, setCleaningHistory,
    pendingChanges, setPendingChanges,
    showReviewModal, setShowReviewModal,
    cleaningResults, setCleaningResults,
    showExportModal, setShowExportModal,
    exportFormat, setExportFormat,
    settings,
    applySettings,
    currentPageNum, setCurrentPageNum,
    rowsPerPage, setRowsPerPage,
    sortColumn, setSortColumn,
    sortDirection, setSortDirection,
    searchTerm, setSearchTerm,
    clearData,
    setUploadData,
    setProfileData,
    addToHistory,
    clearHistory,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;