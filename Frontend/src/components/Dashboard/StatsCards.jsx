// frontend/src/components/Dashboard/StatsCards.jsx
// Statistics Cards - Displays key metrics about the dataset

import React from 'react';
import { 
  Database, Columns, AlertCircle, Hash, 
  Calendar, DollarSign, Mail, Phone, Users,
  TrendingUp, FileText, BarChart3, Activity
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import './StatsCards.css';

const StatsCards = ({ totalRows, totalColumns, columnProfile = [] }) => {
  // Calculate statistics from column profile
  const calculateStats = () => {
    if (!columnProfile || columnProfile.length === 0) {
      return {
        totalMissing: 0,
        missingPercent: 0,
        uniqueTotal: 0,
        columnTypes: {},
        numericColumns: 0,
        categoricalColumns: 0,
        dateColumns: 0,
        textColumns: 0
      };
    }

    let totalMissing = 0;
    let totalCells = totalRows * totalColumns;
    let columnTypes = {};
    let numericColumns = 0;
    let categoricalColumns = 0;
    let dateColumns = 0;
    let textColumns = 0;

    columnProfile.forEach(col => {
      totalMissing += col.null_count || 0;
      
      const type = col.detected_type || 'UNKNOWN';
      columnTypes[type] = (columnTypes[type] || 0) + 1;
      
      if (type === 'NUMERIC' || type === 'CURRENCY' || type === 'AGE') {
        numericColumns++;
      } else if (type === 'CATEGORICAL' || type === 'GENDER' || type === 'CITY' || type === 'PROVINCE') {
        categoricalColumns++;
      } else if (type === 'DATE' || type === 'DATETIME') {
        dateColumns++;
      } else if (type === 'TEXT' || type === 'NAME' || type === 'ADDRESS') {
        textColumns++;
      }
    });

    return {
      totalMissing,
      missingPercent: totalCells > 0 ? (totalMissing / totalCells * 100).toFixed(1) : 0,
      uniqueTotal: columnProfile.reduce((sum, col) => sum + (col.unique_count || 0), 0),
      columnTypes,
      numericColumns,
      categoricalColumns,
      dateColumns,
      textColumns
    };
  };

  const stats = calculateStats();

  const cards = [
    {
      title: 'Total Rows',
      value: formatNumber(totalRows),
      icon: <Database size={20} />,
      color: '#667eea',
      bgColor: 'rgba(102, 126, 234, 0.1)',
      description: 'Records in dataset'
    },
    {
      title: 'Total Columns',
      value: formatNumber(totalColumns),
      icon: <Columns size={20} />,
      color: '#764ba2',
      bgColor: 'rgba(118, 75, 162, 0.1)',
      description: 'Features / fields'
    },
    {
      title: 'Missing Values',
      value: formatNumber(stats.totalMissing),
      icon: <AlertCircle size={20} />,
      color: stats.missingPercent > 10 ? '#ef4444' : '#f59e0b',
      bgColor: stats.missingPercent > 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
      description: `${stats.missingPercent}% of total cells`
    },
    {
      title: 'Data Density',
      value: `${(100 - stats.missingPercent).toFixed(1)}%`,
      icon: <TrendingUp size={20} />,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      description: 'Complete data percentage'
    }
  ];

  const typeCards = [
    {
      title: 'Numeric',
      value: stats.numericColumns,
      icon: <BarChart3 size={16} />,
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      description: 'Numbers, currency, age'
    },
    {
      title: 'Categorical',
      value: stats.categoricalColumns,
      icon: <Users size={16} />,
      color: '#ec4899',
      bgColor: 'rgba(236, 72, 153, 0.1)',
      description: 'Categories, gender, city'
    },
    {
      title: 'Date/Time',
      value: stats.dateColumns,
      icon: <Calendar size={16} />,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      description: 'Dates and timestamps'
    },
    {
      title: 'Text',
      value: stats.textColumns,
      icon: <FileText size={16} />,
      color: '#64748b',
      bgColor: 'rgba(100, 116, 139, 0.1)',
      description: 'Names, addresses, free text'
    }
  ];

  return (
    <div className="stats-cards">
      <div className="stats-grid">
        {cards.map((card, index) => (
          <div key={index} className="stat-card" style={{ borderTopColor: card.color }}>
            <div className="stat-card-header">
              <div className="stat-icon" style={{ backgroundColor: card.bgColor, color: card.color }}>
                {card.icon}
              </div>
              <span className="stat-title">{card.title}</span>
            </div>
            <div className="stat-value" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="stat-description">{card.description}</div>
          </div>
        ))}
      </div>

      <div className="type-stats">
        <h4 className="type-stats-title">Column Type Distribution</h4>
        <div className="type-stats-grid">
          {typeCards.map((card, index) => (
            <div key={index} className="type-card">
              <div className="type-icon" style={{ backgroundColor: card.bgColor, color: card.color }}>
                {card.icon}
              </div>
              <div className="type-info">
                <span className="type-value">{card.value}</span>
                <span className="type-label">{card.title}</span>
                <span className="type-description">{card.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsCards;