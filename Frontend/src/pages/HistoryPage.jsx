// frontend/src/pages/HistoryPage.jsx
// Professional History Page - Timeline View

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
  Upload, Brush, Sparkles, Activity, Scissors, Type, Hash, Mail, Phone,
  Info, ArrowUpDown
} from 'lucide-react';
import { SkeletonCard } from '../components/Common/SkeletonLoader';
import Tooltip from '../components/Common/Tooltip';
import './HistoryPage.css';

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
  // NEW: real sort control
  const [sortOrder, setSortOrder] = useState('newest');
  // NEW: loading state for the now-genuine bulk delete
  const [isClearingAll, setIsClearingAll] = useState(false);

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
            operations: cleaningActions
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
  // FIX: previously always removed the session from view and reported
  // "Session deleted" success, even when the backend delete call
  // genuinely failed (the error was caught and silently swallowed). A
  // failed delete meant the session would simply reappear on the next
  // refresh, with no indication anything went wrong. Now only updates
  // the UI and reports success once the backend has genuinely
  // confirmed the deletion.
  const deleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteJob(sessionId);
    } catch (error) {
      console.error('Failed to delete from backend:', error);
      showError('Could not delete this session. Please try again.');
      return;
    }

    setSessions(prev => prev.filter(s => s.id !== sessionId && s.jobId !== sessionId));
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
    }
    showSuccess('Session deleted');
  };

  // ============ CLEAR ALL HISTORY ============
  // FIX (major): previously only cleared local React state and one
  // localStorage cache key — it never called the backend at all. Since
  // sessions are loaded from api.getJobs() on every page load, the
  // "cleared" sessions would silently reappear the moment the page was
  // refreshed or "Refresh" was clicked, directly contradicting the
  // confirmation dialog's "cannot be undone" claim. Now genuinely
  // deletes every session's job via the backend (one request per
  // session, run concurrently), and reports accurately if some
  // deletions failed rather than claiming uniform success.
  const clearAllHistory = async () => {
    if (sessions.length === 0) return;
    const confirmed = window.confirm(
      `Delete all ${sessions.length} session${sessions.length === 1 ? '' : 's'} permanently? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsClearingAll(true);
    try {
      const results = await Promise.allSettled(sessions.map(s => api.deleteJob(s.id)));
      const succeededIds = new Set();
      let failedCount = 0;
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          succeededIds.add(sessions[idx].id);
        } else {
          failedCount++;
        }
      });

      setSessions(prev => prev.filter(s => !succeededIds.has(s.id)));
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      setSelectedSession(null);

      if (failedCount === 0) {
        showSuccess(`Deleted all ${succeededIds.size} session${succeededIds.size === 1 ? '' : 's'}`);
      } else {
        showError(`Deleted ${succeededIds.size} session(s), but ${failedCount} could not be deleted. Please try again.`);
      }
    } finally {
      setIsClearingAll(false);
    }
  };

  // ============ LOAD SESSION INTO CLEANER ============
  const loadSession = (session) => {
    localStorage.setItem('session_to_load', JSON.stringify(session));
    setCurrentPage('cleaner');
    showSuccess(`Loading session: ${session.fileName}`);
  };

  // ============ EXPORT SESSION REPORT (single session — already real, unchanged) ============
  const exportSessionReport = (session) => {
    const report = {
      sessionId: session.id,
      fileName: session.fileName,
      fileSize: session.fileSize,
      originalRows: session.originalRows,
      cleanedRows: session.cleanedRows,
      createdAt: session.createdAt,
      operations: session.operations,
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

  // ============ EXPORT ALL SESSIONS REPORT (NEW — replaces the fake button) ============
  // FIX: previously this button did nothing but fire
  // showSuccess('Summary exported') with no file ever generated.
  // Follows the exact same real pattern as the working per-session
  // export above — a genuine JSON file, built from the currently
  // filtered/sorted session list (so exporting after a search exports
  // just what's visible, which is the more useful behavior).
  const exportAllSessionsReport = () => {
    if (filteredSessions.length === 0) {
      showError('No sessions to export');
      return;
    }
    const report = {
      generatedAt: new Date().toISOString(),
      totalSessions: filteredSessions.length,
      sessions: filteredSessions.map(s => ({
        sessionId: s.id,
        fileName: s.fileName,
        fileSize: s.fileSize,
        originalRows: s.originalRows,
        cleanedRows: s.cleanedRows,
        createdAt: s.createdAt,
        healthScoreBefore: s.healthScoreBefore,
        healthScoreAfter: s.healthScoreAfter,
        operations: s.operations
      }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history_summary_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(`Exported ${filteredSessions.length} session${filteredSessions.length === 1 ? '' : 's'}`);
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

  // ============ FILTER + SORT SESSIONS ============
  // FIX: removed the 'exported' filter branch entirely — exports are
  // never tracked anywhere in this app (session.exports was always a
  // hardcoded empty array), so that filter could only ever return zero
  // results. Keeping a filter option that can never match anything is
  // itself a confirmed-dead UI control.
  const filteredSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    let result = sessions.filter(session => {
      if (!session || !session.fileName) return false;
      
      const matchesSearch = session.fileName.toLowerCase().includes((searchTerm || '').toLowerCase());
      const matchesFilter = filterType === 'all' || 
        (filterType === 'cleaned' && session.operations?.length > 0);
      return matchesSearch && matchesFilter;
    });

    // NEW: real sort, computed from real fields already on each session.
    result = [...result].sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortOrder === 'mostOperations') {
        return (b.operations?.length || 0) - (a.operations?.length || 0);
      }
      // 'newest' (default)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }, [sessions, searchTerm, filterType, sortOrder]);

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
  // FIX: removed totalExports — exports are never tracked, so this
  // was always 0 and rendered as a permanently-dead stat.
  const getSessionStats = (session) => {
    const totalOperations = session.operations?.length || 0;
    const rowsChanged = (session.originalRows || 0) - (session.cleanedRows || 0);
    const healthImprovement = (session.healthScoreAfter || 0) - (session.healthScoreBefore || 0);
    
    return { totalOperations, rowsChanged, healthImprovement };
  };

  const toggleAction = (actionId) => {
    setExpandedActions(prev => ({ ...prev, [actionId]: !prev[actionId] }));
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

  const isFiltered = searchTerm.trim() !== '' || filterType !== 'all';

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
            <Tooltip content="Delete all sessions" position="bottom">
              <button className="clear-all-btn" onClick={clearAllHistory} disabled={isClearingAll}>
                {isClearingAll ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                {isClearingAll ? 'Deleting...' : 'Clear All'}
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
        </div>

        {/* NEW: real sort control */}
        <div className="sort-control">
          <ArrowUpDown size={14} />
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="mostOperations">Most active</option>
          </select>
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

      {/* NEW: honest filtered-count summary, matches the pattern already used on Dashboard/Analysis */}
      {isFiltered && (
        <div className="history-count-summary">
          Showing {filteredSessions.length} of {sessions.length} session{sessions.length === 1 ? '' : 's'}
        </div>
      )}

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
          <button className="export-summary-btn" onClick={exportAllSessionsReport}>
            <Download size={14} />
            Export Report
          </button>
        </div>
      )}

      {/* ============ SESSIONS LIST ============ */}
      {filteredSessions.length === 0 ? (
        <div className="empty-history">
          <History size={48} />
          <h3>{isFiltered ? 'No matching sessions' : 'No History Yet'}</h3>
          <p>{isFiltered ? 'Try a different search or filter.' : 'Upload and clean files to see them here'}</p>
          {!isFiltered && (
            <button className="upload-btn" onClick={() => setCurrentPage('upload')}>
              Go to Upload
            </button>
          )}
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
                  loadSession, exportSessionReport, viewComparison,
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
                  loadSession, exportSessionReport, viewComparison,
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
                  loadSession, exportSessionReport, viewComparison,
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
                  loadSession, exportSessionReport, viewComparison,
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
            loadSession, exportSessionReport, viewComparison,
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
                {/* FIX: previously always rendered a "Sample Data:"
                    label with nothing beneath it, since the backend
                    never populates sample_before/sample_after — looked
                    broken rather than legitimately unavailable. Now
                    states that honestly instead. */}
                {compareData.before.sampleData.length > 0 ? (
                  <div className="sample-data">
                    <span className="sample-title">Sample Data:</span>
                    {compareData.before.sampleData.map((sample, i) => (
                      <div key={i} className="sample-item">{sample}</div>
                    ))}
                  </div>
                ) : (
                  <div className="sample-data-empty">
                    <Info size={12} />
                    <span>Sample data not recorded for this action</span>
                  </div>
                )}
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
                {compareData.after.sampleData.length > 0 ? (
                  <div className="sample-data">
                    <span className="sample-title">Sample Data:</span>
                    {compareData.after.sampleData.map((sample, i) => (
                      <div key={i} className="sample-item">{sample}</div>
                    ))}
                  </div>
                ) : (
                  <div className="sample-data-empty">
                    <Info size={12} />
                    <span>Sample data not recorded for this action</span>
                  </div>
                )}
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
// FIX: removed the restoreVersion parameter/callers entirely — see the
// Version History section below for why.
const renderSessionCard = (
  session, selectedSession, setSelectedSession, deleteSession, 
  loadSession, exportSessionReport, viewComparison,
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
          {/* Summary Stats — "Exports" stat removed (always 0, dead) */}
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
              <span className="summary-label">Health Change</span>
              <span className={`summary-value ${stats.healthImprovement > 0 ? 'positive' : stats.healthImprovement < 0 ? 'negative' : ''}`}>
                {stats.healthImprovement > 0 ? `+${stats.healthImprovement}%` : `${stats.healthImprovement}%`}
              </span>
            </div>
          </div>

          {/* Version Timeline */}
          {/* FIX: previously rendered a "Restore" button next to EVERY
              operation, all of which could only ever show an "not
              available" message when clicked (per the earlier honest-
              messaging fix). Repeating a guaranteed-non-functional
              control on every row reads as more broken, not less, than
              stating the limitation once, clearly, up front. */}
          <div className="version-timeline">
            <h4>
              <GitBranch size={14} />
              Version History
            </h4>
            <p className="version-note">
              <Info size={11} />
              Restoring a previous version isn't available yet — use "Export Report" below to save a snapshot of this session's details.
            </p>
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
                        {/* FIX (professional polish): previously always
                            dumped raw JSON.stringify(op.details || op)
                            into a <pre> block — same real data, now
                            shown as a readable key/value list when
                            `details` is a plain object, with an honest
                            message when there's genuinely nothing
                            recorded. */}
                        {op.details && typeof op.details === 'object' && Object.keys(op.details).length > 0 ? (
                          <div className="detail-kv-grid">
                            {Object.entries(op.details).map(([key, value]) => (
                              <div className="detail-kv-row" key={key}>
                                <span className="detail-kv-key">{key.replace(/_/g, ' ')}</span>
                                <span className="detail-kv-value">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="no-details-message">No additional details recorded for this action.</p>
                        )}
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

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default HistoryPage;