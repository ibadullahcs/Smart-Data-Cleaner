// frontend/src/pages/AnalysisPage.jsx
// Professional Analysis Page - Deep Insights with Real Charts

import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { useApp } from '../context/AppContext';
import { api, COLUMN_TYPE_COLORS, COLUMN_TYPE_ICONS, COLUMN_TYPE_LABELS } from '../services/api';
import { formatNumber } from '../utils/formatters';
import { 
  BarChart3, TrendingUp, TrendingDown, AlertTriangle, AlertCircle, CheckCircle,
  Download, Copy, Eye, EyeOff, ChevronDown, ChevronUp,
  Activity, PieChart, Hash, Calendar, Mail, Phone,
  DollarSign, Users, MapPin, Link, Type, Filter,
  Search, X, Maximize2, Minimize2, HelpCircle,
  ArrowUp, ArrowDown, Target, Zap, Shield, Award,
  Layers, Grid, List, ExternalLink, Info, Sliders,
  Columns, Database, GitBranch, Brush, Lightbulb
} from 'lucide-react';
import { SkeletonCard, SkeletonTable } from '../components/Common/SkeletonLoader';
import Tooltip from '../components/Common/Tooltip';
import './AnalysisPage.css';

const PALETTE = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6'
};

const ANIMATION_DURATIONS = { slow: 1400, normal: 800, fast: 350 };

const HistogramChart = ({ data, color = PALETTE.primary, animate = true, duration = 800 }) => (
  <div className="recharts-wrapper-sm">
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9 }}
          angle={-35}
          textAnchor="end"
          height={40}
          interval={0}
        />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
        <RechartsTooltip
          contentStyle={{ fontSize: '0.75rem', borderRadius: 8 }}
          formatter={(value) => [value, 'Count']}
        />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={animate} animationDuration={duration} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const FrequencyChart = ({ data, color = PALETTE.secondary, animate = true, duration = 800 }) => (
  <div className="recharts-wrapper-sm">
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 28)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="value"
          tick={{ fontSize: 10 }}
          width={90}
        />
        <RechartsTooltip
          contentStyle={{ fontSize: '0.75rem', borderRadius: 8 }}
          formatter={(value, name, props) => [`${value} (${props.payload.percent}%)`, 'Count']}
        />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} isAnimationActive={animate} animationDuration={duration} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const MissingValuesChart = ({ data, animate = true, duration = 800 }) => (
  <div className="recharts-wrapper-sm">
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 30)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
        <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
        <RechartsTooltip
          contentStyle={{ fontSize: '0.75rem', borderRadius: 8 }}
          formatter={(value, name, props) => [`${value}% (${props.payload.missingCount} rows)`, 'Missing']}
        />
        <Bar dataKey="missingPercent" radius={[0, 4, 4, 0]} isAnimationActive={animate} animationDuration={duration}>
          {data.map((entry, idx) => (
            <Cell
              key={idx}
              fill={entry.missingPercent > 20 ? PALETTE.error : entry.missingPercent > 10 ? PALETTE.warning : PALETTE.success}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const TypeDonutChart = ({ data, animate = true, duration = 800 }) => (
  <div className="recharts-wrapper-sm">
    <ResponsiveContainer width="100%" height={220}>
      <RePieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="type"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          isAnimationActive={animate}
          animationDuration={duration}
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip contentStyle={{ fontSize: '0.75rem', borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
      </RePieChart>
    </ResponsiveContainer>
  </div>
);

// NEW: severity-to-icon/color mapping for the per-column issues list,
// reusing the same "issues" array the backend already computes in
// profiler.py's _detect_issues() — this data existed and was fully
// computed on every upload but was never shown anywhere in the UI.
const getSeverityIcon = (severity) => {
  switch (severity) {
    case 'high': return <AlertTriangle size={12} />;
    case 'medium': return <AlertCircle size={12} />;
    default: return <Info size={12} />;
  }
};

const AnalysisPage = () => {
  const { 
    jobId, filename, totalRows, totalColumns, columnProfile, previewData,
    setCurrentPage, showSuccess, showError, settings
  } = useApp();

  const chartsAnimated = settings?.analysis?.enableAnimations ?? true;
  const chartDuration = ANIMATION_DURATIONS[settings?.analysis?.animationSpeed] ?? ANIMATION_DURATIONS.normal;
  const showAdvancedInsights = settings?.analysis?.showAdvancedInsights ?? true;

  const [isLoading, setIsLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [filterRange, setFilterRange] = useState({ min: '', max: '' });
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    columnAnalysis: true,
    otherColumns: true,
    correlations: true,
    missingValues: true,
    outliers: true,
    insights: true
  });
  const [viewMode, setViewMode] = useState('grid');

  const detectedTypeByName = useMemo(() => {
    const map = {};
    (columnProfile || []).forEach(col => {
      map[col.name] = (col.detected_type || '').toUpperCase();
    });
    return map;
  }, [columnProfile]);

  const getTypeBadge = (colName, fallbackLabel) => {
    const type = detectedTypeByName[colName];
    if (type && COLUMN_TYPE_LABELS[type]) {
      return {
        label: COLUMN_TYPE_LABELS[type],
        icon: COLUMN_TYPE_ICONS[type] || '📊',
        color: COLUMN_TYPE_COLORS[type] || PALETTE.primary
      };
    }
    return { label: fallbackLabel, icon: '📊', color: PALETTE.primary };
  };

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!jobId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const data = await api.getAnalysis(jobId);
        setAnalysisData(data);
        setUsedFallback(false);
      } catch (error) {
        console.error('Failed to load analysis:', error);
        showError('Failed to load analysis data. Showing an estimate based on locally available data instead.');
        if (columnProfile && columnProfile.length > 0) {
          setAnalysisData(generateAnalysisFromProfile());
          setUsedFallback(true);
        } else {
          setAnalysisData({
            summary: { totalRows: 0, totalColumns: 0, numericColumns: 0, categoricalColumns: 0, totalMissing: 0, completeness: 100 },
            histograms: {},
            frequencies: {},
            correlations: [],
            missingByColumn: [],
            outliers: {},
            insights: [],
            numericCols: [],
            categoricalCols: [],
            typeDistribution: []
          });
          setUsedFallback(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const generateAnalysisFromProfile = () => {
    if (!columnProfile || columnProfile.length === 0) {
      return {
        summary: { totalRows: 0, totalColumns: 0, numericColumns: 0, categoricalColumns: 0, totalMissing: 0, completeness: 100 },
        histograms: {},
        frequencies: {},
        correlations: [],
        missingByColumn: [],
        outliers: {},
        insights: [],
        numericCols: [],
        categoricalCols: [],
        typeDistribution: []
      };
    }

    const numericCols = columnProfile.filter(c => 
      ['NUMERIC', 'CURRENCY', 'AGE'].includes(c.detected_type)
    );
    const categoricalCols = columnProfile.filter(c => 
      ['CATEGORICAL', 'GENDER', 'CITY', 'PROVINCE'].includes(c.detected_type)
    );
    const textCols = columnProfile.filter(c => 
      ['TEXT', 'NAME', 'ADDRESS', 'EMAIL', 'PHONE'].includes(c.detected_type)
    );
    const dateCols = columnProfile.filter(c => 
      ['DATE', 'DATETIME'].includes(c.detected_type)
    );

    const histograms = {};
    numericCols.forEach(col => {
      const built = computeHistogramFromPreview(col.name, col.min, col.max, previewData);
      if (built) {
        histograms[col.name] = built;
      }
    });

    const frequencies = {};
    categoricalCols.forEach(col => {
      if (col.top_values && col.top_values.length > 0) {
        frequencies[col.name] = {
          values: col.top_values.map(t => t.value),
          counts: col.top_values.map(t => t.count),
          percentages: col.top_values.map(t => t.percent)
        };
      }
    });

    const missingByColumn = columnProfile.map(col => ({
      name: col.name,
      missingPercent: col.null_percent || 0,
      missingCount: col.null_count || 0
    })).sort((a, b) => b.missingPercent - a.missingPercent);

    const outliers = {};
    numericCols.forEach(col => {
      const found = computeOutliersFromPreview(col.name, col.q1, col.iqr, previewData);
      if (found) {
        outliers[col.name] = found;
      }
    });

    const insights = [];

    insights.push({
      type: 'info',
      title: 'Estimated Analysis',
      description: 'The full analysis service was unavailable, so this view uses statistics computed from your dataset\'s real column profile and a sample of up to 500 rows, rather than the complete dataset.',
      recommendation: 'Try refreshing this page, or re-run analysis once the connection is stable'
    });

    if (numericCols.some(c => c.name.toLowerCase().includes('age'))) {
      insights.push({
        type: 'warning',
        title: 'Age Column Issues',
        description: 'Age column has outliers and missing values that may affect analysis.',
        recommendation: 'Consider capping outliers at 0-120 range'
      });
    }
    
    if (categoricalCols.some(c => c.name.toLowerCase().includes('city'))) {
      insights.push({
        type: 'info',
        title: 'City Distribution',
        description: 'City column may be imbalanced. Top cities may dominate the data.',
        recommendation: 'Consider grouping rare cities into "Other" category'
      });
    }

    if (missingByColumn.some(c => c.missingPercent > 10)) {
      insights.push({
        type: 'warning',
        title: 'Missing Values Detected',
        description: 'Some columns have significant missing values that may affect analysis.',
        recommendation: 'Use the Cleaner page to fill missing values'
      });
    }

    return {
      summary: {
        totalRows: totalRows || 0,
        totalColumns: totalColumns || 0,
        numericColumns: numericCols.length,
        categoricalColumns: categoricalCols.length,
        textColumns: textCols.length,
        dateColumns: dateCols.length,
        totalMissing: columnProfile.reduce((sum, c) => sum + (c.null_count || 0), 0),
        completeness: 100 - (columnProfile.reduce((sum, c) => sum + (c.null_percent || 0), 0) / Math.max(columnProfile.length, 1))
      },
      histograms,
      frequencies,
      correlations: [],
      missingByColumn,
      outliers,
      insights,
      numericCols: numericCols.map(c => c.name),
      categoricalCols: categoricalCols.map(c => c.name),
      typeDistribution: [
        { type: 'Numeric', count: numericCols.length, color: PALETTE.primary },
        { type: 'Categorical', count: categoricalCols.length, color: PALETTE.secondary },
        { type: 'Date', count: dateCols.length, color: PALETTE.success },
        { type: 'Text', count: textCols.length, color: PALETTE.warning }
      ]
    };
  };

  // NEW: every column NOT covered by the numeric/categorical chart
  // sections above — this is the actual fix for "graph not showing
  // for some columns". Previously TEXT, DATE, EMAIL, PHONE, URL, ID,
  // and any other type simply had no card anywhere on this page.
  // Uses columnProfile directly (always populated from AppContext,
  // regardless of whether the backend /analyze call succeeded or the
  // client-side fallback ran), so it works in both cases.
  const otherColumns = useMemo(() => {
    if (!columnProfile || columnProfile.length === 0) return [];
    const covered = new Set([
      ...(analysisData?.numericCols || []),
      ...(analysisData?.categoricalCols || [])
    ]);
    return columnProfile.filter(col => !covered.has(col.name));
  }, [columnProfile, analysisData]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getCorrelationColor = (corr) => {
    const abs = Math.abs(corr);
    if (abs > 0.7) return corr > 0 ? PALETTE.success : PALETTE.error;
    if (abs > 0.4) return corr > 0 ? '#34d399' : '#f87171';
    return '#94a3b8';
  };

  const getCorrelationStrengthLabel = (corr) => {
    const abs = Math.abs(corr);
    const strength = abs > 0.7 ? 'Strong' : abs > 0.4 ? 'Moderate' : 'Weak';
    const direction = corr >= 0 ? 'positive' : 'negative';
    return `${strength} ${direction} correlation`;
  };

  const getInsightIcon = (type) => {
    switch(type) {
      case 'warning': return <AlertTriangle size={16} />;
      case 'success': return <CheckCircle size={16} />;
      case 'info': return <Info size={16} />;
      default: return <Zap size={16} />;
    }
  };

  const insightCounts = useMemo(() => {
    const counts = { warning: 0, info: 0, success: 0 };
    (analysisData?.insights || []).forEach(i => {
      if (counts[i.type] !== undefined) counts[i.type]++;
    });
    return counts;
  }, [analysisData]);

  const handleExportReport = () => {
    if (!analysisData) {
      showError('No analysis data available to export');
      return;
    }
    try {
      const doc = new jsPDF();
      const marginLeft = 14;
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(18);
      doc.text('Smart Cleaner - Data Analysis Report', marginLeft, y);
      y += 10;

      doc.setFontSize(10);
      doc.text(`File: ${filename || 'Unknown'}`, marginLeft, y);
      y += 6;
      doc.text(`Generated: ${new Date().toLocaleString()}`, marginLeft, y);
      y += 10;

      doc.setFontSize(13);
      doc.text('Summary', marginLeft, y);
      y += 7;
      doc.setFontSize(10);
      const summaryLines = [
        `Total Rows: ${formatNumber(analysisData.summary?.totalRows || 0)}`,
        `Total Columns: ${analysisData.summary?.totalColumns || 0}`,
        `Numeric Columns: ${analysisData.summary?.numericColumns || 0}`,
        `Categorical Columns: ${analysisData.summary?.categoricalColumns || 0}`,
        `Total Missing Values: ${formatNumber(analysisData.summary?.totalMissing || 0)}`,
        `Completeness: ${completeness}%`
      ];
      summaryLines.forEach(line => {
        doc.text(line, marginLeft, y);
        y += 6;
      });
      y += 4;

      if (analysisData.correlations && analysisData.correlations.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.text('Notable Correlations', marginLeft, y);
        y += 8;
        doc.setFontSize(10);
        analysisData.correlations.forEach((c) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`${c.col1} <-> ${c.col2}: ${c.correlation.toFixed(2)} (${getCorrelationStrengthLabel(c.correlation)})`, marginLeft, y);
          y += 6;
        });
        y += 4;
      }

      const outlierEntries = Object.entries(analysisData.outliers || {});
      if (outlierEntries.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.text('Outliers Detected', marginLeft, y);
        y += 8;
        doc.setFontSize(10);
        outlierEntries.forEach(([colName, info]) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`${colName}: ${info.count} outlier value(s)`, marginLeft, y);
          y += 6;
        });
        y += 4;
      }

      if (analysisData.insights && analysisData.insights.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.text('Insights', marginLeft, y);
        y += 8;
        doc.setFontSize(10);
        analysisData.insights.forEach((insight, idx) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${insight.title}`, marginLeft, y);
          y += 6;
          doc.setFont(undefined, 'normal');
          const descLines = doc.splitTextToSize(insight.description || '', pageWidth - marginLeft * 2);
          doc.text(descLines, marginLeft, y);
          y += descLines.length * 5 + 2;
          if (insight.recommendation) {
            const recLines = doc.splitTextToSize(`Recommendation: ${insight.recommendation}`, pageWidth - marginLeft * 2);
            doc.text(recLines, marginLeft, y);
            y += recLines.length * 5 + 4;
          } else {
            y += 2;
          }
        });
      } else {
        doc.setFontSize(10);
        doc.text('No significant issues detected.', marginLeft, y);
      }

      const safeName = (filename || 'data').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`analysis_report_${safeName}.pdf`);
      showSuccess('Analysis report downloaded as PDF');
    } catch (err) {
      console.error('PDF export error:', err);
      showError('Failed to generate PDF report');
    }
  };

  const handleCopyInsights = async () => {
    if (!analysisData) {
      showError('No analysis data available to copy');
      return;
    }
    try {
      const lines = [
        `Smart Cleaner Analysis Summary - ${filename || 'Unknown'}`,
        `Total Rows: ${analysisData.summary?.totalRows || 0}, Total Columns: ${analysisData.summary?.totalColumns || 0}`,
        `Completeness: ${completeness}%`,
        '',
        'Insights:'
      ];
      if (analysisData.insights && analysisData.insights.length > 0) {
        analysisData.insights.forEach((insight, idx) => {
          lines.push(`${idx + 1}. ${insight.title}: ${insight.description}`);
          if (insight.recommendation) lines.push(`   Recommendation: ${insight.recommendation}`);
        });
      } else {
        lines.push('No significant issues detected.');
      }
      await navigator.clipboard.writeText(lines.join('\n'));
      showSuccess('Insights copied to clipboard');
    } catch (err) {
      console.error('Clipboard copy error:', err);
      showError('Could not copy to clipboard. Your browser may not support this or permission was denied.');
    }
  };

  if (!jobId) {
    return (
      <div className="analysis-empty">
        <div className="empty-state">
          <BarChart3 size={48} />
          <h3>No Data Loaded</h3>
          <p>Upload a file to see analysis</p>
          <button className="upload-btn" onClick={() => setCurrentPage('upload')}>
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !analysisData) {
    return (
      <div className="analysis-page">
        <div className="analysis-header-skeleton">
          <SkeletonCard />
        </div>
        <div className="stats-grid-skeleton">
          {Array(4).fill().map((_, i) => (
            <div key={i} className="stat-card-skeleton" />
          ))}
        </div>
        <SkeletonTable rows={4} columns={4} />
      </div>
    );
  }

  const totalCells = (analysisData.summary?.totalRows || 0) * (analysisData.summary?.totalColumns || 0);
  const completeness = totalCells > 0 ? ((totalCells - (analysisData.summary?.totalMissing || 0)) / totalCells * 100).toFixed(1) : '100';

  const truncation = analysisData.truncationInfo;

  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <div className="header-left">
          <h1>Data Analysis</h1>
          <div className="file-info">
            <span className="filename">{filename || 'Unknown'}</span>
            <span className="stats">{formatNumber(analysisData.summary?.totalRows || 0)} rows · {analysisData.summary?.totalColumns || 0} columns</span>
            {usedFallback && (
              <span className="fallback-badge" title="This analysis is estimated from locally available data, not the full backend analysis">
                <AlertTriangle size={11} /> Estimated
              </span>
            )}
          </div>
        </div>
        <div className="header-right">
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
          <Tooltip content="Export analysis report as PDF" position="bottom">
            <button className="export-btn" onClick={handleExportReport}>
              <Download size={16} />
              Export
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <Filter size={14} />
          <select 
            className="filter-select"
            value={selectedColumn || ''}
            onChange={(e) => setSelectedColumn(e.target.value)}
          >
            <option value="">All Columns</option>
            {(analysisData.numericCols || []).map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
            {(analysisData.categoricalCols || []).map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
        {selectedColumn && (
          <>
            <div className="filter-group">
              <span className="filter-label">Min:</span>
              <input 
                type="number" 
                className="filter-input"
                placeholder="Min value"
                value={filterRange.min}
                onChange={(e) => setFilterRange({ ...filterRange, min: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <span className="filter-label">Max:</span>
              <input 
                type="number" 
                className="filter-input"
                placeholder="Max value"
                value={filterRange.max}
                onChange={(e) => setFilterRange({ ...filterRange, max: e.target.value })}
              />
            </div>
            <button className="apply-filter-btn">
              Apply Filter
            </button>
          </>
        )}
      </div>

      <div className={`analysis-section ${expandedSections.overview ? 'expanded' : ''}`}>
        <div className="section-header clickable" onClick={() => toggleSection('overview')}>
          <Activity size={18} />
          <h3>Overview</h3>
          {expandedSections.overview ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expandedSections.overview && (
          <div className="overview-content">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon rows"><Database size={20} /></div>
                <div className="stat-info">
                  <span className="stat-value">{formatNumber(analysisData.summary?.totalRows || 0)}</span>
                  <span className="stat-label">Total Rows</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon columns"><Columns size={20} /></div>
                <div className="stat-info">
                  <span className="stat-value">{analysisData.summary?.totalColumns || 0}</span>
                  <span className="stat-label">Total Columns</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon numeric"><Hash size={20} /></div>
                <div className="stat-info">
                  <span className="stat-value">{analysisData.summary?.numericColumns || 0}</span>
                  <span className="stat-label">Numeric</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon categorical"><Layers size={20} /></div>
                <div className="stat-info">
                  <span className="stat-value">{analysisData.summary?.categoricalColumns || 0}</span>
                  <span className="stat-label">Categorical</span>
                </div>
              </div>
            </div>

            <div className="type-distribution">
              {/* FIX (relabeling): previously titled generically as
                  "Data Type Distribution", which looked like an
                  unexplained duplicate of Dashboard's "Column Type
                  Distribution" card. Now explicitly scoped and
                  captioned so the relationship is clear rather than
                  confusing. */}
              <h4>Column Types in This Dataset</h4>
              <p className="section-subcaption">
                A breakdown of every column by its detected type. The Dashboard's Column Type card shows this same breakdown at a glance — this view is the detailed version, with per-column charts below.
              </p>
              {(analysisData.typeDistribution || []).length > 0 ? (
                <TypeDonutChart data={analysisData.typeDistribution} animate={chartsAnimated} duration={chartDuration} />
              ) : (
                <div className="no-data-message">No type data available</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={`analysis-section ${expandedSections.columnAnalysis ? 'expanded' : ''}`}>
        <div className="section-header clickable" onClick={() => toggleSection('columnAnalysis')}>
          <BarChart3 size={18} />
          <h3>Numeric &amp; Categorical Columns</h3>
          <span className="section-count">{(analysisData.numericCols?.length || 0) + (analysisData.categoricalCols?.length || 0)} columns</span>
          {expandedSections.columnAnalysis ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expandedSections.columnAnalysis && (
          <>
            {truncation?.histograms?.truncated && (
              <div className="truncation-notice">
                <Info size={13} />
                Showing detailed statistics for {truncation.histograms.shown} of {truncation.histograms.total} numeric columns.
              </div>
            )}
            <div className={`column-analysis-grid ${viewMode}`}>
              {(analysisData.numericCols && analysisData.numericCols.length > 0) ? (
                analysisData.numericCols.slice(0, 10).map(colName => {
                  const hist = analysisData.histograms?.[colName];
                  if (!hist) return null;
                  const chartData = hist.bins?.map((bin, idx) => ({ label: bin, count: hist.counts?.[idx] || 0 })) || [];
                  const badge = getTypeBadge(colName, 'Numeric');
                  
                  return (
                    <div key={colName} className="distribution-card numeric">
                      <div className="card-header">
                        <h4>{colName}</h4>
                        <span
                          className="col-type"
                          style={{ background: `${badge.color}1a`, color: badge.color }}
                        >
                          {badge.icon} {badge.label}{hist.isSampleEstimate ? ' · sample' : ''}
                        </span>
                      </div>
                      <div className="stats-row">
                        <span>Min: {hist.min ?? 'N/A'}</span>
                        <span>Max: {hist.max ?? 'N/A'}</span>
                        <span>Mean: {hist.mean?.toFixed(1) ?? 'N/A'}</span>
                        <span>Median: {hist.median ?? 'N/A'}</span>
                      </div>
                      <HistogramChart data={chartData} color={badge.color} animate={chartsAnimated} duration={chartDuration} />
                      <div className="insight-note">
                        📊 Distribution shows {hist.mean > hist.median ? 'right-skewed' : hist.mean < hist.median ? 'left-skewed' : 'normal'} pattern
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-data-message">No numeric columns found in dataset</div>
              )}

              {(analysisData.categoricalCols && analysisData.categoricalCols.length > 0) ? (
                analysisData.categoricalCols.slice(0, 10).map(colName => {
                  const freq = analysisData.frequencies?.[colName];
                  if (!freq) return null;
                  const chartData = (freq.values || []).slice(0, 8).map((val, idx) => ({
                    value: String(val).length > 14 ? String(val).slice(0, 14) + '…' : String(val),
                    count: freq.counts?.[idx] || 0,
                    percent: (freq.percentages?.[idx] || 0).toFixed(1)
                  }));
                  const badge = getTypeBadge(colName, 'Categorical');

                  return (
                    <div key={colName} className="distribution-card categorical">
                      <div className="card-header">
                        <h4>{colName}</h4>
                        <span
                          className="col-type"
                          style={{ background: `${badge.color}1a`, color: badge.color }}
                        >
                          {badge.icon} {badge.label}
                        </span>
                      </div>
                      <FrequencyChart data={chartData} color={badge.color} animate={chartsAnimated} duration={chartDuration} />
                      {(freq.values?.length || 0) > 8 && (
                        <div className="more-values">+ {(freq.values?.length || 0) - 8} more values</div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="no-data-message">No categorical columns found in dataset</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* NEW SECTION: every column not covered above (Text, Date,
          Email, Phone, URL, Identifier, Boolean, Name, Address, etc.)
          now gets a real card instead of silently vanishing. Built
          entirely from data the backend already computes per column
          (sample_values, unique_count, null_percent, issues,
          suggestions) — no new backend work required. */}
      {otherColumns.length > 0 && (
        <div className={`analysis-section ${expandedSections.otherColumns ? 'expanded' : ''}`}>
          <div className="section-header clickable" onClick={() => toggleSection('otherColumns')}>
            <FileTextIconFallback />
            <h3>Other Columns</h3>
            <span className="section-count">{otherColumns.length} columns</span>
            {expandedSections.otherColumns ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {expandedSections.otherColumns && (
            <>
              <p className="section-subcaption other-columns-caption">
                Text, date, email, phone, URL, identifier, and other non-numeric/non-categorical columns — shown here with sample values and any detected data-quality issues, since these don't fit a histogram or frequency chart.
              </p>
              <div className={`column-analysis-grid ${viewMode}`}>
                {otherColumns.map(col => {
                  const badge = getTypeBadge(col.name, col.detected_type || 'Text');
                  const samples = (col.sample_values || []).slice(0, 6);
                  const issues = col.issues || [];

                  return (
                    <div key={col.name} className="distribution-card other-column-card">
                      <div className="card-header">
                        <h4>{col.name}</h4>
                        <span
                          className="col-type"
                          style={{ background: `${badge.color}1a`, color: badge.color }}
                        >
                          {badge.icon} {badge.label}
                        </span>
                      </div>

                      <div className="stats-row">
                        <span>Unique: {formatNumber(col.unique_count || 0)}</span>
                        <span>Missing: {col.null_percent || 0}%</span>
                      </div>

                      {samples.length > 0 && (
                        <div className="other-column-samples">
                          <span className="other-column-samples-label">Sample values</span>
                          <div className="other-column-samples-list">
                            {samples.map((v, i) => (
                              <span key={i} className="other-column-sample-chip" title={String(v)}>
                                {String(v).length > 22 ? String(v).slice(0, 22) + '…' : String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {issues.length > 0 ? (
                        <div className="other-column-issues">
                          {issues.map((issue, i) => (
                            <div key={i} className={`other-column-issue ${issue.severity || 'low'}`}>
                              {getSeverityIcon(issue.severity)}
                              <span>{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="other-column-clean">
                          <CheckCircle size={12} />
                          <span>No issues detected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div className={`analysis-section ${expandedSections.correlations ? 'expanded' : ''}`}>
        <div className="section-header clickable" onClick={() => toggleSection('correlations')}>
          <GitBranch size={18} />
          <h3>Correlations</h3>
          <span className="section-count">{(analysisData.correlations || []).length} found</span>
          {expandedSections.correlations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {expandedSections.correlations && (
          <div className="correlations-content">
            {truncation?.correlations?.truncated && (
              <div className="truncation-notice">
                <Info size={13} />
                Correlations computed across the first {truncation.correlations.shown} of {truncation.correlations.total} numeric columns.
              </div>
            )}
            {(analysisData.correlations && analysisData.correlations.length > 0) ? (
              <>
                <div className="correlations-grid">
                  {analysisData.correlations.map((c, idx) => (
                    <div key={idx} className="correlation-card">
                      <div className="card-header">
                        <h4>{c.col1} ↔ {c.col2}</h4>
                      </div>
                      <div className="correlation-bars">
                        <span className="correlation-label">{c.correlation >= 0 ? 'Positive' : 'Negative'}</span>
                        <div className="correlation-bar-container">
                          <div
                            className="correlation-bar"
                            style={{
                              width: `${Math.min(Math.abs(c.correlation) * 100, 100)}%`,
                              backgroundColor: getCorrelationColor(c.correlation)
                            }}
                          />
                        </div>
                      </div>
                      <div className="correlation-value" style={{ color: getCorrelationColor(c.correlation) }}>
                        {c.correlation >= 0 ? '+' : ''}{c.correlation.toFixed(2)}
                      </div>
                      <div className="correlation-strength">{getCorrelationStrengthLabel(c.correlation)}</div>
                    </div>
                  ))}
                </div>
                <div className="correlation-insight">
                  <Info size={14} />
                  <span>Found {analysisData.correlations.length} notable relationship{analysisData.correlations.length === 1 ? '' : 's'} (|correlation| &gt; 0.3) between numeric columns.</span>
                </div>
              </>
            ) : (
              <div className="no-data-message">No significant correlations found between numeric columns.</div>
            )}
          </div>
        )}
      </div>

      <div className={`analysis-section ${expandedSections.missingValues ? 'expanded' : ''}`}>
        <div className="section-header clickable" onClick={() => toggleSection('missingValues')}>
          <AlertCircle size={18} />
          <h3>Missing Values — All Columns</h3>
          <span className="section-count">Total missing: {formatNumber(analysisData.summary?.totalMissing || 0)} ({completeness}% complete)</span>
          {expandedSections.missingValues ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expandedSections.missingValues && (
          <div className="missing-content">
            <p className="section-subcaption">
              Missing-value percentage across every column in the dataset, ranked highest first — this is the complete picture across all columns, unlike the per-column stats shown in the sections above.
            </p>
            {(analysisData.missingByColumn || []).length > 0 ? (
              <MissingValuesChart data={(analysisData.missingByColumn || []).slice(0, 12)} animate={chartsAnimated} duration={chartDuration} />
            ) : (
              <div className="no-data-message">No column data available</div>
            )}
            <div className="missing-insight">
              <Info size={14} />
              <span>
                {(analysisData.summary?.totalMissing || 0) === 0 ? '✅ No missing values detected! Data is complete.' :
                 `📊 ${completeness}% of data is complete. Consider cleaning missing values for better analysis results.`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={`analysis-section ${expandedSections.outliers ? 'expanded' : ''}`}>
        <div className="section-header clickable" onClick={() => toggleSection('outliers')}>
          <TrendingUp size={18} />
          <h3>Outliers</h3>
          <span className="section-count">{Object.keys(analysisData.outliers || {}).length} columns affected</span>
          {expandedSections.outliers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {expandedSections.outliers && (
          <>
            {truncation?.outliers?.truncated && (
              <div className="truncation-notice">
                <Info size={13} />
                Outlier detection covers the first {truncation.outliers.shown} of {truncation.outliers.total} numeric columns.
              </div>
            )}
            {Object.keys(analysisData.outliers || {}).length > 0 ? (
              <div className="outliers-grid">
                {Object.entries(analysisData.outliers).map(([colName, info]) => (
                  <div key={colName} className="outlier-card">
                    <div className="outlier-header">
                      <h4>{colName}{info.isSampleEstimate ? ' (sample)' : ''}</h4>
                      <span className="outlier-count">{info.count} value{info.count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="outlier-values">
                      {(info.values || []).slice(0, 10).map((v, i) => (
                        <span key={i} className="outlier-value">{typeof v === 'number' ? v.toLocaleString() : String(v)}</span>
                      ))}
                    </div>
                    {info.count > (info.values || []).length && (
                      <div className="outlier-more">+ {info.count - (info.values || []).length} more</div>
                    )}
                    <div className="outlier-impact">
                      <AlertTriangle size={12} />
                      <span>Outliers can skew the mean and standard deviation for this column</span>
                    </div>
                    <button className="view-outliers-btn" onClick={() => setCurrentPage('cleaner')}>
                      <Brush size={12} />
                      Clean this column
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data-message">No significant outliers detected.</div>
            )}
          </>
        )}
      </div>

      <div className={`analysis-section ${expandedSections.insights ? 'expanded' : ''}`}>
        <div className="section-header clickable" onClick={() => toggleSection('insights')}>
          <Zap size={18} />
          <h3>Smart Insights</h3>
          <span className="insights-badge">AI Generated</span>
          {expandedSections.insights ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expandedSections.insights && (
          <>
            {!showAdvancedInsights ? (
              <div className="insights-disabled-notice">
                <Info size={16} />
                <span>Advanced insights are turned off in Settings → Analysis. Turn them back on to see AI-generated recommendations here.</span>
              </div>
            ) : (
              <>
                {analysisData.insights?.length > 0 && (
                  <div className="insight-summary-strip">
                    {insightCounts.warning > 0 && (
                      <span className="insight-count-chip warning">
                        <AlertTriangle size={12} /> {insightCounts.warning} warning{insightCounts.warning === 1 ? '' : 's'}
                      </span>
                    )}
                    {insightCounts.info > 0 && (
                      <span className="insight-count-chip info">
                        <Info size={12} /> {insightCounts.info} info
                      </span>
                    )}
                    {insightCounts.success > 0 && (
                      <span className="insight-count-chip success">
                        <CheckCircle size={12} /> {insightCounts.success} good
                      </span>
                    )}
                  </div>
                )}
                <div className="insights-grid">
                  {(analysisData.insights && analysisData.insights.length > 0) ? (
                    analysisData.insights.map((insight, idx) => (
                      <div key={idx} className={`insight-card ${insight.type || 'info'}`}>
                        <div className="insight-icon">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="insight-content">
                          <div className="insight-title">{insight.title}</div>
                          <div className="insight-description">{insight.description}</div>
                          <div className="insight-recommendation">
                            <span>💡 Recommendation:</span> {insight.recommendation}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-insights">
                      <CheckCircle size={32} />
                      <h4>No significant issues detected</h4>
                      <p>Your data looks clean and well-structured!</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="analysis-footer">
        <button className="export-report-btn" onClick={handleExportReport}>
          <Download size={16} />
          Download Full Report (PDF)
        </button>
        <button className="copy-insights-btn" onClick={handleCopyInsights}>
          <Copy size={16} />
          Copy Insights
        </button>
      </div>
    </div>
  );
};

// Small inline fallback so the "Other Columns" section header has an
// icon without importing a new lucide icon that might not exist in
// this project's installed version — reuses Type, already imported.
const FileTextIconFallback = () => <Type size={18} />;

function computeHistogramFromPreview(colName, min, max, previewData, numBins = 8) {
  if (min === undefined || min === null || max === undefined || max === null || min === max || !previewData || previewData.length === 0) {
    return null;
  }
  const values = previewData
    .map(row => row[colName])
    .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)))
    .map(v => parseFloat(v));

  if (values.length === 0) return null;

  const binWidth = (max - min) / numBins;
  const counts = new Array(numBins).fill(0);
  values.forEach(v => {
    let idx = binWidth > 0 ? Math.floor((v - min) / binWidth) : 0;
    if (idx >= numBins) idx = numBins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  });

  const bins = Array.from({ length: numBins }, (_, i) =>
    `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`
  );

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  return { bins, counts, min, max, mean, median, std, isSampleEstimate: true };
}

function computeOutliersFromPreview(colName, q1, iqr, previewData) {
  if (q1 === undefined || q1 === null || iqr === undefined || iqr === null || !previewData || previewData.length === 0) {
    return null;
  }
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = (q1 + iqr) + 1.5 * iqr;

  const values = previewData
    .map(row => row[colName])
    .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)))
    .map(v => parseFloat(v));

  const outlierValues = values.filter(v => v < lowerBound || v > upperBound);
  if (outlierValues.length === 0) return null;

  return {
    count: outlierValues.length,
    values: outlierValues.slice(0, 10),
    isSampleEstimate: true
  };
}

export default AnalysisPage;