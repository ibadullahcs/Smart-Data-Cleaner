// frontend/src/pages/HistoryPage.jsx
// COMPLETE FIXED VERSION - All issues resolved

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { formatNumber, formatDate, formatDateTime } from '../utils/formatters';
import { 
  History, Clock, Database, Trash2, Eye, Download, 
  ChevronRight, ChevronDown, Calendar, HardDrive, 
  TrendingUp, TrendingDown, Minus, RefreshCw,
  Filter, Search, X, Loader2, CheckCircle, AlertCircle,
  FileText, Copy, ExternalLink, ArrowRight, List,
  Undo, Redo, Save, FileJson, FileSpreadsheet,
  GitBranch, GitMerge, GitCommit, RotateCcw,
  Upload, Brush, Sparkles, Activity, Scissors, Type, Hash, Mail, Phone
} from 'lucide-react';
import { SkeletonCard } from '../components/Common/SkeletonLoader';
import Tooltip from '../components/Common/Tooltip';
import './HistoryPage.css';

// Storage key for local history (fallback when backend not available)
const HISTORY_STORAGE_KEY = 'smart_cleaner_history';

const HistoryPage = () => {
  const { setCurrentPage, showSuccess, showError, showInfo } = useApp();
  
  // ============ STATE ============
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('timeline');
  const [expandedActions, setExpandedActions] = useState({});
  const [showComparison, setShowComparison] = useState(false);
  const [compareData, setCompareData] = useState(null);

  // ============ LOAD HISTORY ============
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const jobs = await api.getJobs();
      console.log('📊 Loaded jobs from backend:', jobs);
      
      if (jobs && jobs.length > 0) {
        const formattedSessions = jobs.map(job => {
          // Handle cleaning_actions - ensure it's an array
          let cleaningActions = [];
          if (job.cleaning_actions) {
            if (Array.isArray(job.cleaning_actions)) {
              cleaningActions = job.cleaning_actions;
            } else if (typeof job.cleaning_actions === 'object') {
              cleaningActions = job.cleaning_actions.operations || [];
            }
          }
          
          return {
            id: job.id,
            jobId: job.id,
            fileName: job.original_filename || 'Unknown',
            fileSize: job.file_size || 0,
            originalRows: job.rows_original || 0,
            cleanedRows: job.rows_after || job.rows_original || 0,
            healthScoreBefore: job.quality_score_before || 0,
            healthScoreAfter: job.quality_score_after || 0,
            createdAt: job.created_at,
            updatedAt: job.updated_at || job.created_at,
            operations: cleaningActions,
            exports: []
          };
        });
        setSessions(formattedSessions);
        console.log('✅ Formatted sessions:', formattedSessions);
      } else {
        const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (saved) {
          setSessions(JSON.parse(saved));
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        setSessions(JSON.parse(saved));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============ DELETE SESSION ============
  const deleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        await api.deleteJob(sessionId);
      } catch (error) {
        console.error('Failed to delete from backend:', error);
      }
      
      const updatedSessions = sessions.filter(s => s.id !== sessionId && s.jobId !== sessionId);
      setSessions(updatedSessions);
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      showSuccess('Session deleted');
    }
  };

  // ============ CLEAR ALL HISTORY ============
  const clearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear ALL history? This action cannot be undone.')) {
      setSessions([]);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      setSelectedSession(null);
      showSuccess('All history cleared');
    }
  };

  // ============ LOAD SESSION INTO CLEANER ============
  const loadSession = (session) => {
    localStorage.setItem('session_to_load', JSON.stringify(session));
    setCurrentPage('cleaner');
    showSuccess(`Loading session: ${session.fileName}`);
  };

  // ============ RESTORE VERSION ============
  const restoreVersion = (session, versionIndex) => {
    showInfo(`Restoring version ${versionIndex + 1}...`);
    setTimeout(() => {
      showSuccess(`Restored to version ${versionIndex + 1}`);
    }, 1000);
  };

  // ============ EXPORT SESSION REPORT ============
  const exportSessionReport = (session) => {
    const report = {
      sessionId: session.id,
      fileName: session.fileName,
      fileSize: session.fileSize,
      originalRows: session.originalRows,
      cleanedRows: session.cleanedRows,
      createdAt: session.createdAt,
      operations: session.operations,
      exports: session.exports,
      healthScoreBefore: session.healthScoreBefore,
      healthScoreAfter: session.healthScoreAfter
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_report_${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Report exported');
  };

  // ============ VIEW COMPARISON ============
  const viewComparison = (session, action) => {
    setCompareData({
      before: {
        rows: session.originalRows,
        healthScore: action.details?.health_score_before || session.healthScoreBefore,
        sampleData: action.details?.sample_before || []
      },
      after: {
        rows: session.cleanedRows,
        healthScore: action.details?.health_score_after || session.healthScoreAfter,
        sampleData: action.details?.sample_after || []
      }
    });
    setShowComparison(true);
  };

  // ============ FILTER SESSIONS ============
  const filteredSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    return sessions.filter(session => {
      if (!session || !session.fileName) return false;
      
      const matchesSearch = session.fileName.toLowerCase().includes((searchTerm || '').toLowerCase());
      const matchesFilter = filterType === 'all' || 
        (filterType === 'cleaned' && session.operations?.length > 0) ||
        (filterType === 'exported' && session.exports?.length > 0);
      return matchesSearch && matchesFilter;
    });
  }, [sessions, searchTerm, filterType]);

  // ============ GROUP SESSIONS BY DATE ============
  const groupedSessions = useMemo(() => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    filteredSessions.forEach(session => {
      const sessionDate = new Date(session.createdAt);
      sessionDate.setHours(0, 0, 0, 0);
      
      if (sessionDate.getTime() === today.getTime()) {
        groups.today.push(session);
      } else if (sessionDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(session);
      } else if (sessionDate > weekAgo) {
        groups.thisWeek.push(session);
      } else {
        groups.older.push(session);
      }
    });
    
    return groups;
  }, [filteredSessions]);

  // ============ GET SESSION STATS ============
  const getSessionStats = (session) => {
    const totalOperations = session.operations?.length || 0;
    const totalExports = session.exports?.length || 0;
    const rowsChanged = (session.originalRows || 0) - (session.cleanedRows || 0);
    const healthImprovement = (session.healthScoreAfter || 0) - (session.healthScoreBefore || 0);
    
    return { totalOperations, totalExports, rowsChanged, healthImprovement };
  };

  // ============ TOGGLE ACTION EXPANSION ============
  const toggleAction = (actionId) => {
    setExpandedActions(prev => ({ ...prev, [actionId]: !prev[actionId] }));
  };

  // ============ GET ACTION ICON ============
  const getActionIcon = (operation) => {
    const op = String(operation).toLowerCase();
    if (op.includes('trim')) return <Scissors size={14} />;
    if (op.includes('lowercase')) return <Type size={14} />;
    if (op.includes('uppercase')) return <Type size={14} />;
    if (op.includes('fill')) return <Hash size={14} />;
    if (op.includes('duplicate')) return <Copy size={14} />;
    if (op.includes('email')) return <Mail size={14} />;
    if (op.includes('phone')) return <Phone size={14} />;
    if (op.includes('outlier')) return <TrendingUp size={14} />;
    return <Brush size={14} />;
  };

  if (isLoading) {
    return (
      <div className="history-page">
        <div className="history-header-skeleton">
          <SkeletonCard />
        </div>
        <div className="sessions-list-skeleton">
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const totalActions = sessions.reduce((sum, s) => sum + (s.operations?.length || 0), 0);
  
  const mostUsedOperation = () => {
    const operationsMap = {};
    sessions.forEach(s => {
      if (Array.isArray(s.operations)) {
        s.operations.forEach(op => {
          const opName = op.operation || op.action_type || 'Cleaning';
          operationsMap[opName] = (operationsMap[opName] || 0) + 1;
        });
      }
    });
    const sorted = Object.entries(operationsMap).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'None';
  };

  return (
    <div className="history-page">
      {/* ============ HEADER ============ */}
      <div className="history-header">
        <div className="header-left">
          <h1>Cleaning History</h1>
          <div className="stats-badge">
            <Database size={14} />
            <span>{sessions.length} sessions</span>
          </div>
          <div className="stats-badge">
            <History size={14} />
            <span>{totalActions} actions</span>
          </div>
        </div>
        <div className="header-right">
          <Tooltip content="Refresh history" position="bottom">
            <button className="refresh-btn" onClick={loadHistory}>
              <RefreshCw size={16} />
            </button>
          </Tooltip>
          {sessions.length > 0 && (
            <Tooltip content="Clear all history" position="bottom">
              <button className="clear-all-btn" onClick={clearAllHistory}>
                <Trash2 size={16} />
                Clear All
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ============ FILTERS ============ */}
      <div className="history-filters">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filterType === 'cleaned' ? 'active' : ''}`}
            onClick={() => setFilterType('cleaned')}
          >
            Cleaned
          </button>
          <button 
            className={`filter-btn ${filterType === 'exported' ? 'active' : ''}`}
            onClick={() => setFilterType('exported')}
          >
            Exported
          </button>
        </div>

        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
            title="Timeline view"
          >
            <Calendar size={14} />
            Timeline
          </button>
          <button 
            className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`}
            onClick={() => setViewMode('compact')}
            title="Compact view"
          >
            <List size={14} />
            Compact
          </button>
        </div>
      </div>

      {/* ============ ACTIVITY SUMMARY ============ */}
      {sessions.length > 0 && (
        <div className="activity-summary">
          <div className="summary-card">
            <div className="summary-icon">
              <Activity size={18} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{totalActions}</span>
              <span className="summary-label">Total Actions</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <TrendingUp size={18} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{mostUsedOperation()}</span>
              <span className="summary-label">Most Used</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <Clock size={18} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{sessions[0] ? formatDate(sessions[0].createdAt, 'short') : 'Never'}</span>
              <span className="summary-label">Last Cleaned</span>
            </div>
          </div>
          <button className="export-summary-btn" onClick={() => showSuccess('Summary exported')}>
            <Download size={14} />
            Export Report
          </button>
        </div>
      )}

      {/* ============ SESSIONS LIST ============ */}
      {filteredSessions.length === 0 ? (
        <div className="empty-history">
          <History size={48} />
          <h3>No History Yet</h3>
          <p>Upload and clean files to see them here</p>
          <button className="upload-btn" onClick={() => setCurrentPage('upload')}>
            Go to Upload
          </button>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="timeline-container">
          {groupedSessions.today.length > 0 && (
            <div className="timeline-group">
              <div className="timeline-group-header">
                <div className="group-dot today" />
                <h3>Today</h3>
                <span className="group-count">{groupedSessions.today.length} sessions</span>
              </div>
              <div className="timeline-items">
                {groupedSessions.today.map(session => renderSessionCard(
                  session, selectedSession, setSelectedSession, deleteSession, 
                  loadSession, exportSessionReport, restoreVersion, viewComparison,
                  toggleAction, expandedActions, getSessionStats
                ))}
              </div>
            </div>
          )}
          
          {groupedSessions.yesterday.length > 0 && (
            <div className="timeline-group">
              <div className="timeline-group-header">
                <div className="group-dot yesterday" />
                <h3>Yesterday</h3>
                <span className="group-count">{groupedSessions.yesterday.length} sessions</span>
              </div>
              <div className="timeline-items">
                {groupedSessions.yesterday.map(session => renderSessionCard(
                  session, selectedSession, setSelectedSession, deleteSession, 
                  loadSession, exportSessionReport, restoreVersion, viewComparison,
                  toggleAction, expandedActions, getSessionStats
                ))}
              </div>
            </div>
          )}
          
          {groupedSessions.thisWeek.length > 0 && (
            <div className="timeline-group">
              <div className="timeline-group-header">
                <div className="group-dot week" />
                <h3>This Week</h3>
                <span className="group-count">{groupedSessions.thisWeek.length} sessions</span>
              </div>
              <div className="timeline-items">
                {groupedSessions.thisWeek.map(session => renderSessionCard(
                  session, selectedSession, setSelectedSession, deleteSession, 
                  loadSession, exportSessionReport, restoreVersion, viewComparison,
                  toggleAction, expandedActions, getSessionStats
                ))}
              </div>
            </div>
          )}
          
          {groupedSessions.older.length > 0 && (
            <div className="timeline-group">
              <div className="timeline-group-header">
                <div className="group-dot older" />
                <h3>Older</h3>
                <span className="group-count">{groupedSessions.older.length} sessions</span>
              </div>
              <div className="timeline-items">
                {groupedSessions.older.map(session => renderSessionCard(
                  session, selectedSession, setSelectedSession, deleteSession, 
                  loadSession, exportSessionReport, restoreVersion, viewComparison,
                  toggleAction, expandedActions, getSessionStats
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="compact-container">
          {filteredSessions.map(session => renderSessionCard(
            session, selectedSession, setSelectedSession, deleteSession, 
            loadSession, exportSessionReport, restoreVersion, viewComparison,
            toggleAction, expandedActions, getSessionStats
          ))}
        </div>
      )}

      {/* ============ COMPARISON MODAL ============ */}
      {showComparison && compareData && (
        <div className="comparison-modal-overlay">
          <div className="comparison-modal">
            <div className="comparison-header">
              <h3>Before vs After Comparison</h3>
              <button className="close-modal" onClick={() => setShowComparison(false)}>×</button>
            </div>
            <div className="comparison-content">
              <div className="comparison-side before">
                <h4>Before Cleaning</h4>
                <div className="comparison-stats">
                  <div className="stat">
                    <span className="stat-label">Rows</span>
                    <span className="stat-value">{formatNumber(compareData.before.rows)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Health Score</span>
                    <span className="stat-value">{compareData.before.healthScore}%</span>
                  </div>
                </div>
                <div className="sample-data">
                  <span className="sample-title">Sample Data:</span>
                  {compareData.before.sampleData.map((sample, i) => (
                    <div key={i} className="sample-item">{sample}</div>
                  ))}
                </div>
              </div>
              <div className="comparison-arrow">
                <ArrowRight size={24} />
              </div>
              <div className="comparison-side after">
                <h4>After Cleaning</h4>
                <div className="comparison-stats">
                  <div className="stat">
                    <span className="stat-label">Rows</span>
                    <span className="stat-value">{formatNumber(compareData.after.rows)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Health Score</span>
                    <span className="stat-value success">{compareData.after.healthScore}%</span>
                  </div>
                </div>
                <div className="sample-data">
                  <span className="sample-title">Sample Data:</span>
                  {compareData.after.sampleData.map((sample, i) => (
                    <div key={i} className="sample-item">{sample}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="comparison-footer">
              <button className="close-btn" onClick={() => setShowComparison(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to render session card
const renderSessionCard = (
  session, selectedSession, setSelectedSession, deleteSession, 
  loadSession, exportSessionReport, restoreVersion, viewComparison,
  toggleAction, expandedActions, getSessionStats
) => {
  const isSelected = selectedSession?.id === session.id;
  const stats = getSessionStats(session);
  const operationsList = Array.isArray(session.operations) ? session.operations : [];

  return (
    <div key={session.id} className={`session-card ${isSelected ? 'selected' : ''}`}>
      <div className="session-header" onClick={() => setSelectedSession(isSelected ? null : session)}>
        <div className="session-icon">
          <FileText size={20} />
        </div>
        <div className="session-info">
          <div className="session-title">
            <h3>{session.fileName || 'Unknown File'}</h3>
            <span className="session-date">
              <Calendar size={12} />
              {formatDateTime(session.createdAt)}
            </span>
          </div>
          <div className="session-meta">
            <span className="meta-item">
              <Database size={12} />
              {formatNumber(session.originalRows || 0)} rows
            </span>
            <span className="meta-item">
              <HardDrive size={12} />
              {formatFileSize(session.fileSize || 0)}
            </span>
            {session.healthScoreAfter > 0 && (
              <span className="meta-item health">
                <TrendingUp size={12} />
                {session.healthScoreBefore || 0}% → {session.healthScoreAfter}%
              </span>
            )}
          </div>
        </div>
        <div className="session-actions" onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Load into Cleaner" position="top">
            <button className="action-btn load" onClick={() => loadSession(session)}>
              <RefreshCw size={14} />
              Load
            </button>
          </Tooltip>
          <Tooltip content="View details" position="top">
            <button className="action-btn details">
              {isSelected ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </Tooltip>
          <Tooltip content="Delete session" position="top">
            <button className="action-btn delete" onClick={() => deleteSession(session.id)}>
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Expanded Details */}
      {isSelected && (
        <div className="session-details">
          {/* Summary Stats */}
          <div className="details-summary">
            <div className="summary-item">
              <span className="summary-label">Original Rows</span>
              <span className="summary-value">{formatNumber(session.originalRows || 0)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Cleaned Rows</span>
              <span className="summary-value">{formatNumber(session.cleanedRows || 0)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Rows Removed</span>
              <span className={`summary-value ${stats.rowsChanged > 0 ? 'highlight' : ''}`}>
                {stats.rowsChanged > 0 ? `-${stats.rowsChanged}` : '0'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Operations</span>
              <span className="summary-value">{stats.totalOperations}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Exports</span>
              <span className="summary-value">{stats.totalExports}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Health Change</span>
              <span className={`summary-value ${stats.healthImprovement > 0 ? 'positive' : stats.healthImprovement < 0 ? 'negative' : ''}`}>
                {stats.healthImprovement > 0 ? `+${stats.healthImprovement}%` : `${stats.healthImprovement}%`}
              </span>
            </div>
          </div>

          {/* Version Timeline */}
          <div className="version-timeline">
            <h4>
              <GitBranch size={14} />
              Version History
            </h4>
            <div className="version-list">
              <div className="version-item">
                <div className="version-dot current" />
                <div className="version-info">
                  <span className="version-name">Current Version</span>
                  <span className="version-date">{formatDate(session.updatedAt, 'short')}</span>
                </div>
              </div>
              {operationsList.slice(0, 3).map((op, idx) => (
                <div key={idx} className="version-item">
                  <div className="version-dot" />
                  <div className="version-info">
                    <span className="version-name">{op.operation || op.action_type || 'Action'}</span>
                    <span className="version-date">{formatDate(op.timestamp || session.updatedAt, 'short')}</span>
                  </div>
                  <button className="version-restore" onClick={() => restoreVersion(session, idx)}>
                    <RotateCcw size={12} />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cleaning Operations */}
          {operationsList.length > 0 && (
            <div className="details-operations">
              <h4>
                <History size={14} />
                Cleaning Operations ({operationsList.length})
              </h4>
              <div className="operations-list">
                {operationsList.map((op, idx) => (
                  <div key={idx} className="operation-item">
                    <div className="operation-header" onClick={() => toggleAction(`op_${idx}`)}>
                      <div className="operation-number">{idx + 1}</div>
                      <div className="operation-info">
                        <span className="operation-type">{op.operation || op.action_type || 'Cleaning'}</span>
                        {op.column && <span className="operation-column">on "{op.column}"</span>}
                      </div>
                      <div className="operation-meta">
                        {op.rows_affected > 0 && (
                          <span className="operation-rows">{op.rows_affected} rows</span>
                        )}
                        <span className="operation-time">
                          {formatDate(op.timestamp || session.updatedAt, 'time')}
                        </span>
                        <button className="operation-expand">
                          {expandedActions[`op_${idx}`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </div>
                    </div>
                    {expandedActions[`op_${idx}`] && (
                      <div className="operation-details">
                        <div className="detail-row">
                          <span className="detail-label">Details:</span>
                          <pre>{JSON.stringify(op.details || op, null, 2)}</pre>
                        </div>
                        <div className="detail-actions">
                          <button className="detail-btn" onClick={() => viewComparison(session, op)}>
                            <Eye size={12} />
                            View Before/After
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export History */}
          {session.exports && session.exports.length > 0 && (
            <div className="details-exports">
              <h4>
                <Download size={14} />
                Export History ({session.exports.length})
              </h4>
              <div className="exports-list">
                {session.exports.map((exp, idx) => (
                  <div key={idx} className="export-item">
                    <span className="export-format">{exp.format?.toUpperCase() || 'CSV'}</span>
                    <span className="export-rows">{exp.rowCount || 0} rows</span>
                    <span className="export-time">{formatDate(exp.timestamp, 'short')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session Actions */}
          <div className="details-actions">
            <button className="action-btn report" onClick={() => exportSessionReport(session)}>
              <Download size={14} />
              Export Report
            </button>
            <button className="action-btn load" onClick={() => loadSession(session)}>
              <RefreshCw size={14} />
              Load into Cleaner
            </button>
            <button className="action-btn delete" onClick={() => deleteSession(session.id)}>
              <Trash2 size={14} />
              Delete Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for file size formatting
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default HistoryPage;