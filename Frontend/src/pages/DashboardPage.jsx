// frontend/src/pages/DashboardPage.jsx
// Complete Dashboard with Real API Integration

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { formatNumber, formatDate, formatFileSize } from '../utils/formatters';
import { 
  Database, Columns, AlertCircle, CheckCircle, TrendingUp,
  Activity, Shield, BarChart3, Sparkles, RefreshCw,
  AlertTriangle, Info, ArrowRight, Copy, Calendar,
  HardDrive, Clock, Zap, Target, Award, Flag,
  ChevronRight, Download, Eye, EyeOff, Loader2
} from 'lucide-react';
import { SkeletonCard, SkeletonTable } from '../components/Common/SkeletonLoader';
import Tooltip from '../components/Common/Tooltip';
import './DashboardPage.css';

const DashboardPage = () => {
  const { 
    jobId, filename, fileSize, totalRows, totalColumns, qualityScore,
    columnProfile, setCurrentPage, showSuccess, showError
  } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [uploadTime, setUploadTime] = useState(null);

  // Fetch dashboard data from backend
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!jobId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Get profile data (already in context, but refresh)
        const profile = await api.profileData(jobId);
        
        setDashboardData({
          totalRows: profile.total_rows,
          totalColumns: profile.total_columns,
          qualityScore: profile.quality_score,
          columns: profile.columns,
          previewData: profile.preview_data
        });
        
        setUploadTime(new Date());
        
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        showError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [jobId, showError]);

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    if (!dashboardData || !dashboardData.columns) return null;

    let totalMissing = 0;
    let totalCells = (dashboardData.totalRows || 0) * (dashboardData.totalColumns || 0);
    let missingByColumn = [];

    dashboardData.columns.forEach(col => {
      const missingCount = col.null_count || 0;
      const missingPercent = col.null_percent || 0;
      totalMissing += missingCount;
      
      missingByColumn.push({
        name: col.name,
        missingCount,
        missingPercent,
        type: col.detected_type || 'TEXT',
        uniqueCount: col.unique_count || 0,
        confidence: col.confidence || 0
      });
    });

    // Sort by missing percent (highest first)
    missingByColumn.sort((a, b) => b.missingPercent - a.missingPercent);
    
    // Top 10 columns with highest missing values
    const topMissingColumns = missingByColumn.slice(0, 10);
    
    // Calculate type distribution
    const typeDistribution = {};
    dashboardData.columns.forEach(col => {
      const type = col.detected_type || 'UNKNOWN';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    
    // Generate alerts
    const alerts = [];
    
    missingByColumn.forEach(col => {
      if (col.missingPercent > 20) {
        alerts.push({
          severity: 'high',
          column: col.name,
          issue: `${col.missingPercent.toFixed(1)}% missing values`,
          affectedRows: col.missingCount,
          suggestion: 'Fill missing values',
          action: 'fill_missing'
        });
      } else if (col.missingPercent > 10) {
        alerts.push({
          severity: 'medium',
          column: col.name,
          issue: `${col.missingPercent.toFixed(1)}% missing values`,
          affectedRows: col.missingCount,
          suggestion: 'Review missing values',
          action: 'review'
        });
      }
    });
    
    const completenessScore = totalCells > 0 
      ? ((totalCells - totalMissing) / totalCells * 100).toFixed(1) 
      : 0;

    return {
      totalMissing,
      totalMissingPercent: totalCells > 0 ? (totalMissing / totalCells * 100).toFixed(1) : 0,
      completenessScore,
      topMissingColumns,
      typeDistribution,
      alerts: alerts.slice(0, 5), // Show top 5 alerts
      typeDistributionArray: Object.entries(typeDistribution).map(([type, count]) => ({
        type,
        count,
        percent: (count / dashboardData.totalColumns * 100).toFixed(1)
      }))
    };
  }, [dashboardData]);

  const getQualityColor = () => {
    const score = dashboardData?.qualityScore || 0;
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  };

  const getQualityLabel = () => {
    const score = dashboardData?.qualityScore || 0;
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getMissingColor = (percent) => {
    if (percent > 30) return 'critical';
    if (percent > 10) return 'warning';
    return 'good';
  };

  const getTypeIcon = (type) => {
    const icons = {
      'EMAIL': '📧',
      'PHONE': '📞',
      'DATE': '📅',
      'CURRENCY': '💰',
      'NUMERIC': '#️⃣',
      'AGE': '🎂',
      'NAME': '👤',
      'CATEGORICAL': '🏷️',
      'TEXT': '📝',
      'BOOLEAN': '✅'
    };
    return icons[type] || '📊';
  };

  // If no jobId, show empty state
  if (!jobId) {
    return (
      <div className="dashboard-empty">
        <div className="empty-state">
          <Database size={48} />
          <h3>No Data Loaded</h3>
          <p>Upload a file to see your dashboard</p>
          <button className="upload-btn" onClick={() => setCurrentPage('upload')}>
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  // Show loading skeleton
  if (isLoading || !dashboardStats) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header-skeleton">
          <SkeletonCard />
        </div>
        <div className="stats-grid-skeleton">
          {[1, 2, 3, 4].map((_, i) => (
            <div key={i} className="stat-card-skeleton" />
          ))}
        </div>
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  const currentQuality = dashboardData?.qualityScore || 0;

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Data Health Dashboard</h1>
          <div className="file-badge">
            <span className="filename">{filename || 'Unknown file'}</span>
            <Tooltip content="Upload timestamp" position="top">
              <span className="upload-time">
                <Clock size={12} />
                {uploadTime ? formatDate(uploadTime, 'short') : 'Just now'}
              </span>
            </Tooltip>
            <Tooltip content="File size" position="top">
              <span className="file-size">
                <HardDrive size={12} />
                {formatFileSize(fileSize)}
              </span>
            </Tooltip>
          </div>
        </div>
        <div className="header-right">
          <Tooltip content="Refresh dashboard" position="top">
            <button className="refresh-btn" onClick={() => window.location.reload()}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon rows"><Database size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{formatNumber(dashboardData.totalRows)}</span>
            <span className="stat-label">Total Rows</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon columns"><Columns size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData.totalColumns}</span>
            <span className="stat-label">Total Columns</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon duplicates"><Copy size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{formatNumber(dashboardStats.totalMissing)}</span>
            <span className="stat-label">Missing Values</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon completeness"><Target size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{dashboardStats.completenessScore}%</span>
            <span className="stat-label">Data Completeness</span>
          </div>
        </div>
      </div>

      {/* Quality Section */}
      <div className="quality-section">
        <div className="quality-card">
          <div className="quality-header">
            <Award size={18} />
            <span>Data Quality Score</span>
          </div>
          <div className={`quality-score-display ${getQualityColor()}`}>
            <div className="score-gauge">
              <svg className="gauge-svg" viewBox="0 0 120 60">
                <path
                  className="gauge-bg"
                  d="M 10 50 A 50 50 0 0 1 110 50"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  className="gauge-fill"
                  d="M 10 50 A 50 50 0 0 1 110 50"
                  fill="none"
                  stroke={currentQuality >= 80 ? 'var(--success)' : currentQuality >= 60 ? 'var(--info)' : currentQuality >= 40 ? 'var(--warning)' : 'var(--error)'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(currentQuality / 100) * 314} 314`}
                />
              </svg>
              <div className="score-value">{currentQuality}%</div>
            </div>
          </div>
          <div className="quality-message">
            {currentQuality >= 80 && <span>✅ Excellent! Your data is in great shape.</span>}
            {currentQuality >= 60 && currentQuality < 80 && <span>👍 Good, but some improvements needed.</span>}
            {currentQuality >= 40 && currentQuality < 60 && <span>⚠️ Fair. Run Smart Clean to improve.</span>}
            {currentQuality < 40 && <span>🔴 Poor. Significant cleaning required.</span>}
          </div>
        </div>

        <div className="quick-actions">
          <h4>Quick Actions</h4>
          <div className="action-buttons">
            <button className="action-btn primary" onClick={() => setCurrentPage('cleaner')}>
              <Sparkles size={16} />
              Go to Cleaner
              <ArrowRight size={14} />
            </button>
            <button className="action-btn secondary" onClick={() => setCurrentPage('analysis')}>
              <BarChart3 size={16} />
              Deep Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Type Distribution Chart */}
      <div className="type-distribution-section">
        <h3>Column Type Distribution</h3>
        <div className="type-chart">
          {dashboardStats.typeDistributionArray.map((item, idx) => (
            <div key={idx} className="type-bar-item">
              <div className="type-label">
                <span>{getTypeIcon(item.type)} {item.type}</span>
                <span>{item.count} columns ({item.percent}%)</span>
              </div>
              <div className="type-bar-container">
                <div 
                  className="type-bar" 
                  style={{ width: `${item.percent}%`, backgroundColor: `hsl(${idx * 40}, 70%, 50%)` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Values Chart - Top 10 */}
      <div className="missing-chart-section">
        <h3>Missing Values by Column (Top 10)</h3>
        <div className="missing-chart">
          {dashboardStats.topMissingColumns.map((col, idx) => (
            <div key={idx} className="missing-bar-item">
              <div className="missing-label">
                <span className="missing-col-name">{col.name}</span>
                <span className="missing-percent-value">{col.missingPercent.toFixed(1)}%</span>
              </div>
              <div className="missing-bar-container">
                <div 
                  className={`missing-bar ${getMissingColor(col.missingPercent)}`}
                  style={{ width: `${Math.min(col.missingPercent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts Section */}
      {dashboardStats.alerts.length > 0 && (
        <div className="alert-section">
          <h3>🚨 Issues Needing Attention</h3>
          {dashboardStats.alerts.map((alert, idx) => (
            <div key={idx} className={`alert-card ${alert.severity}`}>
              <AlertTriangle size={18} />
              <div className="alert-content">
                <strong>Column "{alert.column}":</strong> {alert.issue}
                <span className="alert-detail">({alert.affectedRows.toLocaleString()} rows affected)</span>
              </div>
              <button 
                className="alert-action" 
                onClick={() => setCurrentPage('cleaner')}
              >
                Fix in Cleaner
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Column Health Table */}
      <div className="column-health-section">
        <div className="section-header">
          <h3>Column Health Report</h3>
        </div>
        <div className="column-table-wrapper">
          <table className="column-health-table">
            <thead>
              <tr>
                <th>Column Name</th>
                <th>Type</th>
                <th>Missing %</th>
                <th>Missing Count</th>
                <th>Unique Values</th>
                <th>Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.columns.map((col, idx) => {
                const missingColor = getMissingColor(col.null_percent || 0);
                return (
                  <tr key={idx} className={`health-row ${missingColor}`}>
                    <td className="col-name">
                      <span className="col-name-text">{col.name}</span>
                    </td>
                    <td className="col-type">
                      <span className={`type-badge ${col.detected_type?.toLowerCase() || 'text'}`}>
                        {col.detected_type || 'TEXT'}
                      </span>
                    </td>
                    <td className="col-missing">
                      <div className="missing-bar-container">
                        <div 
                          className={`missing-bar ${missingColor}`} 
                          style={{ width: `${Math.min(col.null_percent || 0, 100)}%` }}
                        />
                        <span className="missing-percent">{(col.null_percent || 0).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="col-count">{formatNumber(col.null_count || 0)}</td>
                    <td className="col-unique">{formatNumber(col.unique_count || 0)}</td>
                    <td className="col-confidence">
                      <span className={`confidence-badge ${(col.confidence || 0) >= 0.8 ? 'high' : (col.confidence || 0) >= 0.6 ? 'medium' : 'low'}`}>
                        {Math.round((col.confidence || 0) * 100)}%
                      </span>
                    </td>
                    <td className="col-status">
                      <span className={`status-badge ${missingColor}`}>
                        {missingColor === 'critical' && <AlertCircle size={12} />}
                        {missingColor === 'warning' && <AlertTriangle size={12} />}
                        {missingColor === 'good' && <CheckCircle size={12} />}
                        {missingColor === 'critical' && 'Critical'}
                        {missingColor === 'warning' && 'Warning'}
                        {missingColor === 'good' && 'Good'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;