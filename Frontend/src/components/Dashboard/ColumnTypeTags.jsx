// frontend/src/components/Dashboard/ColumnTypeTags.jsx
// Column Type Tags - Displays detected column types with badges

import React, { useState } from 'react';
import { 
  Hash, Calendar, Mail, Phone, DollarSign, Users, 
  MapPin, Type, Activity, Shield, BarChart3, 
  Link, CreditCard, User, Building, Home, 
  Globe, Smartphone, Tag, AlertCircle, ChevronDown, ChevronUp,
  Search
} from 'lucide-react';
import { COLUMN_TYPE_LABELS, COLUMN_TYPE_COLORS } from '../../services/api';
import './ColumnTypeTags.css';

const ColumnTypeTags = ({ columnProfile = [], onColumnSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [filterType, setFilterType] = useState('all');

  // Get icon for column type
  const getTypeIcon = (type) => {
    const icons = {
      'EMAIL': <Mail size={14} />,
      'PHONE': <Phone size={14} />,
      'DATE': <Calendar size={14} />,
      'DATETIME': <Calendar size={14} />,
      'CURRENCY': <DollarSign size={14} />,
      'NUMERIC': <Hash size={14} />,
      'AGE': <Users size={14} />,
      'NAME': <User size={14} />,
      'ADDRESS': <Home size={14} />,
      'CITY': <MapPin size={14} />,
      'PROVINCE': <MapPin size={14} />,
      'GENDER': <Users size={14} />,
      'CATEGORICAL': <Tag size={14} />,
      'ID': <Hash size={14} />,
      'URL': <Link size={14} />,
      'TEXT': <Type size={14} />,
      'BOOLEAN': <Activity size={14} />,
      'UNKNOWN': <AlertCircle size={14} />
    };
    return icons[type] || <Type size={14} />;
  };

  // Get unique types for filter
  const uniqueTypes = ['all', ...new Set(columnProfile.map(col => col.detected_type))];

  // Filter columns
  const filteredColumns = columnProfile.filter(col => {
    const matchesSearch = col.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || col.detected_type === filterType;
    return matchesSearch && matchesType;
  });

  const displayColumns = showAll ? filteredColumns : filteredColumns.slice(0, 12);
  const hasMore = filteredColumns.length > 12;

  // Get confidence badge class
  const getConfidenceClass = (confidence) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  };

  // Handle column click
  const handleColumnClick = (column) => {
    if (onColumnSelect) {
      onColumnSelect(column);
    }
  };

  return (
    <div className="column-type-tags">
      <div className="tags-header">
        <div className="tags-title">
          <Shield size={18} />
          <h3>Detected Column Types</h3>
          <span className="tags-count">{columnProfile.length} columns</span>
        </div>
        
        <div className="tags-controls">
          <div className="search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {uniqueTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : COLUMN_TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tags-grid">
        {displayColumns.map((col, idx) => (
          <div 
            key={idx} 
            className={`column-tag ${col.null_count > 0 ? 'has-issues' : ''}`}
            onClick={() => handleColumnClick(col)}
            style={{ 
              borderLeftColor: COLUMN_TYPE_COLORS[col.detected_type] || '#64748b'
            }}
          >
            <div className="tag-icon" style={{ 
              backgroundColor: `${COLUMN_TYPE_COLORS[col.detected_type] || '#64748b'}15`,
              color: COLUMN_TYPE_COLORS[col.detected_type] || '#64748b'
            }}>
              {getTypeIcon(col.detected_type)}
            </div>
            <div className="tag-content">
              <div className="tag-name">{col.name}</div>
              <div className="tag-type">
                <span className="type-label">
                  {COLUMN_TYPE_LABELS[col.detected_type] || col.detected_type}
                </span>
                <span className={`confidence-badge ${getConfidenceClass(col.confidence)}`}>
                  {Math.round(col.confidence * 100)}%
                </span>
              </div>
              {col.null_count > 0 && (
                <div className="tag-warning">
                  <AlertCircle size={10} />
                  <span>{col.null_count} missing</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="tags-footer">
          <button 
            className="show-more-btn"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp size={16} />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Show {filteredColumns.length - 12} More Columns
              </>
            )}
          </button>
        </div>
      )}

      {filteredColumns.length === 0 && (
        <div className="no-results">
          <Search size={32} />
          <p>No columns match your search</p>
        </div>
      )}
    </div>
  );
};

export default ColumnTypeTags;