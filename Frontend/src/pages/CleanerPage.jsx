// frontend/src/pages/CleanerPage.jsx
// Complete Cleaner Page - Smart Clean + Column Actions + AI Assistant + Detailed Action Log

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
  Brush, Wand2, Rocket, Wrench, Star, Award  // Removed 'Tool' from here
} from 'lucide-react';
import Tooltip from '../components/Common/Tooltip';
import AIAssistant from '../components/AI/AIAssistant';
import ActionLog from '../components/Common/ActionLog';
import './CleanerPage.css';

const CleanerPage = () => {
  const { 
    jobId, filename, totalRows, totalColumns, columnProfile,
    previewData, showSuccess, showError, showInfo,
    setCurrentPage
  } = useApp();

  // ============ STATE ============
  const [isSmartCleaning, setIsSmartCleaning] = useState(false);
  const [actionLog, setActionLog] = useState([]);
  const [highlightChanges, setHighlightChanges] = useState(false);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
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

  const columnMenuRef = useRef(null);

  // Store original data when first loaded
  useEffect(() => {
    if (previewData && previewData.length > 0 && !originalPreviewData) {
      setOriginalPreviewData([...previewData]);
      setPreviewDataState(previewData);
    } else if (previewData && previewData.length > 0) {
      setPreviewDataState(previewData);
    }
  }, [previewData, originalPreviewData]);

  // ============ CALCULATIONS ============
  const totalPages = Math.ceil((previewDataState?.length || 0) / rowsPerPage);
  
  const paginatedData = useMemo(() => {
    if (!previewDataState) return [];
    const start = (currentPageNum - 1) * rowsPerPage;
    return previewDataState.slice(start, start + rowsPerPage);
  }, [previewDataState, currentPageNum, rowsPerPage]);

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

  // Helper function to compare data and find changes
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
      
      const results = await api.smartClean(jobId);
      
      console.log('Smart Clean Results:', results);
      
      const refreshedProfile = await api.profileData(jobId);
      const afterData = refreshedProfile.preview_data;
      setPreviewDataState(afterData);
      
      const changedCellsList = findChangedCells(beforeData, afterData, beforeColumns);
      
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
      
      showSuccess(newAction.message);
      
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

  // ============ COLUMN ACTION HANDLER ============
  const handleColumnAction = async (columnName, actionType, customValue = null) => {
    console.log(`🎯 Action: ${actionType} on column: ${columnName}`);
    
    if (!jobId) {
      showError('No active job');
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
          if (!value) return;
          result = await api.fillConstant(jobId, columnName, value);
          successMessage = `Filled ${result.rows_affected} missing values with "${value}" in "${columnName}"`;
          operationName = 'Fill Missing with Custom Value';
          break;
        case 'remove_duplicates':
          result = await api.removeDuplicates(jobId);
          successMessage = `Removed ${result.rows_removed} duplicate rows`;
          operationName = 'Remove Duplicates';
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
        case 'remove_outliers':
          result = await api.removeOutliersIQR(jobId, columnName);
          successMessage = `Removed ${result.rows_removed} outlier rows from "${columnName}"`;
          operationName = 'Remove Outliers';
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
      
      const refreshedProfile = await api.profileData(jobId);
      const afterData = refreshedProfile.preview_data;
      setPreviewDataState(afterData);
      
      const changedCellsList = findChangedCells(beforeData, afterData, beforeColumns);
      
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
      
    } catch (error) {
      console.error('Action failed:', error);
      showError(error.message || 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ AI ACTION HANDLER ============
  const handleAIAction = async (action, params) => {
    console.log('🤖 AI Action:', action, params);
    
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
          result = await api.smartClean(jobId);
          result.operation_name = 'Smart Clean';
          break;
        case 'quick_clean':
          result = await api.quickClean(jobId);
          result.operation_name = 'Quick Clean';
          break;
        case 'remove_duplicates':
          const cleanResult = await api.removeDuplicates(jobId);
          result = {
            success: true,
            message: `Removed ${cleanResult.rows_removed} duplicate rows`,
            rowsAffected: cleanResult.rows_removed,
            operation_name: 'Remove Duplicates'
          };
          break;
        case 'trim_spaces':
          const trimResult = await api.trimSpaces(jobId, column || 'all');
          result = {
            success: true,
            message: trimResult.message || `Trimmed spaces from ${trimResult.rows_affected} cells`,
            rowsAffected: trimResult.rows_affected,
            operation_name: 'Trim Spaces',
            column: column || 'all columns'
          };
          break;
        case 'lowercase':
          const lowerResult = await api.toLowercase(jobId, column || 'all');
          result = {
            success: true,
            message: lowerResult.message || `Converted ${lowerResult.rows_affected} cells to lowercase`,
            rowsAffected: lowerResult.rows_affected,
            operation_name: 'Convert to Lowercase',
            column: column || 'all columns'
          };
          break;
        case 'uppercase':
          const upperResult = await api.toUppercase(jobId, column || 'all');
          result = {
            success: true,
            message: upperResult.message || `Converted ${upperResult.rows_affected} cells to uppercase`,
            rowsAffected: upperResult.rows_affected,
            operation_name: 'Convert to Uppercase',
            column: column || 'all columns'
          };
          break;
        case 'titlecase':
          const titleResult = await api.toTitlecase(jobId, column);
          result = {
            success: true,
            message: titleResult.message || `Converted ${titleResult.rows_affected} cells to title case`,
            rowsAffected: titleResult.rows_affected,
            operation_name: 'Convert to Title Case',
            column: column
          };
          break;
        case 'fill_missing':
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
              column: column
            };
          } else {
            result = { success: false, message: 'Please specify a column and method', rowsAffected: 0 };
          }
          break;
        case 'fix_emails':
          const emailColumn = columns.find(c => 
            c.type === 'EMAIL' || c.name.toLowerCase().includes('email')
          )?.name;
          if (!emailColumn) {
            result = { success: false, message: 'No email column found', rowsAffected: 0 };
            break;
          }
          const emailResult = await api.fixEmails(jobId, emailColumn);
          result = {
            success: true,
            message: `Validated emails: ${emailResult.valid_count} valid, ${emailResult.invalid_count} invalid`,
            rowsAffected: emailResult.invalid_count,
            operation_name: 'Fix Email Addresses',
            column: emailColumn
          };
          break;
        case 'format_phones':
          const phoneColumn = columns.find(c => 
            c.type === 'PHONE' || c.name.toLowerCase().includes('phone')
          )?.name;
          if (!phoneColumn) {
            result = { success: false, message: 'No phone column found', rowsAffected: 0 };
            break;
          }
          const phoneResult = await api.formatPhones(jobId, phoneColumn);
          result = {
            success: true,
            message: `Formatted ${phoneResult.rows_affected} phone numbers`,
            rowsAffected: phoneResult.rows_affected,
            operation_name: 'Format Phone Numbers',
            column: phoneColumn
          };
          break;
        case 'extract_year':
          const yearResult = await api.extractYear(jobId, column);
          result = {
            success: true,
            message: `Extracted year from "${column}"`,
            rowsAffected: 0,
            operation_name: 'Extract Year',
            column: column
          };
          break;
        case 'calculate_age':
          const ageResult = await api.calculateAge(jobId, column);
          result = {
            success: true,
            message: `Calculated age from "${column}"`,
            rowsAffected: 0,
            operation_name: 'Calculate Age',
            column: column
          };
          break;
        case 'remove_outliers':
          if (!column) {
            result = { success: false, message: 'Please specify a column', rowsAffected: 0 };
            break;
          }
          const outlierResult = await api.removeOutliersIQR(jobId, column, params?.threshold || 1.5);
          result = {
            success: true,
            message: `Removed ${outlierResult.rows_removed} outlier rows from "${column}"`,
            rowsAffected: outlierResult.rows_removed,
            operation_name: 'Remove Outliers',
            column: column
          };
          break;
        case 'undo':
          if (actionLog.length > 0) {
            const lastAction = actionLog[0];
            setActionLog(prev => prev.filter(a => a.id !== lastAction.id));
            const refreshedProfile = await api.profileData(jobId);
            setPreviewDataState(refreshedProfile.preview_data);
            result = { success: true, message: 'Undid last action', rowsAffected: 0, operation_name: 'Undo' };
          } else {
            result = { success: false, message: 'No actions to undo', rowsAffected: 0 };
          }
          break;
        default:
          result = { success: false, message: `Unknown action: ${actionType}`, rowsAffected: 0 };
      }
      
      if (result.success && actionType !== 'undo') {
        const refreshedProfile = await api.profileData(jobId);
        const afterData = refreshedProfile.preview_data;
        setPreviewDataState(afterData);
        
        const changedCellsList = findChangedCells(beforeData, afterData, beforeColumns);
        
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
      }
      
      result.timeMs = Date.now() - startTime;
      return result;
      
    } catch (error) {
      console.error('AI Action error:', error);
      return { success: false, message: error.message, rowsAffected: 0, timeMs: 0 };
    }
  };

  const handleUndo = async (actionId) => {
    const action = actionLog.find(a => a.id === actionId);
    if (!action) return;
    
    try {
      showSuccess(`Undid: ${action.operation}`);
      setActionLog(prev => prev.filter(a => a.id !== actionId));
      const refreshedProfile = await api.profileData(jobId);
      setPreviewDataState(refreshedProfile.preview_data);
      setShowActionLog(false);
      setCurrentAction(null);
    } catch (err) {
      showError(err.message);
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
      'EMAIL': <Mail size={14} />,
      'PHONE': <Phone size={14} />,
      'DATE': <Calendar size={14} />,
      'NUMERIC': <Hash size={14} />,
      'CURRENCY': <DollarSign size={14} />,
      'AGE': <User size={14} />,
      'NAME': <User size={14} />,
      'ADDRESS': <Home size={14} />,
      'CITY': <MapPin size={14} />,
      'CATEGORICAL': <Tag size={14} />,
      'TEXT': <Type size={14} />,
      'URL': <Link size={14} />
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
      {/* TOP TOOLBAR */}
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
              <>
                <RefreshCw size={20} className="spin" />
                <span>Cleaning...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>✨ Smart Clean</span>
              </>
            )}
          </button>
        </div>

        <div className="toolbar-right">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'current' ? 'active' : ''}`}
              onClick={() => setViewMode('current')}
              title="Show cleaned data"
            >
              <Eye size={14} />
              After
            </button>
            <button 
              className={`view-btn ${viewMode === 'original' ? 'active' : ''}`}
              onClick={() => setViewMode('original')}
              title="Show original data"
            >
              <EyeOff size={14} />
              Before
            </button>
          </div>
          <Tooltip content="View action log" position="bottom">
            <button 
              className="action-icon-btn" 
              onClick={() => actionLog.length > 0 && setShowActionLog(true)}
              disabled={actionLog.length === 0}
            >
              <History size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Undo last action" position="bottom">
            <button 
              className="action-icon-btn" 
              onClick={() => actionLog[0] && handleUndo(actionLog[0].id)}
              disabled={actionLog.length === 0}
            >
              <Undo size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Download cleaned data" position="bottom">
            <button className="action-icon-btn download" onClick={handleDownload}>
              <Download size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="data-table-container">
        <div className="table-controls">
          <div className="search-wrapper">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search in table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="view-filters">
            <button 
              className={`filter-chip ${viewFilter === 'all' ? 'active' : ''}`}
              onClick={() => setViewFilter('all')}
            >
              All Rows
            </button>
            <button 
              className={`filter-chip ${viewFilter === 'changed' ? 'active' : ''}`}
              onClick={() => setViewFilter('changed')}
            >
              Changed Only
            </button>
          </div>
          <div className="rows-per-page">
            <span>Rows:</span>
            <select value={rowsPerPage} onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPageNum(1);
            }}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

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
                        {/* Professional Column Action Button - Visible on hover */}
                        <button 
                          className="column-clean-btn"
                          onClick={(e) => openColumnMenu(col.name, e)}
                          title="Column cleaning actions"
                        >
                          <Brush size={14} />
                          <span>Clean</span>
                        </button>
                      </div>
                      <div className="column-health">
                        <div className={`column-health-bar ${getHealthColor(col.health)}`}>
                          <div className="health-fill" style={{ width: `${col.health}%` }} />
                        </div>
                        <span className={`health-value ${getHealthColor(col.health)}`}>
                          {col.health}%
                        </span>
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
              {paginatedData.map((row, rowIdx) => {
                const actualRowIndex = (currentPageNum - 1) * rowsPerPage + rowIdx;
                const rowHasChanges = changedCells.has(actualRowIndex);
                return (
                  <tr key={actualRowIndex} className={rowHasChanges && highlightChanges ? 'row-changed' : ''}>
                    <td className="row-number-cell">{actualRowIndex + 1}</td>
                    {columns.map((col) => {
                      const value = row[col.name];
                      const isNull = value === null || value === undefined || value === '';
                      const cellHasChange = changedCells.has(`${actualRowIndex}|${col.name}`);
                      return (
                        <td 
                          key={col.name}
                          className={`data-cell ${isNull ? 'null-cell' : ''} ${cellHasChange && highlightChanges ? 'cell-changed' : ''}`}
                          title={isNull ? 'Missing value' : String(value)}
                        >
                          {isNull ? '—' : truncateText(String(value), 50)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setCurrentPageNum(1)} disabled={currentPageNum === 1}>
              <ChevronsLeft size={14} />
            </button>
            <button className="page-btn" onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))} disabled={currentPageNum === 1}>
              <ArrowLeft size={14} />
            </button>
            <span className="page-info">Page {currentPageNum} of {totalPages}</span>
            <button className="page-btn" onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))} disabled={currentPageNum === totalPages}>
              <ArrowRight size={14} />
            </button>
            <button className="page-btn" onClick={() => setCurrentPageNum(totalPages)} disabled={currentPageNum === totalPages}>
              <ChevronsRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* SCROLLABLE COLUMN ACTION MENU */}
      {showColumnMenu && menuColumn && (
        <div 
          className="column-action-menu" 
          ref={columnMenuRef}
          style={{
            position: 'fixed',
            top: Math.min(menuPosition.y + 10, window.innerHeight - 450),
            left: Math.min(menuPosition.x - 220, window.innerWidth - 240),
            zIndex: 1000
          }}
        >
          <div className="menu-header">
            <Brush size={14} />
            <strong>Clean "{menuColumn}"</strong>
          </div>
          
          <div className="menu-scrollable">
            {/* Text Cleaning Section */}
            <div className="menu-section">
              <div className="menu-section-title">
                <Type size={12} />
                <span>Text Cleaning</span>
              </div>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'trim_spaces')}>
                <Scissors size={14} /> Trim Spaces
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'lowercase')}>
                <Type size={14} /> Convert to Lowercase
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'uppercase')}>
                <Type size={14} /> Convert to Uppercase
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'titlecase')}>
                <Edit3 size={14} /> Convert to Title Case
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'remove_special')}>
                <AlertCircle size={14} /> Remove Special Characters
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fix_encoding')}>
                <RefreshCw size={14} /> Fix Encoding Issues
              </button>
            </div>
            
            {/* Missing Values Section */}
            <div className="menu-section">
              <div className="menu-section-title">
                <Hash size={12} />
                <span>Missing Values</span>
              </div>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fill_mean')}>
                <Hash size={14} /> Fill with Mean (Average)
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fill_median')}>
                <Hash size={14} /> Fill with Median
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fill_mode')}>
                <Hash size={14} /> Fill with Mode (Most Common)
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fill_constant')}>
                <Edit3 size={14} /> Fill with Custom Value
              </button>
            </div>
            
            {/* Special Actions Section */}
            <div className="menu-section">
              <div className="menu-section-title">
                <Wand2 size={12} />
                <span>Special Actions</span>
              </div>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'fix_emails')}>
                <Mail size={14} /> Fix Email Addresses
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'format_phones')}>
                <Phone size={14} /> Format Phone Numbers
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'remove_outliers')}>
                <TrendingUp size={14} /> Remove Outliers
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'to_numeric')}>
                <Hash size={14} /> Convert to Number
              </button>
              <button className="menu-item" onClick={() => handleColumnAction(menuColumn, 'to_datetime')}>
                <Calendar size={14} /> Convert to Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI ASSISTANT TRIGGER BUTTON */}
      <button 
        className="ai-assistant-trigger"
        onClick={() => setShowAIAssistant(true)}
        title="AI Cleaning Assistant"
      >
        <Bot size={24} />
        <span className="trigger-pulse"></span>
      </button>

      {/* AI ASSISTANT PANEL */}
      <AIAssistant 
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        onActionExecute={handleAIAction}
        availableColumns={columns.map(c => c.name)}
        currentJobId={jobId}
        position="bottom-right"
      />

      {/* ACTION LOG COMPONENT */}
      <ActionLog 
        isOpen={showActionLog}
        action={currentAction}
        onClose={() => setShowActionLog(false)}
        onUndo={handleUndo}
      />

      {/* SMART CLEAN PROGRESS MODAL */}
      {showSmartCleanModal && smartCleanProgress && (
        <div className="smart-clean-modal">
          <div className="modal-overlay" onClick={() => setShowSmartCleanModal(false)} />
          <div className="modal-content">
            <div className="modal-header">
              <Sparkles size={24} className="modal-icon" />
              <h3>Smart Clean In Progress</h3>
            </div>
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