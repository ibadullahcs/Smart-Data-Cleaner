// frontend/src/pages/DashboardPage.jsx
// Complete Dashboard with Real API Integration

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  PieChart as RePieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import { useApp } from '../context/AppContext';
import { api, COLUMN_TYPE_COLORS, COLUMN_TYPE_ICONS, COLUMN_TYPE_LABELS } from '../services/api';
import { formatNumber, formatDate, formatFileSize } from '../utils/formatters';
import { 
  Database, Columns, AlertCircle, CheckCircle, TrendingUp,
  Activity, Shield, BarChart3, Sparkles, RefreshCw,
  AlertTriangle, Info, ArrowRight, Copy, Calendar,
  HardDrive, Clock, Zap, Target, Award, Flag,
  ChevronRight, Download, Eye, EyeOff, Loader2, Search,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { SkeletonCard, SkeletonTable } from '../components/Common/SkeletonLoader';
import Tooltip from '../components/Common/Tooltip';
import './DashboardPage.css';

const PALETTE = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6'
};

const formatRelativeTime = (date) => {
  if (!date) return 'just now';
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(date, 'short');
};

const QualityGauge = ({ score, colorKey }) => {
  const color =
    colorKey === 'excellent' ? PALETTE.success :
    colorKey === 'good' ? PALETTE.info :
    colorKey === 'fair' ? PALETTE.warning : PALETTE.error;

  const data = [{ name: 'quality', value: score, fill: color }];

  return (
    <div className="quality-gauge-wrapper">
      <ResponsiveContainer width="100%" height={160}>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
          barSize={16}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="quality-gauge-center">
        <span className="gauge-score" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
};

const TypeDonut = ({ data }) => (
  <ResponsiveContainer width="100%" height={240}>
    <RePieChart>
      <Pie
        data={data}
        dataKey="count"
        nameKey="type"
        innerRadius={55}
        outerRadius={85}
        paddingAngle={3}
        label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
        labelLine={false}
      >
        {data.map((entry, idx) => (
          <Cell key={idx} fill={COLUMN_TYPE_COLORS[entry.type?.toUpperCase()] || PALETTE.primary} />
        ))}
      </Pie>
      <RechartsTooltip contentStyle={{ fontSize: '0.75rem', borderRadius: 8 }} />
    </RePieChart>
  </ResponsiveContainer>
);

const MissingValuesBarChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
      <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
      <RechartsTooltip
        contentStyle={{ fontSize: '0.75rem', borderRadius: 8 }}
        formatter={(value, name, props) => [`${value}% (${props.payload.missingCount} rows)`, 'Missing']}
      />
      <Bar dataKey="missingPercent" radius={[0, 4, 4, 0]}>
        {data.map((entry, idx) => (
          <Cell
            key={idx}
            fill={entry.missingPercent > 30 ? PALETTE.error : entry.missingPercent > 10 ? PALETTE.warning : PALETTE.success}
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const DashboardPage = () => {
  const { 
    jobId, filename, fileSize, totalRows, totalColumns, qualityScore,
    columnProfile, setCurrentPage, showSuccess, showError,
    setTotalRows: setAppTotalRows, setTotalColumns: setAppTotalColumns,
    setQualityScore: setAppQualityScore, setColumnProfile: setAppColumnProfile,
    setPreviewData: setAppPreviewData
  } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [uploadTime, setUploadTime] = useState(null);
  const [, setLiveTick] = useState(0);

  const [tableSearch, setTableSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    const interval = setInterval(() => setLiveTick(t => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!jobId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const profile = await api.profileData(jobId);

      setDashboardData({
        totalRows: profile.total_rows,
        totalColumns: profile.total_columns,
        qualityScore: profile.quality_score,
        columns: profile.columns,
        previewData: profile.preview_data
      });

      setAppTotalRows(profile.total_rows);
      setAppTotalColumns(profile.total_columns);
      setAppQualityScore(profile.quality_score);
      setAppColumnProfile(profile.columns);
      setAppPreviewData(profile.preview_data);

      setUploadTime(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      showError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, showError, setAppTotalRows, setAppTotalColumns, setAppQualityScore, setAppColumnProfile, setAppPreviewData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = async () => {
    await fetchDashboardData();
    showSuccess('Dashboard refreshed');
  };

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

    missingByColumn.sort((a, b) => b.missingPercent - a.missingPercent);
    const topMissingColumns = missingByColumn.slice(0, 10);
    
    const typeDistribution = {};
    dashboardData.columns.forEach(col => {
      const type = col.detected_type || 'UNKNOWN';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    
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

    const qualityBreakdown = { good: 0, warning: 0, critical: 0 };
    missingByColumn.forEach(col => {
      if (col.missingPercent > 30) qualityBreakdown.critical++;
      else if (col.missingPercent > 10) qualityBreakdown.warning++;
      else qualityBreakdown.good++;
    });

    return {
      totalMissing,
      totalMissingPercent: totalCells > 0 ? (totalMissing / totalCells * 100).toFixed(1) : 0,
      completenessScore,
      topMissingColumns,
      typeDistribution,
      qualityBreakdown,
      alerts: alerts.slice(0, 5),
      typeDistributionArray: Object.entries(typeDistribution).map(([type, count]) => ({
        type,
        count,
        percent: (count / dashboardData.totalColumns * 100).toFixed(1)
      }))
    };
  }, [dashboardData]);

  const filteredSortedColumns = useMemo(() => {
    if (!dashboardData?.columns) return [];
    let cols = dashboardData.columns;

    if (tableSearch.trim()) {
      const term = tableSearch.trim().toLowerCase();
      cols = cols.filter(c =>
        c.name.toLowerCase().includes(term) ||
        (c.detected_type || '').toLowerCase().includes(term)
      );
    }

    if (sortKey) {
      cols = [...cols].sort((a, b) => {
        let av, bv;
        switch (sortKey) {
          case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
          case 'type': av = a.detected_type || ''; bv = b.detected_type || ''; break;
          case 'missing': av = a.null_percent || 0; bv = b.null_percent || 0; break;
          case 'unique': av = a.unique_count || 0; bv = b.unique_count || 0; break;
          case 'confidence': av = a.confidence || 0; bv = b.confidence || 0; break;
          default: return 0;
        }
        if (av < bv) return sortDirection === 'asc' ? -1 : 1;
        if (av > bv) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return cols;
  }, [dashboardData, tableSearch, sortKey, sortDirection]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getQualityColor = () => {
    const score = dashboardData?.qualityScore || 0;
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  };

  const getMissingColor = (percent) => {
    if (percent > 30) return 'critical';
    if (percent > 10) return 'warning';
    return 'good';
  };

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

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} className="sort-icon idle" />;
    return sortDirection === 'asc'
      ? <ArrowUp size={12} className="sort-icon active" />
      : <ArrowDown size={12} className="sort-icon active" />;
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Data Health Dashboard</h1>
          <div className="file-badge">
            <span className="filename">{filename || 'Unknown file'}</span>
            <Tooltip content="When this dashboard data was last fetched" position="top">
              <span className="upload-time">
                <Clock size={12} />
                Refreshed {formatRelativeTime(uploadTime)}
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
          <Tooltip content="Refresh dashboard data" position="top">
            <button className="refresh-btn" onClick={handleManualRefresh}>
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
            <QualityGauge score={currentQuality} colorKey={getQualityColor()} />
          </div>
          <div className="quality-message">
            {currentQuality >= 80 && <span>✅ Excellent! Your data is in great shape.</span>}
            {currentQuality >= 60 && currentQuality < 80 && <span>👍 Good, but some improvements needed.</span>}
            {currentQuality >= 40 && currentQuality < 60 && <span>⚠️ Fair. Run Smart Clean to improve.</span>}
            {currentQuality < 40 && <span>🔴 Poor. Significant cleaning required.</span>}
          </div>
          <div className="quality-breakdown">
            <div className="breakdown-item good">
              <CheckCircle size={13} />
              <span>{dashboardStats.qualityBreakdown.good} good</span>
            </div>
            <div className="breakdown-item warning">
              <AlertTriangle size={13} />
              <span>{dashboardStats.qualityBreakdown.warning} warning</span>
            </div>
            <div className="breakdown-item critical">
              <AlertCircle size={13} />
              <span>{dashboardStats.qualityBreakdown.critical} critical</span>
            </div>
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
        {/* NEW (relabeling): clarifies this is the at-a-glance summary,
            distinct from Analysis's per-column detail view — resolves
            the "these two charts look like unexplained duplicates"
            confusion. */}
        <p className="dashboard-subcaption">
          A quick at-a-glance breakdown of every column by detected type. For a detailed, per-column chart of each numeric and categorical column, see the Analysis page.
        </p>
        {dashboardStats.typeDistributionArray.length > 0 ? (
          <TypeDonut data={dashboardStats.typeDistributionArray} />
        ) : (
          <div className="no-data-message">No column data available</div>
        )}
      </div>

      {/* Missing Values Chart - Top 10 */}
      <div className="missing-chart-section">
        <h3>Missing Values by Column (Top 10)</h3>
        {/* NEW (relabeling): explicitly states this is a deliberate
            top-10 glance view and points to Analysis's complete,
            all-columns ranked chart — resolves the duplicated-section
            confusion between the two pages. */}
        <p className="dashboard-subcaption">
          The 10 columns with the most missing data, for a quick glance. The Analysis page's "Missing Values — All Columns" section shows the complete ranked list across every column — this table's search box below also covers every column.
        </p>
        {dashboardStats.topMissingColumns.length > 0 ? (
          <MissingValuesBarChart data={dashboardStats.topMissingColumns} />
        ) : (
          <div className="no-data-message">No missing values in this dataset 🎉</div>
        )}
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
          <div className="table-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search columns..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="column-table-wrapper">
          <table className="column-health-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Column Name <SortIcon column="name" />
                </th>
                <th className="sortable" onClick={() => handleSort('type')}>
                  Type <SortIcon column="type" />
                </th>
                <th className="sortable" onClick={() => handleSort('missing')}>
                  Missing % <SortIcon column="missing" />
                </th>
                <th>Missing Count</th>
                <th className="sortable" onClick={() => handleSort('unique')}>
                  Unique Values <SortIcon column="unique" />
                </th>
                <th className="sortable" onClick={() => handleSort('confidence')}>
                  Confidence <SortIcon column="confidence" />
                </th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSortedColumns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-rows-cell">
                    No columns match "{tableSearch}"
                  </td>
                </tr>
              ) : (
                filteredSortedColumns.map((col, idx) => {
                  const missingColor = getMissingColor(col.null_percent || 0);
                  const typeKey = (col.detected_type || 'TEXT').toUpperCase();
                  return (
                    <tr key={idx} className={`health-row ${missingColor}`}>
                      <td className="col-name">
                        <span className="col-name-text">{col.name}</span>
                      </td>
                      <td className="col-type">
                        <span
                          className="type-badge"
                          style={{
                            background: `${COLUMN_TYPE_COLORS[typeKey] || '#94a3b8'}1a`,
                            color: COLUMN_TYPE_COLORS[typeKey] || '#94a3b8'
                          }}
                        >
                          {COLUMN_TYPE_ICONS[typeKey] || '📊'} {COLUMN_TYPE_LABELS[typeKey] || col.detected_type || 'Text'}
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;