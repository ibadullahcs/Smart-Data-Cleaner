// frontend/src/components/ActionLog.jsx
// Professional Action Log Component - Bottom Panel

import React from 'react';
import { 
  History, CheckCircle, X, Undo, Copy, Scissors, Type, 
  Hash, AlertCircle, Calendar, Mail, Phone, TrendingUp,
  Edit3, Trash2, Eye, Download, RefreshCw, Sparkles,
  ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Activity,
  Database, Layers, BarChart3, Shield, Zap, Rocket, Wand2
} from 'lucide-react';
import './ActionLog.css';

const ActionLog = ({ actions = [], onClose, onUndo, onViewDetails }) => {
  const [expandedItems, setExpandedItems] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusIcon = (status) => {
    switch(status) {
      case 'success': return <CheckCircle size={14} className="status-success" />;
      case 'warning': return <AlertTriangle size={14} className="status-warning" />;
      case 'error': return <AlertCircle size={14} className="status-error" />;
      default: return <Info size={14} className="status-info" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getOperationIcon = (type) => {
    const icons = {
      'trim_whitespace': <Type size={12} />,
      'fill_null': <Database size={12} />,
      'remove_duplicates': <Copy size={12} />,
      'remove_outliers': <AlertTriangle size={12} />,
      'standardize_case': <Type size={12} />,
      'validate_emails': <Mail size={12} />,
      'format_phone': <Phone size={12} />,
      'normalize_dates': <Calendar size={12} />,
      'smart_clean': <Sparkles size={12} />
    };
    return icons[type] || <Settings size={12} />;
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredActions = actions.filter(action => {
    if (filter !== 'all' && action.status !== filter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        action.type?.toLowerCase().includes(searchLower) ||
        action.description?.toLowerCase().includes(searchLower) ||
        action.columns?.some(c => c.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const getStatusCounts = () => {
    const counts = { success: 0, warning: 0, error: 0, info: 0 };
    actions.forEach(a => {
      if (counts[a.status] !== undefined) counts[a.status]++;
      else counts.info++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="action-log-panel">
      <div className="action-log-header">
        <div className="header-left">
          <History size={16} />
          <span>Action Log</span>
          <span className="action-count">{actions.length} operations</span>
        </div>
        <div className="header-right">
          <div className="filter-buttons">
            <button 
              className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({actions.length})
            </button>
            <button 
              className={`filter-chip success ${filter === 'success' ? 'active' : ''}`}
              onClick={() => setFilter('success')}
            >
              ✅ {statusCounts.success}
            </button>
            <button 
              className={`filter-chip warning ${filter === 'warning' ? 'active' : ''}`}
              onClick={() => setFilter('warning')}
            >
              ⚠️ {statusCounts.warning}
            </button>
            <button 
              className={`filter-chip error ${filter === 'error' ? 'active' : ''}`}
              onClick={() => setFilter('error')}
            >
              ❌ {statusCounts.error}
            </button>
          </div>
          <div className="search-box">
            <Search size={12} />
            <input
              type="text"
              placeholder="Search actions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="action-log-list">
        {filteredActions.length === 0 ? (
          <div className="no-actions">
            <p>No actions match your filters</p>
          </div>
        ) : (
          filteredActions.map((action, idx) => (
            <div key={action.id || idx} className={`action-item ${action.status}`}>
              <div className="action-item-header" onClick={() => toggleExpand(action.id)}>
                <div className="action-status">
                  {getStatusIcon(action.status)}
                </div>
                <div className="action-time">
                  <Clock size={10} />
                  {action.time || 'Just now'}
                </div>
                <div className="action-type">
                  {action.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="action-description">
                  {action.description}
                </div>
                <div className="action-meta">
                  {action.rows && <span className="meta-badge">{action.rows} rows</span>}
                  {action.columns && <span className="meta-badge">{action.columns.length} columns</span>}
                </div>
                <button className="expand-btn">
                  {expandedItems[action.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {expandedItems[action.id] && (
                <div className="action-item-details">
                  {action.columns && action.columns.length > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Columns affected:</span>
                      <div className="detail-tags">
                        {action.columns.map(col => (
                          <span key={col} className="detail-tag">{col}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {action.sample && (
                    <div className="detail-row">
                      <span className="detail-label">Sample changes:</span>
                      <div className="sample-changes">
                        {action.sample.map((sample, i) => (
                          <div key={i} className="sample-item">
                            <span className="old-value">{sample.from}</span>
                            <ChevronsRight size={12} />
                            <span className="new-value">{sample.to}</span>
                            <span className="sample-location">Row {sample.row}, {sample.column}</span>
                          </div>
                        ))}
                        {action.totalChanges > action.sample.length && (
                          <div className="more-changes">
                            ... and {action.totalChanges - action.sample.length} more changes
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="detail-actions">
                    <button className="detail-btn" onClick={() => onUndo && onUndo(action)}>
                      <Undo size={12} />
                      Undo
                    </button>
                    <button className="detail-btn" onClick={() => onViewDetails && onViewDetails(action)}>
                      <Eye size={12} />
                      View affected rows
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="action-log-footer">
        <button className="export-btn">
          <Download size={12} />
          Export Log
        </button>
        <button className="clear-btn">
          <Trash2 size={12} />
          Clear All
        </button>
      </div>
    </div>
  );
};

export default ActionLog;