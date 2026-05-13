// frontend/src/components/Common/SkeletonLoader.jsx
// Professional Skeleton Loader with Shimmer Effect

import React from 'react';
import './SkeletonLoader.css';

// Basic Skeleton Components
export const SkeletonText = ({ width = '100%', height = '16px', className = '' }) => (
  <div className={`skeleton-text ${className}`} style={{ width, height }} />
);

export const SkeletonCircle = ({ size = '40px', className = '' }) => (
  <div className={`skeleton-circle ${className}`} style={{ width: size, height: size }} />
);

export const SkeletonButton = ({ width = '100px', height = '36px', className = '' }) => (
  <div className={`skeleton-button ${className}`} style={{ width, height }} />
);

export const SkeletonBadge = ({ width = '60px', height = '20px', className = '' }) => (
  <div className={`skeleton-badge ${className}`} style={{ width, height }} />
);

// Card Skeleton
export const SkeletonCard = ({ className = '' }) => (
  <div className={`skeleton-card ${className}`}>
    <div className="skeleton-card-header">
      <SkeletonCircle size="40px" />
      <SkeletonText width="60%" />
    </div>
    <div className="skeleton-card-body">
      <SkeletonText width="90%" />
      <SkeletonText width="80%" />
      <SkeletonText width="70%" />
    </div>
    <div className="skeleton-card-footer">
      <SkeletonButton width="80px" />
      <SkeletonButton width="80px" />
    </div>
  </div>
);

// Table Skeleton
export const SkeletonTable = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`skeleton-table ${className}`}>
    <div className="skeleton-table-header">
      {Array(columns).fill().map((_, i) => (
        <SkeletonText key={i} width="90%" height="20px" />
      ))}
    </div>
    {Array(rows).fill().map((_, i) => (
      <div key={i} className="skeleton-table-row">
        {Array(columns).fill().map((_, j) => (
          <SkeletonText key={j} width="90%" height="16px" />
        ))}
      </div>
    ))}
  </div>
);

// Stats Card Skeleton
export const SkeletonStatsCard = ({ className = '' }) => (
  <div className={`skeleton-stats-card ${className}`}>
    <div className="stats-icon-skeleton" />
    <div className="stats-content">
      <SkeletonText width="60px" height="24px" />
      <SkeletonText width="80px" height="12px" />
    </div>
  </div>
);

// Metric Card Skeleton
export const SkeletonMetric = ({ className = '' }) => (
  <div className={`skeleton-metric ${className}`}>
    <SkeletonCircle size="32px" />
    <div className="metric-content">
      <SkeletonText width="50px" height="20px" />
      <SkeletonText width="70px" height="12px" />
    </div>
  </div>
);

// Chart Skeleton
export const SkeletonChart = ({ height = '300px', className = '' }) => (
  <div className={`skeleton-chart ${className}`} style={{ height }}>
    <div className="chart-bars">
      {Array(8).fill().map((_, i) => (
        <div key={i} className="chart-bar-skeleton" style={{ height: `${20 + Math.random() * 60}%` }} />
      ))}
    </div>
    <div className="chart-axis">
      <SkeletonText width="80%" height="20px" />
    </div>
  </div>
);

// Dashboard Skeleton (Complete Page)
export const SkeletonDashboard = () => (
  <div className="skeleton-dashboard">
    <div className="dashboard-header-skeleton">
      <SkeletonText width="200px" height="32px" />
      <div className="header-actions">
        <SkeletonButton width="100px" />
        <SkeletonButton width="100px" />
      </div>
    </div>
    
    <div className="stats-grid-skeleton">
      {Array(4).fill().map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
    
    <div className="dashboard-tabs-skeleton">
      {Array(4).fill().map((_, i) => (
        <SkeletonButton key={i} width="100px" height="40px" />
      ))}
    </div>
    
    <SkeletonTable rows={5} columns={6} />
  </div>
);

// Profile Card Skeleton
export const SkeletonProfile = () => (
  <div className="skeleton-profile">
    <div className="profile-header">
      <SkeletonCircle size="80px" />
      <div className="profile-info">
        <SkeletonText width="150px" height="24px" />
        <SkeletonText width="200px" height="16px" />
      </div>
    </div>
    <div className="profile-details">
      {Array(4).fill().map((_, i) => (
        <div key={i} className="profile-detail-row">
          <SkeletonText width="100px" height="14px" />
          <SkeletonText width="150px" height="14px" />
        </div>
      ))}
    </div>
  </div>
);

// Column Analysis Skeleton
export const SkeletonColumnAnalysis = ({ columns = 6 }) => (
  <div className="skeleton-column-analysis">
    {Array(columns).fill().map((_, i) => (
      <div key={i} className="skeleton-column-card">
        <div className="column-header-skeleton">
          <SkeletonText width="120px" height="18px" />
          <SkeletonBadge width="60px" />
        </div>
        <div className="column-stats-skeleton">
          {Array(4).fill().map((_, j) => (
            <div key={j} className="stat-row-skeleton">
              <SkeletonText width="60px" height="12px" />
              <SkeletonText width="40px" height="12px" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default {
  SkeletonText,
  SkeletonCircle,
  SkeletonButton,
  SkeletonBadge,
  SkeletonCard,
  SkeletonTable,
  SkeletonStatsCard,
  SkeletonMetric,
  SkeletonChart,
  SkeletonDashboard,
  SkeletonProfile,
  SkeletonColumnAnalysis
};