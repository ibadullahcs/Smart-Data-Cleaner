// frontend/src/components/Modals/ReviewModal.jsx
// Review Changes Modal - Shows changes before applying

import React, { useState } from 'react';
import { 
  X, Check, AlertCircle, TrendingUp, TrendingDown, 
  Database, Hash, Edit3, Clock, ChevronDown, ChevronUp,
  FileText, Download, Sparkles, Activity
} from 'lucide-react';
import { formatNumber, formatDate } from '../../utils/formatters';
import './ReviewModal.css';

const ReviewModal = ({ results, onClose, onApply }) => {
  const [expandedChanges, setExpandedChanges] = useState({});
  const [activeTab, setActiveTab] = useState('summary');

  const { changes_count, rows_affected, columns_affected, health_score_before, health_score_after } = results;
  
  const healthImprovement = health_score_after - health_score_before;
  const isImprovement = healthImprovement > 0;

  const toggleChangeExpand = (index) => {
    setExpandedChanges(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="review-modal-overlay">
      <div className="review-modal-container">
        {/* Header */}
        <div className="review-modal-header">
          <div className="header-left">
            <Sparkles size={24} className="header-icon" />
            <div>
              <h2>Review Changes</h2>
              <p className="header-subtitle">Review the cleaning changes before applying</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="review-tabs">
          <button 
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <Activity size={16} />
            Summary
          </button>
          <button 
            className={`tab-btn ${activeTab === 'changes' ? 'active' : ''}`}
            onClick={() => setActiveTab('changes')}
          >
            <Edit3 size={16} />
            Changes ({changes_count})
          </button>
        </div>

        {/* Content */}
        <div className="review-modal-content">
          {activeTab === 'summary' && (
            <div className="summary-tab">
              {/* Health Score */}
              <div className="health-comparison">
                <div className="health-card before">
                  <span className="health-label">Before</span>
                  <span className="health-value">{health_score_before}%</span>
                </div>
                <div className="health-arrow">
                  <TrendingUp size={24} className={isImprovement ? 'positive' : 'negative'} />
                  <span className={`improvement ${isImprovement ? 'positive' : 'negative'}`}>
                    {isImprovement ? '+' : ''}{healthImprovement}%
                  </span>
                </div>
                <div className="health-card after">
                  <span className="health-label">After</span>
                  <span className="health-value success">{health_score_after}%</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon changes">
                    <Edit3 size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{formatNumber(changes_count)}</span>
                    <span className="stat-label">Total Changes</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon rows">
                    <Database size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{formatNumber(rows_affected)}</span>
                    <span className="stat-label">Rows Affected</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon columns">
                    <Hash size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{columns_affected.length}</span>
                    <span className="stat-label">Columns Affected</span>
                  </div>
                </div>
              </div>

              {/* Affected Columns */}
              {columns_affected.length > 0 && (
                <div className="affected-columns">
                  <h4>Columns with Changes</h4>
                  <div className="columns-list">
                    {columns_affected.map((col, idx) => (
                      <span key={idx} className="column-badge">{col}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'changes' && (
            <div className="changes-tab">
              {changes_count === 0 ? (
                <div className="no-changes">
                  <Check size={48} />
                  <h3>No Changes Made</h3>
                  <p>Your data is already clean!</p>
                </div>
              ) : (
                <div className="changes-list">
                  {/* Sample changes would be displayed here */}
                  <div className="change-note">
                    <AlertCircle size={16} />
                    <p>Changes have been applied to your data. Click "Apply Changes" to save.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="review-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="apply-btn" onClick={onApply}>
            <Check size={16} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;