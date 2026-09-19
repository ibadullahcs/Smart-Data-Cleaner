// frontend/src/pages/CleanerPage.jsx
// Complete Cleaner Page - Smart Clean + Column Actions + AI Assistant + Bulk Actions + Find & Replace

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { formatNumber, truncateText } from '../utils/formatters';
import { 
  Sparkles, RefreshCw, CheckCircle, AlertCircle, Database,
  Copy, Trash2, Type, Hash, Calendar, Mail, Phone,
  Layers, AlertTriangle, ChevronDown, ChevronUp, Settings,
  Eye, EyeOff, Download, Clock, Zap, Shield,
  Filter, Search, X,
  Undo, Redo, FileText,
  ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight,
  Loader2, History, Columns, Activity, Target,
  DollarSign, MapPin, Link, User, Home, Tag, Info,
  Bot, BarChart3, Scissors, MoreVertical, Edit3, TrendingUp,
  Brush, Wand2, Rocket, Wrench, Star, Award, Highlighter,
  CheckSquare, Square, Replace
} from 'lucide-react';
import Tooltip from '../components/Common/Tooltip';
import AIAssistant from '../components/AI/AIAssistant';
import ActionLog from '../components/Common/ActionLog';
import './CleanerPage.css';

// NEW: actions available in the Bulk Actions modal, mapped to the
// underlying per-column API call. Reuses the exact same backend
// endpoints every single-column action already uses — bulk just loops
// over selected columns and calls each sequentially.
const BULK_ACTIONS = [
  { value: 'trim_spaces', label: 'Trim Spaces', icon: Scissors },
  { value: 'lowercase', label: 'Convert to Lowercase', icon: Type },
  { value: 'uppercase', label: 'Convert to Uppercase', icon: Type },
  { value: 'titlecase', label: 'Convert to Title Case', icon: Edit3 },
  { value: 'remove_special', label: 'Remove Special Characters', icon: AlertCircle },
  { value: 'fix_encoding', label: 'Fix Encoding Issues', icon: RefreshCw },
  { value: 'standardize_categories', label: 'Standardize Values (F/f/Female → Female)', icon: Wand2 },
  { value: 'fill_missing', label: 'Fill Missing Values', icon: Hash },
  { value: 'to_numeric', label: 'Convert to Number', icon: Hash },
  { value: 'to_datetime', label: 'Convert to Date', icon: Calendar },
];

const CleanerPage = () => {
  const { 
    jobId, filename, totalRows, totalColumns, columnProfile,
    previewData, showSuccess, showError, showInfo, showCleaningComplete,
    setCurrentPage, settings,
    setTotalRows, setTotalColumns, setQualityScore, setColumnProfile, setPreviewData,
    previewTruncated, previewRowsShown, setPreviewTruncated, setPreviewRowsShown
  } = useApp();

  // ============ STATE ============
  const [isSmartCleaning, setIsSmartCleaning] = useState(false);
  const [actionLog, setActionLog] = useState([]);
  const [highlightChanges, setHighlightChanges] = useState(false);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(settings?.general?.itemsPerPage || 50);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('all');
  const [showActionLog, setShowActionLog] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [showColumnMenu, setShowColumnMenu] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [viewMode, setViewMode] = useState('current');
  const [changedCells, setChangedCells] = useState(new Set());
  const [smartCleanProgress, setSmartCleanProgress] = useState(null);
  const [showSmartCleanModal, setShowSmartCleanModal] = useState(false);
  const [previewDataState, setPreviewDataState] = useState(previewData);
  const [originalPreviewData, setOriginalPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [menuColumn, setMenuColumn] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [canUndo, setCanUndo] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  const [outlierModal, setOutlierModal] = useState(null);
  const [outlierMultiplier, setOutlierMultiplier] = useState(1.5);
  const [outlierPreview, setOutlierPreview] = useState(null);
  const [isLoadingOutlierPreview, setIsLoadingOutlierPreview] = useState(false);
  const [outlierPreviewError, setOutlierPreviewError] = useState(null);
  const [isRemovingOutliers, setIsRemovingOutliers] = useState(false);

  // NEW: Bulk Actions modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSelectedColumns, setBulkSelectedColumns] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('trim_spaces');
  const [bulkFillStrategy, setBulkFillStrategy] = useState('median');
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { current, total, columnName }
  const [bulkResults, setBulkResults] = useState(null); // [{ column, success, message, rowsAffected }]

  // NEW: Find & Replace modal state
  const [findReplaceModal, setFindReplaceModal] = useState(null); // { column } | null
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [isApplyingFindReplace, setIsApplyingFindReplace] = useState(false);
  const [findReplaceError, setFindReplaceError] = useState(null);

  const columnMenuRef = useRef(null);

  const buildSmartCleanOptions = () => ({
    profile: settings?.cleaning?.smartCleanProfile || 'balanced',
    autoRemoveDuplicates: settings?.cleaning?.autoRemoveDuplicates,
    trimSpaces: settings?.cleaning?.trimSpaces,
    missingStrategy: settings?.cleaning?.missingValueStrategy,
    enableDropThreshold: settings?.cleaning?.enableDropThreshold,
    dropThreshold: settings?.cleaning?.dropThreshold,
  });

  useEffect(() => {
    if (previewData && previewData.length > 0 && !originalPreviewData) {
      setOriginalPreviewData([...previewData]);
      setPreviewDataState(previewData);
    } else if (previewData && previewData.length > 0) {
      setPreviewDataState(previewData);
    }
  }, [previewData, originalPreviewData]);

  useEffect(() => {
    setCurrentPageNum(1);
  }, [searchTerm, viewFilter, viewMode]);

  useEffect(() => {
    if (!outlierModal || !jobId) return;

    let cancelled = false;
    setIsLoadingOutlierPreview(true);
    setOutlierPreviewError(null);

    const timer = setTimeout(async () => {
      try {
        const result = await api.previewOutliers(jobId, outlierModal.column, outlierMultiplier);
        if (!cancelled) setOutlierPreview(result);
      } catch (err) {
        if (!cancelled) {
          setOutlierPreview(null);
          setOutlierPreviewError(err.message || 'Could not analyze outliers for this column.');
        }
      } finally {
        if (!cancelled) setIsLoadingOutlierPreview(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [outlierModal, outlierMultiplier, jobId]);

  const columns = useMemo(() => {
    if (!columnProfile || columnProfile.length === 0) return [];
    return columnProfile.map(col => ({
      name: col.name,
      type: col.detected_type,
      missingPercent: col.null_percent || 0,
      missingCount: col.null_count || 0,
      uniqueCount: col.unique_count || 0,
      health: 100 - (col.null_percent || 0),
      issues: col.issues || []
    }));
  }, [columnProfile]);

  const overallHealth = useMemo(() => {
    if (columns.length === 0) return 100;
    const avgHealth = columns.reduce((sum, col) => sum + col.health, 0) / columns.length;
    return Math.round(avgHealth);
  }, [columns]);

  const sourceData = useMemo(() => {
    if (viewMode === 'original' && originalPreviewData) {
      return originalPreviewData;
    }
    return previewDataState;
  }, [viewMode, originalPreviewData, previewDataState]);

  const visibleRows = useMemo(() => {
    if (!sourceData) return [];

    const term = searchTerm.trim().toLowerCase();

    return sourceData
      .map((row, idx) => ({ row, idx }))
      .filter(({ row, idx }) => {
        if (term) {
          const matchesSearch = Object.values(row).some(v => {
            if (v === null || v === undefined) return false;
            return String(v).toLowerCase().includes(term);
          });
          if (!matchesSearch) return false;
        }
        if (viewFilter === 'changed' && !changedCells.has(idx)) {
          return false;
        }
        return true;
      });
  }, [sourceData, searchTerm, viewFilter, changedCells]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / rowsPerPage));

  const paginatedRows = useMemo(() => {
    const start = (currentPageNum - 1) * rowsPerPage;
    return visibleRows.slice(start, start + rowsPerPage);
  }, [visibleRows, currentPageNum, rowsPerPage]);

  const findChangedCells = (oldData, newData, cols) => {
    const changes = [];
    if (!oldData || !newData) return changes;
    
    for (let i = 0; i < Math.min(oldData.length, newData.length); i++) {
      const oldRow = oldData[i];
      const newRow = newData[i];
      
      for (const col of cols) {
        const oldVal = oldRow[col];
        const newVal = newRow[col];
        
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({
            row: i + 1,
            column: col,
            old_value: oldVal === null || oldVal === undefined || oldVal === '' ? '(empty)' : String(oldVal).substring(0, 100),
            new_value: newVal === null || newVal === undefined || newVal === '' ? '(empty)' : String(newVal).substring(0, 100)
          });
        }
      }
    }
    return changes;
  };

  const applyChangedCellsHighlight = (changedCellsList) => {
    const newSet = new Set();
    changedCellsList.forEach(c => {
      const rowIdx = c.row - 1;
      newSet.add(rowIdx);
      newSet.add(`${rowIdx}|${c.column}`);
    });
    setChangedCells(newSet);
    setHighlightChanges(true);
  };

  const syncProfileToAppContext = (refreshedProfile) => {
    setTotalRows(refreshedProfile.total_rows);
    setTotalColumns(refreshedProfile.total_columns);
    setQualityScore(refreshedProfile.quality_score);
    setColumnProfile(refreshedProfile.columns);
    setPreviewData(refreshedProfile.preview_data);
    setPreviewTruncated(!!refreshedProfile.preview_truncated);
    setPreviewRowsShown(refreshedProfile.preview_rows_shown ?? refreshedProfile.preview_data?.length ?? 0);
  };

  const getUpdatedProfile = async (result) => {
    if (result && result.profile) {
      return result.profile;
    }
    return await api.profileData(jobId);
  };

  // ============ SMART CLEAN ============
  const handleSmartClean = async () => {
    if (!jobId) {
      showError('No file uploaded');
      return;
    }

    setIsSmartCleaning(true);
    setShowSmartCleanModal(true);
    
    const steps = [
      { id: 'analyze', label: 'Analyzing data', status: 'pending' },
      { id: 'duplicates', label: 'Removing duplicates', status: 'pending' },
      { id: 'text', label: 'Cleaning text columns', status: 'pending' },
      { id: 'missing', label: 'Filling missing values', status: 'pending' },
      { id: 'complete', label: 'Completing cleaning', status: 'pending' }
    ];

    setSmartCleanProgress({ step: 1, message: 'Analyzing data...', steps });

    try {
      for (let i = 0; i < steps.length - 1; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setSmartCleanProgress(prev => ({
          ...prev,
          step: i + 2,
          message: steps[i].label,
          steps: prev.steps.map((s, idx) => 
            idx === i ? { ...s, status: 'completed' } : 
            idx === i + 1 ? { ...s, status: 'loading' } : s
          )
        }));
      }

      const beforeData = previewDataState ? [...previewDataState] : [];
      const beforeColumns = columns.map(c => c.name);
      
      const results = await api.smartClean(jobId, buildSmartCleanOptions());
      
      const refreshedProfile = await getUpdatedProfile(results);
      const afterData = refreshedProfile.preview_data;
      setPreviewDataState(afterData);
      syncProfileToAppContext(refreshedProfile);
      
      const changedCellsList = findChangedCells(beforeData, afterData, beforeColumns);
      applyChangedCellsHighlight(changedCellsList);
      
      const newAction = {
        id: Date.now(),
        operation: 'Smart Clean',
        operation_type: 'smart_clean',
        status: 'success',
        timestamp: new Date(),
        totalChanges: results.changes_count || changedCellsList.length,
        rowsAffected: results.rows_affected || changedCellsList.length,
        operationsPerformed: results.operations_performed || [
          { operation: 'remove_duplicates', rows: results.rows_affected },
          { operation: 'clean_text', rows: results.changes_count }
        ],
        changedCells: changedCellsList.slice(0, 200),
        healthScoreBefore: results.health_score_before || overallHealth,
        healthScoreAfter: results.health_score_after || null,
        message: results.message || `Smart cleaning completed. ${results.changes_count || changedCellsList.length} changes made.`
      };
      
      setActionLog(prev => [newAction, ...prev]);
      setShowActionLog(true);
      setCurrentAction(newAction);
      setCanUndo(true);
      
      showCleaningComplete(newAction.message);
      
      setTimeout(() => {
        setShowSmartCleanModal(false);
        setSmartCleanProgress(null);
      }, 1500);
      
    } catch (err) {
      console.error('Smart Clean error:', err);
      showError(err.message || 'Smart Clean failed');
      setShowSmartCleanModal(false);
    } finally {
      setIsSmartCleaning(false);
    }
  };

  // ============ OUTLIER PREVIEW FLOW ============
  const openOutlierModal = (columnName) => {
    setShowColumnMenu(null);
    setOutlierPreview(null);
    setOutlierPreviewError(null);
    setOutlierMultiplier(1.5);
    setOutlierModal({ column: columnName });
  };

  const closeOutlierModal = () => {
    if (isRemovingOutliers) return;
    setOutlierModal(null);
    setOutlierPreview(null);
    setOutlierPreviewError(null);
  };

  const confirmRemoveOutliers = async () => {
    if (!outlierModal || !outlierPreview || outlierPreview.outlier_count === 0) return;

    const columnName = outlierModal.column;
    setIsRemovingOutliers(true);

    const beforeData = previewDataState ? [...previewDataState] : [];
    const beforeColumns = columns.map(c => c.name);

    try {
      const result = await api.removeOutliersIQR(jobId, columnName, outlierMultiplier);

      const refreshedProfile = await getUpdatedProfile(result);
      const afterData = refreshedProfile.preview_data;
      setPreviewDataState(afterData);
      syncProfileToAppContext(refreshedProfile);

      const changedCellsList = findChangedCells(beforeData, afterData, beforeColumns);
      applyChangedCellsHighlight(changedCellsList);

      const successMessage = result.message || `Removed ${result.rows_removed} outlier rows from "${columnName}"`;
      const newAction = {
        id: Date.now(),
        operation: 'Remove Outliers',
        operation_type: 'remove_outliers',
        column: columnName,
        status: 'success',
        timestamp: new Date(),
        totalChanges: result.rows_removed || 0,
        rowsAffected: result.rows_removed || 0,
        operationsPerformed: [{
          operation: 'remove_outliers',
          column: columnName,
          rows: result.rows_removed || 0
        }],
        changedCells: changedCellsList.slice(0, 200),
        message: successMessage
      };

      setActionLog(prev => [newAction, ...prev]);
      setCurrentAction(newAction);
      setShowActionLog(true);
      setCanUndo(true);
      showSuccess(successMessage);

      setOutlierModal(null);
      setOutlierPreview(null);
    } catch (err) {
      console.error('Remove outliers failed:', err);
      showError(err.message || 'Failed to remove outliers');
    } finally {
      setIsRemovingOutliers(false);
    }
  };

  // ============ FIND & REPLACE (NEW) ============
  // Exposes the backend's fully-working find_replace endpoint, which
  // previously had NO UI entry point anywhere — a confirmed-dead
  // capability from the user's side despite being complete on the
  // backend.
  const openFindReplaceModal = (columnName) => {
    setShowColumnMenu(null);
    setFindText('');
    setReplaceText('');
    setUseRegex(false);
    setFindReplaceError(null);
    setFindReplaceModal({ column: columnName });
  };

  const closeFindReplaceModal = () => {
    if (isApplyingFindReplace) return;
    setFindReplaceModal(null);
  };

  const applyFindReplace = async () => {
    if (!findReplaceModal || !findText) return;

    setFindReplaceError(null);
    setIsApplyingFindReplace(true);

    const columnName = findReplaceModal.column;
    const beforeData = previewDataState ? [...previewDataState] : [];
    const beforeColumns = columns.map(c => c.name);

    try {
      const result = await api.findReplace(jobId, columnName, findText, replaceText, useRegex);

      const refreshedProfile = await getUpdatedProfile(result);
      const afterData = refreshedProfile.preview_data;
      setPreviewDataState(afterData);
      syncProfileToAppContext(refreshedProfile);

      const changedCellsList = findChangedCells(beforeData, afterData, beforeColumns);
      applyChangedCellsHighlight(changedCellsList);

      const successMessage = result.message || `Replaced in ${result.rows_affected} cells in "${columnName}"`;
      const newAction = {
        id: Date.now(),
        operation: 'Find & Replace',
        operation_type: 'find_replace',
        column: columnName,
        status: 'success',
        timestamp: new Date(),
        totalChanges: result.rows_affected || 0,
        rowsAffected: result.rows_affected || 0,
        operationsPerformed: [{
          operation: 'find_replace',
          column: columnName,
          rows: result.rows_affected || 0
        }],
        changedCells: changedCellsList.slice(0, 200),
        message: successMessage
      };

      setActionLog(prev => [newAction, ...prev]);
      setCurrentAction(newAction);
      setShowActionLog(true);
      setCanUndo(true);
      showSuccess(successMessage);

      setFindReplaceModal(null);
    } catch (err) {
      console.error('Find & Replace failed:', err);
      // Regex errors from the backend surface here — shown inline in
      // the modal instead of just a toast, since the user needs to
      // see it right next to the pattern they typed to fix it.
      setFindReplaceError(err.message || 'Find & Replace failed. Check your pattern is valid.');
    } finally {
      setIsApplyingFindReplace(false);
    }
  };

  // ============ BULK ACTIONS (NEW) ============
  const openBulkModal = () => {
    setBulkSelectedColumns(new Set());
    setBulkAction('trim_spaces');
    setBulkFillStrategy('median');
    setBulkResults(null);
    setBulkProgress(null);
    setShowBulkModal(true);
  };

  const closeBulkModal = () => {
    if (isBulkRunning) return;
    setShowBulkModal(false);
    setBulkResults(null);
  };

  const toggleBulkColumn = (columnName) => {
    setBulkSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnName)) next.delete(columnName);
      else next.add(columnName);
      return next;
    });
  };

  const toggleBulkSelectAll = () => {
    if (bulkSelectedColumns.size === columns.length) {
      setBulkSelectedColumns(new Set());
    } else {
      setBulkSelectedColumns(new Set(columns.map(c => c.name)));
    }
  };

  // Single dispatcher used by the bulk loop below — mirrors the
  // switch in handleColumnAction but returns a result object instead
  // of touching component state directly, since the loop needs to run
  // many of these back-to-back before doing one final UI update.
  const callSingleColumnAction = async (columnName, action) => {
    switch (action) {
      case 'trim_spaces': return api.trimSpaces(jobId, columnName);
      case 'lowercase': return api.toLowercase(jobId, columnName);
      case 'uppercase': return api.toUppercase(jobId, columnName);
      case 'titlecase': return api.toTitlecase(jobId, columnName);
      case 'remove_special': return api.removeSpecialChars(jobId, columnName);
      case 'fix_encoding': return api.fixEncoding(jobId, columnName);
      case 'standardize_categories': return api.standardizeCategories(jobId, columnName);
      case 'fill_missing': {
        if (bulkFillStrategy === 'mean') return api.fillMean(jobId, columnName);
        if (bulkFillStrategy === 'mode') return api.fillMode(jobId, columnName);
        return api.fillMedian(jobId, columnName);
      }
      case 'to_numeric': return api.toNumeric(jobId, columnName);
      case 'to_datetime': return api.toDatetime(jobId, columnName);
      default: throw new Error(`Unknown bulk action: ${action}`);
    }
  };

  const runBulkAction = async () => {
    if (bulkSelectedColumns.size === 0) {
      showError('Select at least one column');
      return;
    }

    setIsBulkRunning(true);
    const targetColumns = Array.from(bulkSelectedColumns);
    const results = [];

    const beforeData = previewDataState ? [...previewDataState] : [];
    const beforeColumns = columns.map(c => c.name);
    let lastGoodProfile = null;

    for (let i = 0; i < targetColumns.length; i++) {
      const columnName = targetColumns[i];
      setBulkProgress({ current: i + 1, total: targetColumns.length, columnName });

      try {
        const result = await callSingleColumnAction(columnName, bulkAction);
        const rowsAffected = result.rows_affected ?? result.rows_removed ?? result.invalid_count ?? 0;
        results.push({
          column: columnName,
          success: true,
          rowsAffected,
          message: result.message || 'Done'
        });
        if (result.profile) lastGoodProfile = result.profile;
      } catch (err) {
        // A single column failing (e.g. "Fill Missing" on a purely
        // text column with nothing numeric to fill) doesn't stop the
        // rest of the batch — every column gets its own honest
        // success/failure entry in the results list shown afterward.
        results.push({
          column: columnName,
          success: false,
          rowsAffected: 0,
          message: err.message || 'Failed'
        });
      }
    }

    // One final profile refresh, from the freshest data on disk —
    // more reliable than trusting the last loop iteration's response
    // if that particular column happened to fail.
    let refreshedProfile;
    try {
      refreshedProfile = lastGoodProfile || await api.profileData(jobId);
    } catch {
      refreshedProfile = null;
    }

    if (refreshedProfile) {
      const afterData = refreshedProfile.preview_data;
      setPreviewDataState(afterData);
      syncProfileToAppContext(refreshedProfile);

      const changedCellsList = findChangedCells(beforeData, afterData, beforeColumns);
      applyChangedCellsHighlight(changedCellsList);
    }

    const totalRowsAffected = results.reduce((sum, r) => sum + (r.rowsAffected || 0), 0);
    const succeededCount = results.filter(r => r.success).length;
    const actionLabel = BULK_ACTIONS.find(a => a.value === bulkAction)?.label || bulkAction;

    const newAction = {
      id: Date.now(),
      operation: `Bulk: ${actionLabel}`,
      operation_type: 'bulk_action',
      status: succeededCount === results.length ? 'success' : 'partial',
      timestamp: new Date(),
      totalChanges: totalRowsAffected,
      rowsAffected: totalRowsAffected,
      operationsPerformed: results.map(r => ({
        operation: bulkAction,
        column: r.column,
        rows: r.rowsAffected
      })),
      changedCells: [],
      message: `${actionLabel} applied to ${succeededCount}/${results.length} columns — ${formatNumber(totalRowsAffected)} total changes. Note: only the last column processed can be undone.`
    };

    setActionLog(prev => [newAction, ...prev]);
    setCurrentAction(newAction);
    setShowActionLog(true);
    setCanUndo(true); // backend's single undo slot now holds the LAST column processed
    setBulkResults(results);
    setBulkProgress(null);
    setIsBulkRunning(false);

    if (succeededCount === results.length) {
      showSuccess(`Bulk action complete: ${succeededCount} columns updated`);
    } else {
      showInfo(`Bulk action finished: ${succeededCount} succeeded, ${results.length - succeededCount} failed — see details`);
    }
  };

  // ============ COLUMN ACTION HANDLER ============
  const handleColumnAction = async (columnName, actionType, customValue = null) => {
    if (!jobId) {
      showError('No active job');
      return;
    }

    if (actionType === 'remove_outliers') {
      openOutlierModal(columnName);
      return;
    }

    if (actionType === 'find_replace') {
      openFindReplaceModal(columnName);
      return;
    }
    
    setIsLoading(true);
    setShowColumnMenu(null);
    
    const beforeData = previewDataState ? [...previewDataState] : [];
    const beforeColumns = columns.map(c => c.name);
    
    try {
      let result;
      let successMessage = '';
      let operationName = '';
      
      switch (actionType) {
        case 'trim_spaces':
          result = await api.trimSpaces(jobId, columnName);
          successMessage = `Trimmed spaces in "${columnName}" - ${result.rows_affected} cells affected`;
          operationName = 'Trim Spaces';
          break;
        case 'lowercase':
          result = await api.toLowercase(jobId, columnName);
          successMessage = `Converted "${columnName}" to lowercase - ${result.rows_affected} cells affected`;
          operationName = 'Convert to Lowercase';
          break;
        case 'uppercase':
          result = await api.toUppercase(jobId, columnName);
          successMessage = `Converted "${columnName}" to uppercase - ${result.rows_affected} cells affected`;
          operationName = 'Convert to Uppercase';
          break;
        case 'titlecase':
          result = await api.toTitlecase(jobId, columnName);
          successMessage = `Converted "${columnName}" to title case - ${result.rows_affected} cells affected`;
          operationName = 'Convert to Title Case';
          break;
        case 'fill_mean':
          result = await api.fillMean(jobId, columnName);
          successMessage = `Filled ${result.rows_affected} missing values with mean in "${columnName}"`;
          operationName = 'Fill Missing with Mean';
          break;
        case 'fill_median':
          result = await api.fillMedian(jobId, columnName);
          successMessage = `Filled ${result.rows_affected} missing values with median in "${columnName}"`;
          operationName = 'Fill Missing with Median';
          break;
        case 'fill_mode':
          result = await api.fillMode(jobId, columnName);
          successMessage = `Filled ${result.rows_affected} missing values with mode in "${columnName}"`;
          operationName = 'Fill Missing with Mode';
          break;
        case 'fill_constant':
          const value = customValue || prompt('Enter value to fill missing cells:');
          if (!value) { setIsLoading(false); return; }
          result = await api.fillConstant(jobId, columnName, value);
          successMessage = `Filled ${result.rows_affected} missing values with "${value}" in "${columnName}"`;
          operationName = 'Fill Missing with Custom Value';
          break;
        case 'remove_duplicates':
          result = await api.removeDuplicates(jobId);
          successMessage = `Removed ${result.rows_removed} duplicate rows`;
          operationName = 'Remove Duplicates';
          break;
        case 'remove_special':
          result = await api.removeSpecialChars(jobId, columnName);
          successMessage = `Removed special characters from ${result.rows_affected} cells in "${columnName}"`;
          operationName = 'Remove Special Characters';
          break;
        case 'fix_encoding':
          result = await api.fixEncoding(jobId, columnName);
          successMessage = `Fixed encoding for ${result.rows_affected} cells in "${columnName}"`;
          operationName = 'Fix Encoding Issues';
          break;
        case 'standardize_categories':
          result = await api.standardizeCategories(jobId, columnName);
          successMessage = `Standardized ${result.rows_affected} values in "${columnName}" (${result.mode_used} normalization)`;
          operationName = 'Standardize Values';
          break;
        case 'fix_emails':
          result = await api.fixEmails(jobId, columnName);
          successMessage = `Validated emails: ${result.valid_count} valid, ${result.invalid_count} invalid`;
          operationName = 'Fix Email Addresses';
          break;
        case 'format_phones':
          result = await api.formatPhones(jobId, columnName);
          successMessage = `Formatted ${result.rows_affected} phone numbers in "${columnName}"`;
          operationName = 'Format Phone Numbers';
          break;
        case 'to_numeric':
          result = await api.toNumeric(jobId, columnName);
          successMessage = `Converted "${columnName}" to numeric - ${result.invalid_count} values could not be converted`;
          operationName = 'Convert to Number';
          break;
        case 'to_datetime':
          result = await api.toDatetime(jobId, columnName);
          successMessage = `Converted "${columnName}" to date - ${result.invalid_count} values could not be converted`;
          operationName = 'Convert to Date';
          break;
        default:
          showError(`Unknown action: ${actionType}`);
          setIsLoading(false);
          return;
      }
      
      showSuccess(successMessage);
      
      const refreshedProfile = await getUpdatedProfile(result);
      const afterData = refreshedProfile.preview_data;
      setPreviewDataState(afterData);
      syncProfileToAppContext(refreshedProfile);
      
      const changedCellsList = findChangedCells(beforeData, afterData, beforeColumns);
      applyChangedCellsHighlight(changedCellsList);
      
      const newAction = {
        id: Date.now(),
        operation: operationName,
        operation_type: actionType,
        column: columnName,
        status: 'success',
        timestamp: new Date(),
        totalChanges: result.rows_affected || result.rows_removed || result.invalid_count || changedCellsList.length,
        rowsAffected: result.rows_affected || result.rows_removed || result.invalid_count || 0,
        operationsPerformed: [{ operation: actionType, column: columnName, rows: result.rows_affected || result.rows_removed || 0 }],
        changedCells: changedCellsList.slice(0, 200),
        message: successMessage
      };
      
      setActionLog(prev => [newAction, ...prev]);
      setCurrentAction(newAction);
      setShowActionLog(true);
      setCanUndo(true);
      
    } catch (error) {
      console.error('Action failed:', error);
      showError(error.message || 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ AI ACTION HANDLER ============
  const handleAIAction = async (action, params) => {
    const beforeData = previewDataState ? [...previewDataState] : [];
    const beforeColumns = columns.map(c => c.name);
    
    try {
      let result = { success: false, message: '', rowsAffected: 0 };
      const startTime = Date.now();
      
      const parts = action.split(':');
      const actionType = parts[0];
      const column = parts[1] || params?.column;
      const method = parts[2] || params?.method;
      
      switch (actionType) {
        case 'smart_clean':
          result = await api.smartClean(jobId, buildSmartCleanOptions());
          result.operation_name = 'Smart Clean';
          break;
        case 'quick_clean':
          result = await api.quickClean(jobId);
          result.operation_name = 'Quick Clean';
          break;
        case 'remove_duplicates': {
          const cleanResult = await api.removeDuplicates(jobId);
          result = {
            success: true,
            message: `Removed ${cleanResult.rows_removed} duplicate rows`,
            rowsAffected: cleanResult.rows_removed,
            operation_name: 'Remove Duplicates',
            profile: cleanResult.profile
          };
          break;
        }
        case 'trim_spaces': {
          const trimResult = await api.trimSpaces(jobId, column || 'all');
          result = {
            success: true,
            message: trimResult.message || `Trimmed spaces from ${trimResult.rows_affected} cells`,
            rowsAffected: trimResult.rows_affected,
            operation_name: 'Trim Spaces',
            column: column || 'all columns',
            profile: trimResult.profile
          };
          break;
        }
        case 'lowercase': {
          const lowerResult = await api.toLowercase(jobId, column || 'all');
          result = {
            success: true,
            message: lowerResult.message || `Converted ${lowerResult.rows_affected} cells to lowercase`,
            rowsAffected: lowerResult.rows_affected,
            operation_name: 'Convert to Lowercase',
            column: column || 'all columns',
            profile: lowerResult.profile
          };
          break;
        }
        case 'uppercase': {
          const upperResult = await api.toUppercase(jobId, column || 'all');
          result = {
            success: true,
            message: upperResult.message || `Converted ${upperResult.rows_affected} cells to uppercase`,
            rowsAffected: upperResult.rows_affected,
            operation_name: 'Convert to Uppercase',
            column: column || 'all columns',
            profile: upperResult.profile
          };
          break;
        }
        case 'titlecase': {
          const titleResult = await api.toTitlecase(jobId, column);
          result = {
            success: true,
            message: titleResult.message || `Converted ${titleResult.rows_affected} cells to title case`,
            rowsAffected: titleResult.rows_affected,
            operation_name: 'Convert to Title Case',
            column: column,
            profile: titleResult.profile
          };
          break;
        }
        case 'fill_mean': {
          if (!column) { result = { success: false, message: 'Please specify a column to fill.', rowsAffected: 0 }; break; }
          const fillMeanResult = await api.fillMean(jobId, column);
          result = {
            success: true,
            message: `Filled ${fillMeanResult.rows_affected} missing values in "${column}" with mean`,
            rowsAffected: fillMeanResult.rows_affected,
            operation_name: 'Fill Missing with Mean',
            column: column,
            profile: fillMeanResult.profile
          };
          break;
        }
        case 'fill_median': {
          if (!column) { result = { success: false, message: 'Please specify a column to fill.', rowsAffected: 0 }; break; }
          const fillMedianResult = await api.fillMedian(jobId, column);
          result = {
            success: true,
            message: `Filled ${fillMedianResult.rows_affected} missing values in "${column}" with median`,
            rowsAffected: fillMedianResult.rows_affected,
            operation_name: 'Fill Missing with Median',
            column: column,
            profile: fillMedianResult.profile
          };
          break;
        }
        case 'fill_mode': {
          if (!column) { result = { success: false, message: 'Please specify a column to fill.', rowsAffected: 0 }; break; }
          const fillModeResult = await api.fillMode(jobId, column);
          result = {
            success: true,
            message: `Filled ${fillModeResult.rows_affected} missing values in "${column}" with mode`,
            rowsAffected: fillModeResult.rows_affected,
            operation_name: 'Fill Missing with Mode',
            column: column,
            profile: fillModeResult.profile
          };
          break;
        }
        case 'to_numeric': {
          if (!column) { result = { success: false, message: 'Please specify a column to convert.', rowsAffected: 0 }; break; }
          const toNumericResult = await api.toNumeric(jobId, column);
          result = {
            success: true,
            message: `Converted "${column}" to numeric - ${toNumericResult.invalid_count} values could not be converted`,
            rowsAffected: toNumericResult.invalid_count,
            operation_name: 'Convert to Number',
            column: column,
            profile: toNumericResult.profile
          };
          break;
        }
        case 'to_datetime': {
          if (!column) { result = { success: false, message: 'Please specify a column to convert.', rowsAffected: 0 }; break; }
          const toDatetimeResult = await api.toDatetime(jobId, column);
          result = {
            success: true,
            message: `Converted "${column}" to date - ${toDatetimeResult.invalid_count} values could not be converted`,
            rowsAffected: toDatetimeResult.invalid_count,
            operation_name: 'Convert to Date',
            column: column,
            profile: toDatetimeResult.profile
          };
          break;
        }
        case 'fill_missing': {
          if (column && method) {
            let fillResult;
            if (method === 'mean') fillResult = await api.fillMean(jobId, column);
            else if (method === 'median') fillResult = await api.fillMedian(jobId, column);
            else if (method === 'mode') fillResult = await api.fillMode(jobId, column);
            else throw new Error(`Unknown fill method: ${method}`);
            
            result = {
              success: true,
              message: `Filled ${fillResult.rows_affected} missing values in "${column}" with ${method}`,
              rowsAffected: fillResult.rows_affected,
              operation_name: `Fill Missing with ${method.charAt(0).toUpperCase() + method.slice(1)}`,
              column: column,
              profile: fillResult.profile
            };
          } else {
            result = { success: false, message: 'Please specify a column and method', rowsAffected: 0 };
          }
          break;
        }
        case 'fix_emails': {
          const emailColumn = columns.find(c => c.type === 'EMAIL' || c.name.toLowerCase().includes('email'))?.name;
          if (!emailColumn) { result = { success: false, message: 'No email column found', rowsAffected: 0 }; break; }
          const emailResult = await api.fixEmails(jobId, emailColumn);
          result = {
            success: true,
            message: `Validated emails: ${emailResult.valid_count} valid, ${emailResult.invalid_count} invalid`,
            rowsAffected: emailResult.invalid_count,
            operation_name: 'Fix Email Addresses',
            column: emailColumn,
            profile: emailResult.profile
          };
          break;
        }
        case 'format_phones': {
          const phoneColumn = columns.find(c => c.type === 'PHONE' || c.name.toLowerCase().includes('phone'))?.name;
          if (!phoneColumn) { result = { success: false, message: 'No phone column found', rowsAffected: 0 }; break; }
          const phoneResult = await api.formatPhones(jobId, phoneColumn);
          result = {
            success: true,
            message: `Formatted ${phoneResult.rows_affected} phone numbers`,
            rowsAffected: phoneResult.rows_affected,
            operation_name: 'Format Phone Numbers',
            column: phoneColumn,
            profile: phoneResult.profile
          };
          break;
        }
        case 'extract_year': {
          const yearResult = await api.extractYear(jobId, column);
          result = {
            success: true, message: `Extracted year from "${column}"`, rowsAffected: 0,
            operation_name: 'Extract Year', column: column, profile: yearResult.profile
          };
          break;
        }
        case 'calculate_age': {
          const ageResult = await api.calculateAge(jobId, column);
          result = {
            success: true, message: `Calculated age from "${column}"`, rowsAffected: 0,
            operation_name: 'Calculate Age', column: column, profile: ageResult.profile
          };
          break;
        }
        case 'remove_outliers': {
          if (!column) { result = { success: false, message: 'Please specify a column', rowsAffected: 0 }; break; }
          openOutlierModal(column);
          setShowAIAssistant(false);
          return {
            success: true,
            message: `Opened the outlier review for "${column}" — check the preview, then confirm to remove.`,
            rowsAffected: 0, timeMs: 0
          };
        }
        case 'undo':
          await handleUndo();
          return { success: true, message: 'Handled via handleUndo', rowsAffected: 0, timeMs: 0 };
        default:
          result = { success: false, message: `Unknown action: ${actionType}`, rowsAffected: 0 };
      }
      
      if (result.success && actionType !== 'undo') {
        const refreshedProfile = await getUpdatedProfile(result);
        const afterData = refreshedProfile.preview_data;
        setPreviewDataState(afterData);
        syncProfileToAppContext(refreshedProfile);
        
        const changedCellsList = findChangedCells(beforeData, afterData, beforeColumns);
        applyChangedCellsHighlight(changedCellsList);
        
        const newAction = {
          id: Date.now(),
          operation: result.operation_name || actionType,
          operation_type: actionType,
          column: result.column,
          status: 'success',
          timestamp: new Date(),
          totalChanges: result.rowsAffected || changedCellsList.length,
          rowsAffected: result.rowsAffected || 0,
          operationsPerformed: [{ operation: actionType, rows: result.rowsAffected || 0 }],
          changedCells: changedCellsList.slice(0, 200),
          message: result.message
        };
        
        setActionLog(prev => [newAction, ...prev]);
        setShowActionLog(true);
        setCurrentAction(newAction);
        setCanUndo(true);
      }
      
      result.timeMs = Date.now() - startTime;
      return result;
      
    } catch (error) {
      console.error('AI Action error:', error);
      return { success: false, message: error.message, rowsAffected: 0, timeMs: 0 };
    }
  };

  // ============ REAL UNDO ============
  const handleUndo = async () => {
    if (!jobId || !canUndo || actionLog.length === 0 || isUndoing) return;

    const lastAction = actionLog[0];
    const confirmMessage = lastAction.operation_type === 'bulk_action'
      ? `Undo "${lastAction.operation}"? Only the LAST column processed in this bulk action will be reverted — the others will stay as changed.`
      : `Undo "${lastAction.operation}"? This will restore your data to how it was immediately before that action.`;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setIsUndoing(true);
    try {
      const result = await api.undoLastAction(jobId);

      const refreshedProfile = await getUpdatedProfile(result);
      setPreviewDataState(refreshedProfile.preview_data);
      syncProfileToAppContext(refreshedProfile);

      setActionLog(prev => prev.slice(1));
      setCanUndo(false);
      setShowActionLog(false);
      setCurrentAction(null);
      setChangedCells(new Set());
      setHighlightChanges(false);

      showSuccess(`Undid: ${lastAction.operation}`);
    } catch (err) {
      console.error('Undo failed:', err);
      showError(err.message || 'Undo failed');
    } finally {
      setIsUndoing(false);
    }
  };

  const handleDownload = async () => {
    try {
      await api.downloadFile(jobId, 'csv');
      showSuccess('File downloaded successfully');
    } catch (err) {
      showError(err.message);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      'EMAIL': <Mail size={14} />, 'PHONE': <Phone size={14} />, 'DATE': <Calendar size={14} />,
      'NUMERIC': <Hash size={14} />, 'CURRENCY': <DollarSign size={14} />, 'AGE': <User size={14} />,
      'NAME': <User size={14} />, 'ADDRESS': <Home size={14} />, 'CITY': <MapPin size={14} />,
      'CATEGORICAL': <Tag size={14} />, 'TEXT': <Type size={14} />, 'URL': <Link size={14} />
    };
    return icons[type] || <Type size={14} />;
  };

  const getHealthColor = (health) => {
    if (health >= 80) return 'excellent';
    if (health >= 60) return 'good';
    if (health >= 40) return 'fair';
    return 'poor';
  };

  const openColumnMenu = (columnName, event) => {
    event.stopPropagation();
    setMenuColumn(columnName);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowColumnMenu(columnName);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(null);
        setMenuColumn(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!jobId) {
    return (
      <div className="cleaner-empty">
        <div className="empty-state">
          <Database size={48} />
          <h3>No Data Loaded</h3>
          <p>Upload a file to start cleaning</p>
          <button className="upload-btn" onClick={() => setCurrentPage('upload')}>
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cleaner-page">
      <div className="cleaner-toolbar">
        <div className="toolbar-left">
          <div className="dataset-info">
            <FileText size={18} />
            <span className="dataset-name">{filename || 'Unknown'}</span>
            <span className="dataset-stats">
              {formatNumber(totalRows)} rows · {totalColumns} columns
            </span>
          </div>
          <div className="health-indicator">
            <div className={`health-bar ${getHealthColor(overallHealth)}`}>
              <div className="health-fill" style={{ width: `${overallHealth}%` }} />
            </div>
            <span className="health-score">{overallHealth}%</span>
          </div>
        </div>

        <div className="toolbar-center">
          <button 
            className={`smart-clean-btn ${isSmartCleaning ? 'cleaning' : ''}`}
            onClick={handleSmartClean}
            disabled={isSmartCleaning}
          >
            {isSmartCleaning ? (
              <><RefreshCw size={20} className="spin" /><span>Cleaning...</span></>
            ) : (
              <><Sparkles size={20} /><span>✨ Smart Clean</span></>
            )}
          </button>
          {/* NEW: entry point for the Bulk Actions modal */}
          <Tooltip content="Apply one action to multiple columns at once" position="bottom">
            <button className="bulk-actions-btn" onClick={openBulkModal}>
              <CheckSquare size={18} />
              <span>Bulk Actions</span>
            </button>
          </Tooltip>
        </div>

        <div className="toolbar-right">
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'current' ? 'active' : ''}`} onClick={() => setViewMode('current')} title="Show cleaned data">
              <Eye size={14} />After
            </button>
            <button className={`view-btn ${viewMode === 'original' ? 'active' : ''}`} onClick={() => setViewMode('original')} title="Show original data" disabled={!originalPreviewData}>
              <EyeOff size={14} />Before
            </button>
          </div>
          <Tooltip content="View action log" position="bottom">
            <button className="action-icon-btn" onClick={() => actionLog.length > 0 && setShowActionLog(true)} disabled={actionLog.length === 0}>
              <History size={16} />
            </button>
          </Tooltip>
          <Tooltip content={canUndo ? `Undo: ${actionLog[0]?.operation || 'last action'}` : 'Nothing to undo'} position="bottom">
            <button className="action-icon-btn" onClick={handleUndo} disabled={!canUndo || actionLog.length === 0 || isUndoing}>
              {isUndoing ? <Loader2 size={16} className="spin" /> : <Undo size={16} />}
            </button>
          </Tooltip>
          <Tooltip content="Download cleaned data" position="bottom">
            <button className="action-icon-btn download" onClick={handleDownload}>
              <Download size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="data-table-container">
        <div className="table-controls">
          <div className="search-wrapper">
            <Search size={14} />
            <input type="text" placeholder="Search in table..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')} title="Clear search" type="button">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="view-filters">
            <button className={`filter-chip ${viewFilter === 'all' ? 'active' : ''}`} onClick={() => setViewFilter('all')}>All Rows</button>
            <button className={`filter-chip ${viewFilter === 'changed' ? 'active' : ''}`} onClick={() => setViewFilter('changed')} disabled={changedCells.size === 0} title={changedCells.size === 0 ? 'No changes recorded yet' : `${changedCells.size} changed cells/rows`}>Changed Only</button>
            <button className={`filter-chip highlight-toggle ${highlightChanges ? 'active' : ''}`} onClick={() => setHighlightChanges(prev => !prev)} title="Toggle highlighting of changed cells">
              <Highlighter size={12} />Highlight
            </button>
          </div>
          <div className="rows-per-page">
            <span>Rows:</span>
            <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPageNum(1); }}>
              <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={250}>250</option>
            </select>
          </div>
        </div>

        {previewTruncated && (
          <div className="preview-truncation-banner">
            <AlertTriangle size={13} />
            <span>Showing the first {formatNumber(previewRowsShown)} of {formatNumber(totalRows)} rows in this table view — every cleaning action still applies to the full dataset. Download the file to see every row.</span>
          </div>
        )}

        {searchTerm && (
          <div className="search-result-summary">
            {visibleRows.length === 0 ? `No rows match "${searchTerm}"` : `${visibleRows.length} row${visibleRows.length === 1 ? '' : 's'} match "${searchTerm}"`}
          </div>
        )}

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className="row-number-cell">#</th>
                {columns.map((col) => (
                  <th key={col.name} className="column-header">
                    <div className="column-header-content">
                      <div className="column-name-wrapper">
                        {getTypeIcon(col.type)}
                        <span className="column-name">{col.name}</span>
                        <button className="column-clean-btn" onClick={(e) => openColumnMenu(col.name, e)} title="Column cleaning actions" style={{ opacity: 1, visibility: 'visible' }}>
                          <Brush size={14} /><span>Clean</span>
                        </button>
                      </div>
                      <div className="column-health">
                        <div className={`column-health-bar ${getHealthColor(col.health)}`}>
                          <div className="health-fill" style={{ width: `${col.health}%` }} />
                        </div>
                        <span className={`health-value ${getHealthColor(col.health)}`}>{col.health}%</span>
                        {col.missingPercent > 10 && (
                          <Tooltip content={`${col.missingPercent}% missing values`}>
                            <AlertTriangle size={12} className="issue-icon" />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="no-rows-cell">{searchTerm || viewFilter === 'changed' ? 'No rows match the current search/filter.' : 'No data to display.'}</td></tr>
              ) : (
                paginatedRows.map(({ row, idx: actualRowIndex }) => {
                  const rowHasChanges = changedCells.has(actualRowIndex);
                  return (
                    <tr key={actualRowIndex} className={rowHasChanges && highlightChanges ? 'row-changed' : ''}>
                      <td className="row-number-cell">{actualRowIndex + 1}</td>
                      {columns.map((col) => {
                        const value = row[col.name];
                        const isNull = value === null || value === undefined || value === '';
                        const cellHasChange = changedCells.has(`${actualRowIndex}|${col.name}`);
                        return (
                          <td key={col.name} className={`data-cell ${isNull ? 'null-cell' : ''} ${cellHasChange && highlightChanges ? 'cell-changed' : ''}`} title={isNull ? 'Missing value' : String(value)}>
                            {isNull ? '—' : truncateText(String(value), 50)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setCurrentPageNum(1)} disabled={currentPageNum === 1}><ChevronsLeft size={14} /></button>
            <button className="page-btn" onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))} disabled={currentPageNum === 1}><ArrowLeft size={14} /></button>
            <span className="page-info">Page {currentPageNum} of {totalPages}</span>
            <button className="page-btn" onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))} disabled={currentPageNum === totalPages}><ArrowRight size={14} /></button>
            <button className="page-btn" onClick={() => setCurrentPageNum(totalPages)} disabled={currentPageNum === totalPages}><ChevronsRight size={14} /></button>
          </div>
        )}
      </div>

      {showColumnMenu && menuColumn && (
        <div className="column-action-menu" ref={columnMenuRef} style={{ position: 'fixed', top: Math.min(menuPosition.y + 10, window.innerHeight - 480), left: Math.min(menuPosition.x - 220, window.innerWidth - 240), zIndex: 1000 }}>
          <div className="menu-header"><Brush size={14} /><strong>Clean "{menuColumn}"</strong></div>
          <div className="menu-scrollable">
            <div className="menu-section">
              <div className="menu-section-title"><Type size={12} /><span>Text Cleaning</span></div>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'trim_spaces')}><Scissors size={14} /> Trim Spaces</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'lowercase')}><Type size={14} /> Convert to Lowercase</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'uppercase')}><Type size={14} /> Convert to Uppercase</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'titlecase')}><Edit3 size={14} /> Convert to Title Case</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'remove_special')}><AlertCircle size={14} /> Remove Special Characters</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fix_encoding')}><RefreshCw size={14} /> Fix Encoding Issues</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'standardize_categories')}><Wand2 size={14} /> Standardize Values (F/f/Female → Female)</button>
              {/* NEW: exposes the backend's find_replace endpoint, previously with no UI anywhere */}
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'find_replace')}><Replace size={14} /> Find &amp; Replace…</button>
            </div>
            <div className="menu-section">
              <div className="menu-section-title"><Hash size={12} /><span>Missing Values</span></div>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fill_mean')}><Hash size={14} /> Fill with Mean (Average)</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fill_median')}><Hash size={14} /> Fill with Median</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fill_mode')}><Hash size={14} /> Fill with Mode (Most Common)</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fill_constant')}><Edit3 size={14} /> Fill with Custom Value</button>
            </div>
            <div className="menu-section">
              <div className="menu-section-title"><Wand2 size={12} /><span>Special Actions</span></div>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fix_emails')}><Mail size={14} /> Fix Email Addresses</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'format_phones')}><Phone size={14} /> Format Phone Numbers</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'remove_outliers')}><TrendingUp size={14} /> Review &amp; Remove Outliers…</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'to_numeric')}><Hash size={14} /> Convert to Number</button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'to_datetime')}><Calendar size={14} /> Convert to Date</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ BULK ACTIONS MODAL (NEW) ============ */}
      {showBulkModal && (
        <div className="bulk-modal">
          <div className="modal-overlay" onClick={closeBulkModal} />
          <div className="bulk-modal-content">
            <div className="bulk-modal-header">
              <div className="bulk-modal-title">
                <CheckSquare size={20} />
                <div>
                  <h3>Bulk Actions</h3>
                  <p>Apply one cleaning action to several columns at once.</p>
                </div>
              </div>
              <button className="outlier-close-btn" onClick={closeBulkModal} disabled={isBulkRunning}><X size={18} /></button>
            </div>

            <div className="bulk-modal-body">
              {!bulkResults ? (
                <>
                  <div className="bulk-section">
                    <label className="bulk-section-label">Action to apply</label>
                    <select className="bulk-action-select" value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} disabled={isBulkRunning}>
                      {BULK_ACTIONS.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    {bulkAction === 'fill_missing' && (
                      <div className="bulk-fill-strategy">
                        <span>Strategy:</span>
                        {['mean', 'median', 'mode'].map(s => (
                          <button
                            key={s}
                            type="button"
                            className={`bulk-strategy-chip ${bulkFillStrategy === s ? 'active' : ''}`}
                            onClick={() => setBulkFillStrategy(s)}
                            disabled={isBulkRunning}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bulk-section">
                    <div className="bulk-columns-header">
                      <label className="bulk-section-label">
                        Columns ({bulkSelectedColumns.size} of {columns.length} selected)
                      </label>
                      <button type="button" className="bulk-select-all-btn" onClick={toggleBulkSelectAll} disabled={isBulkRunning}>
                        {bulkSelectedColumns.size === columns.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="bulk-columns-list">
                      {columns.map(col => (
                        <label key={col.name} className="bulk-column-checkbox">
                          <input
                            type="checkbox"
                            checked={bulkSelectedColumns.has(col.name)}
                            onChange={() => toggleBulkColumn(col.name)}
                            disabled={isBulkRunning}
                          />
                          {bulkSelectedColumns.has(col.name) ? <CheckSquare size={15} /> : <Square size={15} />}
                          <span className="bulk-column-name">{col.name}</span>
                          <span className="bulk-column-type">{col.type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {bulkSelectedColumns.size > 1 && (
                    <div className="bulk-undo-warning">
                      <Info size={13} />
                      <span>Only the <strong>last</strong> column processed can be undone afterward — this app supports undoing one action at a time.</span>
                    </div>
                  )}

                  {isBulkRunning && bulkProgress && (
                    <div className="bulk-progress">
                      <Loader2 size={16} className="spin" />
                      <span>Processing "{bulkProgress.columnName}" ({bulkProgress.current} of {bulkProgress.total})…</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="bulk-results">
                  <h4>Results</h4>
                  <div className="bulk-results-list">
                    {bulkResults.map((r, i) => (
                      <div key={i} className={`bulk-result-row ${r.success ? 'success' : 'failed'}`}>
                        {r.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        <span className="bulk-result-column">{r.column}</span>
                        <span className="bulk-result-detail">
                          {r.success ? `${formatNumber(r.rowsAffected)} changes` : r.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bulk-modal-footer">
              {!bulkResults ? (
                <>
                  <button className="outlier-cancel-btn" onClick={closeBulkModal} disabled={isBulkRunning}>Cancel</button>
                  <button className="bulk-run-btn" onClick={runBulkAction} disabled={isBulkRunning || bulkSelectedColumns.size === 0}>
                    {isBulkRunning ? <><Loader2 size={15} className="spin" />Running…</> : <><CheckSquare size={15} />Apply to {bulkSelectedColumns.size} column{bulkSelectedColumns.size === 1 ? '' : 's'}</>}
                  </button>
                </>
              ) : (
                <button className="bulk-run-btn" onClick={closeBulkModal}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ FIND & REPLACE MODAL (NEW) ============ */}
      {findReplaceModal && (
        <div className="bulk-modal">
          <div className="modal-overlay" onClick={closeFindReplaceModal} />
          <div className="find-replace-modal-content">
            <div className="bulk-modal-header">
              <div className="bulk-modal-title">
                <Replace size={20} />
                <div>
                  <h3>Find &amp; Replace in "{findReplaceModal.column}"</h3>
                  <p>Applies to every cell in this column.</p>
                </div>
              </div>
              <button className="outlier-close-btn" onClick={closeFindReplaceModal} disabled={isApplyingFindReplace}><X size={18} /></button>
            </div>

            <div className="bulk-modal-body">
              <div className="bulk-section">
                <label className="bulk-section-label">Find</label>
                <input
                  type="text"
                  className="find-replace-input"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder={useRegex ? 'e.g. ^Dr\\.\\s*' : 'Text to find'}
                  disabled={isApplyingFindReplace}
                  autoFocus
                />
              </div>
              <div className="bulk-section">
                <label className="bulk-section-label">Replace with</label>
                <input
                  type="text"
                  className="find-replace-input"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replacement text (leave empty to remove)"
                  disabled={isApplyingFindReplace}
                />
              </div>
              <label className="find-replace-regex-toggle">
                <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} disabled={isApplyingFindReplace} />
                <span>Use regular expression (regex)</span>
              </label>
              {useRegex && (
                <div className="find-replace-regex-hint">
                  <Info size={12} />
                  <span>Capture groups work: find <code>(\d+)-(\d+)</code>, replace with <code>$2-$1</code></span>
                </div>
              )}
              {findReplaceError && (
                <div className="outlier-error"><AlertCircle size={16} /><span>{findReplaceError}</span></div>
              )}
            </div>

            <div className="bulk-modal-footer">
              <button className="outlier-cancel-btn" onClick={closeFindReplaceModal} disabled={isApplyingFindReplace}>Cancel</button>
              <button className="bulk-run-btn" onClick={applyFindReplace} disabled={isApplyingFindReplace || !findText}>
                {isApplyingFindReplace ? <><Loader2 size={15} className="spin" />Applying…</> : <><Replace size={15} />Apply</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ OUTLIER PREVIEW MODAL ============ */}
      {outlierModal && (
        <div className="outlier-modal">
          <div className="modal-overlay" onClick={closeOutlierModal} />
          <div className="outlier-modal-content">
            <div className="outlier-modal-header">
              <div className="outlier-modal-title">
                <TrendingUp size={20} />
                <div>
                  <h3>Review outliers in "{outlierModal.column}"</h3>
                  <p>Nothing is removed until you confirm below.</p>
                </div>
              </div>
              <button className="outlier-close-btn" onClick={closeOutlierModal} disabled={isRemovingOutliers}><X size={18} /></button>
            </div>

            <div className="outlier-modal-body">
              <div className="outlier-sensitivity">
                <div className="sensitivity-label"><span>Sensitivity (IQR multiplier)</span><strong>{outlierMultiplier.toFixed(1)}</strong></div>
                <input type="range" min="0.5" max="5" step="0.1" value={outlierMultiplier} onChange={(e) => setOutlierMultiplier(parseFloat(e.target.value))} disabled={isRemovingOutliers} />
                <div className="sensitivity-hints"><span>0.5 — strict (flags more)</span><span>1.5 — standard</span><span>5.0 — lenient</span></div>
              </div>

              {isLoadingOutlierPreview && (<div className="outlier-loading"><Loader2 size={18} className="spin" /><span>Analyzing "{outlierModal.column}"…</span></div>)}
              {outlierPreviewError && !isLoadingOutlierPreview && (<div className="outlier-error"><AlertCircle size={16} /><span>{outlierPreviewError}</span></div>)}

              {outlierPreview && !isLoadingOutlierPreview && !outlierPreviewError && (
                <>
                  <div className="outlier-stats-grid">
                    <div className="outlier-stat danger"><span className="outlier-stat-value">{formatNumber(outlierPreview.outlier_count)}</span><span className="outlier-stat-label">Rows to remove</span></div>
                    <div className="outlier-stat"><span className="outlier-stat-value">{outlierPreview.outlier_percent}%</span><span className="outlier-stat-label">Of dataset</span></div>
                    <div className="outlier-stat success"><span className="outlier-stat-value">{formatNumber(outlierPreview.rows_remaining_after)}</span><span className="outlier-stat-label">Rows remaining</span></div>
                  </div>
                  <div className="outlier-bounds">
                    <Info size={13} />
                    <span>Values outside <strong>{Number(outlierPreview.lower_bound).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> to <strong>{Number(outlierPreview.upper_bound).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> are treated as outliers.</span>
                  </div>
                  {outlierPreview.missing_rows_preserved && (
                    <div className="outlier-note"><CheckCircle size={13} /><span>{formatNumber(outlierPreview.missing_values)} row{outlierPreview.missing_values === 1 ? '' : 's'} with a missing value in this column will be <strong>kept</strong>, not removed.</span></div>
                  )}
                  {outlierPreview.outlier_count > 0 ? (
                    <div className="outlier-sample">
                      <h4>Sample of values that would be removed</h4>
                      <div className="outlier-sample-list">
                        {outlierPreview.sample_rows.map((r, i) => (
                          <div key={i} className="outlier-sample-row">
                            <span className="outlier-sample-rownum">Row {formatNumber(r.row_number)}</span>
                            <span className="outlier-sample-value">{typeof r.value === 'number' ? r.value.toLocaleString() : String(r.value)}</span>
                          </div>
                        ))}
                      </div>
                      {outlierPreview.outlier_count > outlierPreview.sample_rows.length && (
                        <div className="outlier-sample-more">+ {formatNumber(outlierPreview.outlier_count - outlierPreview.sample_rows.length)} more</div>
                      )}
                    </div>
                  ) : (
                    <div className="outlier-none"><CheckCircle size={28} /><h4>No outliers at this sensitivity</h4><p>Try lowering the multiplier to flag more values, or close this dialog.</p></div>
                  )}
                </>
              )}
            </div>

            <div className="outlier-modal-footer">
              <button className="outlier-cancel-btn" onClick={closeOutlierModal} disabled={isRemovingOutliers}>Cancel</button>
              <button className="outlier-confirm-btn" onClick={confirmRemoveOutliers} disabled={isRemovingOutliers || isLoadingOutlierPreview || !outlierPreview || outlierPreview.outlier_count === 0}>
                {isRemovingOutliers ? <><Loader2 size={15} className="spin" />Removing…</> : <><Trash2 size={15} />{outlierPreview && outlierPreview.outlier_count > 0 ? `Remove ${formatNumber(outlierPreview.outlier_count)} row${outlierPreview.outlier_count === 1 ? '' : 's'}` : 'Remove outliers'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="ai-assistant-trigger" onClick={() => setShowAIAssistant(true)} title="AI Cleaning Assistant">
        <Bot size={24} /><span className="trigger-pulse"></span>
      </button>

      <AIAssistant isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} onActionExecute={handleAIAction} availableColumns={columns.map(c => c.name)} currentJobId={jobId} position="bottom-right" />

      <ActionLog isOpen={showActionLog} action={currentAction} onClose={() => setShowActionLog(false)} onUndo={handleUndo} canUndo={canUndo} />

      {showSmartCleanModal && smartCleanProgress && (
        <div className="smart-clean-modal">
          <div className="modal-overlay" onClick={() => setShowSmartCleanModal(false)} />
          <div className="modal-content">
            <div className="modal-header"><Sparkles size={24} className="modal-icon" /><h3>Smart Clean In Progress</h3></div>
            <div className="modal-body">
              <div className="progress-steps">
                {smartCleanProgress.steps.map((step, idx) => (
                  <div key={step.id} className={`progress-step ${step.status}`}>
                    {step.status === 'completed' && <CheckCircle size={16} />}
                    {step.status === 'loading' && <Loader2 size={16} className="spin" />}
                    {step.status === 'pending' && <div className="step-dot" />}
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
              <div className="progress-message">{smartCleanProgress.message}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleanerPage;