// frontend/src/context/AppContext.jsx
// Global Application State Management

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

// Create Context
const AppContext = createContext();

// Custom hook to use context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Provider Component
export const AppProvider = ({ children }) => {
  // ============ Navigation State ============
  const [currentPage, setCurrentPage] = useState('upload'); // upload, dashboard, cleaner, analysis, history, settings

  // ============ Data State ============
  const [jobId, setJobId] = useState(null);
  const [filename, setFilename] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [totalRows, setTotalRows] = useState(0);
  const [totalColumns, setTotalColumns] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const [columnProfile, setColumnProfile] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [cleanedData, setCleanedData] = useState(null);

  // ============ UI State ============
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cleaningProgress, setCleaningProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // ============ Cleaning State ============
  const [cleaningHistory, setCleaningHistory] = useState(() => {
    const saved = localStorage.getItem('cleaningHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [pendingChanges, setPendingChanges] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [cleaningResults, setCleaningResults] = useState(null);

  // ============ Export State ============
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  // ============ Settings ============
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? JSON.parse(saved) : {
      autoSaveHistory: true,
      maxHistoryItems: 50,
      defaultExportFormat: 'csv',
      showColumnTypes: true,
      confirmBeforeClean: true,
      autoRefreshDashboard: true,
    };
  });

  // ============ Table State ============
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // ============ Toast Notification Helpers ============
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
  }, []);

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

  // ============ Data Actions ============

  // Clear all data (new upload)
  const clearData = useCallback(() => {
    setJobId(null);
    setFilename(null);
    setFileSize(null);
    setTotalRows(0);
    setTotalColumns(0);
    setQualityScore(0);
    setColumnProfile([]);
    setPreviewData([]);
    setCleanedData(null);
    setCleaningResults(null);
    setCurrentPageNum(1);
    setSearchTerm('');
    setCurrentPage('upload');
    showInfo('Data cleared. Ready for new upload.');
  }, [showInfo]);

  // Set upload data after successful upload
  const setUploadData = useCallback((data) => {
    setJobId(data.job_id);
    setFilename(data.filename);
    setFileSize(data.size);
    setTotalColumns(data.columns);
    showSuccess(`File "${data.filename}" uploaded successfully!`);
  }, [showSuccess]);

  // Set profile data after profiling
  const setProfileData = useCallback((data) => {
    setTotalRows(data.total_rows);
    setTotalColumns(data.total_columns);
    setQualityScore(data.quality_score);
    setColumnProfile(data.columns);
    setPreviewData(data.preview_data);
    showSuccess(`Data profiled: ${data.total_rows.toLocaleString()} rows, ${data.total_columns} columns`);
  }, [showSuccess]);

  // ============ History Actions ============

  // Add to cleaning history
  const addToHistory = useCallback((job) => {
    setCleaningHistory(prev => {
      const newHistory = [job, ...prev];
      const maxItems = settings.maxHistoryItems;
      const trimmedHistory = newHistory.slice(0, maxItems);
      if (settings.autoSaveHistory) {
        localStorage.setItem('cleaningHistory', JSON.stringify(trimmedHistory));
      }
      return trimmedHistory;
    });
    showSuccess('Job added to history');
  }, [settings.maxHistoryItems, settings.autoSaveHistory, showSuccess]);

  // Clear history
  const clearHistory = useCallback(() => {
    setCleaningHistory([]);
    localStorage.removeItem('cleaningHistory');
    showInfo('Cleaning history cleared');
  }, [showInfo]);

  // ============ Settings Actions ============

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('appSettings', JSON.stringify(updated));
      showSuccess('Settings updated');
      return updated;
    });
  }, [showSuccess]);

  // ============ Theme Actions ============

  // Toggle dark mode
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

  // Apply dark mode on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ============ Context Value ============
  const value = {
    // Navigation
    currentPage, setCurrentPage,

    // Data
    jobId, setJobId,
    filename, setFilename,
    fileSize, setFileSize,
    totalRows, setTotalRows,
    totalColumns, setTotalColumns,
    qualityScore, setQualityScore,
    columnProfile, setColumnProfile,
    previewData, setPreviewData,
    cleanedData, setCleanedData,

    // UI State
    isLoading, setIsLoading,
    uploadProgress, setUploadProgress,
    cleaningProgress, setCleaningProgress,
    darkMode, toggleDarkMode,

    // Toast Notifications
    showSuccess, showError, showInfo, showWarning,

    // Cleaning
    cleaningHistory, setCleaningHistory,
    pendingChanges, setPendingChanges,
    showReviewModal, setShowReviewModal,
    cleaningResults, setCleaningResults,

    // Export
    showExportModal, setShowExportModal,
    exportFormat, setExportFormat,

    // Settings
    settings, updateSettings,

    // Table
    currentPageNum, setCurrentPageNum,
    rowsPerPage, setRowsPerPage,
    sortColumn, setSortColumn,
    sortDirection, setSortDirection,
    searchTerm, setSearchTerm,

    // Actions
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