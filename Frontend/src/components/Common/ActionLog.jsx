// frontend/src/components/Common/ActionLog.jsx
// Professional Action Log Component - Shows detailed changes

import React from 'react';
import { 
  History, CheckCircle, X, Undo, Copy, Scissors, Type, 
  Hash, AlertCircle, Calendar, Mail, Phone, TrendingUp,
  Edit3, Trash2, Eye, Download, RefreshCw, Sparkles,
  ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Activity,
  Database, Layers, BarChart3, Shield, Zap, Rocket, Wand2, Loader2
} from 'lucide-react';
import './ActionLog.css';

const ActionLog = ({ isOpen, onClose, action, onUndo, canUndo = true }) => {
  if (!isOpen || !action) return null;

  const getOperationIcon = (operation) => {
    const icons = {
      'remove_duplicates': <Copy size={14} />,
      'trim_spaces': <Scissors size={14} />,
      'to_lowercase': <Type size={14} />,
      'to_uppercase': <Type size={14} />,
      'to_titlecase': <Edit3 size={14} />,
      'fill_missing_mean': <Hash size={14} />,
      'fill_missing_median': <Hash size={14} />,
      'fill_missing_mode': <Hash size={14} />,
      'fill_constant': <Edit3 size={14} />,
      'fix_encoding': <AlertCircle size={14} />,
      'fix_emails': <Mail size={14} />,
      'format_phones': <Phone size={14} />,
      'remove_outliers': <TrendingUp size={14} />,
      'convert_to_datetime': <Calendar size={14} />,
      'convert_to_numeric': <Hash size={14} />,
      'smart_clean': <Sparkles size={14} />,
      'quick_clean': <Zap size={14} />,
      'cap_outliers': <Shield size={14} />,
      'extract_year': <Calendar size={14} />,
      'calculate_age': <Calendar size={14} />,
      'split_column': <Layers size={14} />,
      'merge_columns': <Layers size={14} />,
      'find_replace': <Edit3 size={14} />,
      'rename_column': <Edit3 size={14} />,
      'drop_column': <Trash2 size={14} />,
    };
    return icons[operation] || <History size={14} />;
  };

  const getOperationColor = (operation) => {
    if (operation.includes('remove')) return '#ef4444';
    if (operation.includes('fill')) return '#10b981';
    if (operation.includes('trim') || operation.includes('case')) return '#8b5cf6';
    if (operation.includes('fix') || operation.includes('format')) return '#f59e0b';
    if (operation.includes('convert')) return '#3b82f6';
    if (operation.includes('extract')) return '#06b6d4';
    if (operation.includes('smart')) return '#6366f1';
    return '#6366f1';
  };

  const formatRowsAffected = (rows) => {
    if (!rows || rows === 0) return '';
    if (rows === 1) return '1 row affected';
    return `${rows.toLocaleString()} rows affected`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleUndoClick = () => {
    if (onUndo) onUndo(action.id);
  };

  return (
    <div className="action-log-overlay" onClick={onClose}>
      <div className="action-log-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="action-log-header">
          <div className="header-left">
            <History size={20} className="header-icon" />
            <h3>Action Log - Detailed Changes</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="action-log-body">
          {/* Summary Card */}
          <div className="summary-card">
            <div className="summary-icon success">
              <CheckCircle size={28} />
            </div>
            <div className="summary-info">
              <div className="summary-title">{action.operation || 'Cleaning Action'}</div>
              <div className="summary-time">{formatTimestamp(action.timestamp)}</div>
            </div>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Total Changes</span>
                <span className="stat-value">{action.totalChanges || action.changesCount || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Rows Affected</span>
                <span className="stat-value">{action.rowsAffected || 0}</span>
              </div>
            </div>
          </div>

          {/* Operations Performed */}
          {action.operationsPerformed && action.operationsPerformed.length > 0 && (
            <div className="operations-section">
              <h4>
                <Activity size={14} />
                Operations Performed
              </h4>
              <div className="operations-list">
                {action.operationsPerformed.map((op, idx) => (
                  <div key={idx} className="operation-item">
                    <div className="op-icon" style={{ backgroundColor: `${getOperationColor(op.operation)}20`, color: getOperationColor(op.operation) }}>
                      {getOperationIcon(op.operation)}
                    </div>
                    <div className="op-details">
                      <span className="op-name">{op.operation?.replace(/_/g, ' ') || 'Operation'}</span>
                      {op.column && <span className="op-column">on "{op.column}"</span>}
                    </div>
                    <div className="op-stats">
                      <span className="op-rows">{formatRowsAffected(op.rows || op.rows_affected)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Changed Cells Preview */}
          {action.changedCells && action.changedCells.length > 0 && (
            <div className="changed-cells-section">
              <h4>
                <Eye size={14} />
                Changed Cells Preview ({action.changedCells.length} changes)
              </h4>
              <div className="cells-table-wrapper">
                <table className="cells-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Column</th>
                      <th>Original Value</th>
                      <th>New Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {action.changedCells.slice(0, 30).map((cell, idx) => (
                      <tr key={idx}>
                        <td className="row-number">{cell.row}</td>
                        <td className="column-name">{cell.column}</td>
                        <td className="old-value" title={cell.old_value}>
                          {cell.old_value === null || cell.old_value === undefined || cell.old_value === '' 
                            ? '(empty)' 
                            : String(cell.old_value).length > 50 
                              ? String(cell.old_value).substring(0, 50) + '...' 
                              : String(cell.old_value)}
                        </td>
                        <td className="new-value" title={cell.new_value}>
                          {cell.new_value === null || cell.new_value === undefined || cell.new_value === '' 
                            ? '(empty)' 
                            : String(cell.new_value).length > 50 
                              ? String(cell.new_value).substring(0, 50) + '...' 
                              : String(cell.new_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {action.changedCells.length > 30 && (
                  <div className="more-hint">
                    + {action.changedCells.length - 30} more changes not shown
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Health Score Improvement */}
          {(action.healthScoreBefore !== undefined || action.healthScoreAfter !== undefined) && (
            <div className="health-section">
              <h4>
                <TrendingUp size={14} />
                Data Quality Improvement
              </h4>
              <div className="health-bars">
                <div className="health-bar-item">
                  <span className="health-label">Before</span>
                  <div className="bar">
                    <div 
                      className="bar-fill before" 
                      style={{ width: `${action.healthScoreBefore || 0}%` }}
                    />
                  </div>
                  <span className="health-value">{action.healthScoreBefore || 0}%</span>
                </div>
                <div className="health-bar-item">
                  <span className="health-label">After</span>
                  <div className="bar">
                    <div 
                      className="bar-fill after" 
                      style={{ width: `${action.healthScoreAfter || 0}%` }}
                    />
                  </div>
                  <span className="health-value">{action.healthScoreAfter || 0}%</span>
                </div>
              </div>
              {(action.healthScoreAfter - action.healthScoreBefore) !== 0 && (
                <div className={`improvement-badge ${action.healthScoreAfter > action.healthScoreBefore ? 'positive' : 'negative'}`}>
                  {action.healthScoreAfter > action.healthScoreBefore ? '↑' : '↓'} 
                  {Math.abs(action.healthScoreAfter - action.healthScoreBefore)}% improvement
                </div>
              )}
            </div>
          )}

          {/* Summary Message */}
          {action.message && (
            <div className="message-section">
              <p>{action.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="action-log-footer">
          {/* FIX (real Undo): restored genuine functionality and copy.
              Disabled via the canUndo prop (backend's single undo
              slot), not permanently disabled as before. */}
          <button
            className="undo-btn"
            onClick={handleUndoClick}
            disabled={!canUndo}
            title={canUndo ? 'Undo this action' : 'Nothing to undo'}
          >
            <Undo size={16} />
            Undo Changes
          </button>
          <button className="close-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionLog;