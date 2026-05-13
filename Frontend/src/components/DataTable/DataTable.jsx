// frontend/src/components/DataTable/DataTable.jsx
// Main Data Table Component - Displays data preview with sorting and pagination

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { COLUMN_TYPE_COLORS, COLUMN_TYPE_LABELS } from '../../services/api';
import { formatNumber, formatDate, truncateText } from '../../utils/formatters';
import './DataTable.css';

const DataTable = ({ data = [], columnProfile = [], onColumnSelect, onCellClick }) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Get column names from data or profile
  const columns = useMemo(() => {
    if (data.length > 0) {
      return Object.keys(data[0]);
    }
    return columnProfile.map(col => col.name);
  }, [data, columnProfile]);

  // Get column type for a column
  const getColumnType = (columnName) => {
    const profile = columnProfile.find(col => col.name === columnName);
    return profile?.detected_type || 'UNKNOWN';
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(row => {
      return Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      
      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      
      // Try numeric comparison first
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // String comparison
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Handle sort
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Handle page change
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Format cell value based on column type
  const formatCellValue = (value, columnName) => {
    if (value === null || value === undefined) return <span className="null-value">—</span>;
    
    const columnType = getColumnType(columnName);
    
    if (columnType === 'DATE' || columnType === 'DATETIME') {
      const formatted = formatDate(value, 'short');
      return <span className="date-value" title={value}>{formatted}</span>;
    }
    
    if (columnType === 'CURRENCY') {
      const num = Number(value);
      if (!isNaN(num)) {
        return <span className="currency-value">${formatNumber(num, 2)}</span>;
      }
    }
    
    if (columnType === 'NUMERIC' || columnType === 'AGE') {
      const num = Number(value);
      if (!isNaN(num)) {
        return <span className="numeric-value">{formatNumber(num)}</span>;
      }
    }
    
    if (columnType === 'EMAIL') {
      return <a href={`mailto:${value}`} className="email-link">{value}</a>;
    }
    
    if (columnType === 'PHONE') {
      return <span className="phone-value">{value}</span>;
    }
    
    if (columnType === 'URL') {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="url-link" title={value}>
        {truncateText(value, 40)}
      </a>;
    }
    
    // Truncate long text
    return <span className="text-value" title={String(value)}>
      {truncateText(String(value), 50)}
    </span>;
  };

  // Get cell className based on column type
  const getCellClassName = (value, columnName) => {
    const classes = ['data-cell'];
    const columnType = getColumnType(columnName);
    classes.push(`type-${columnType.toLowerCase()}`);
    
    if (value === null || value === undefined) classes.push('null');
    return classes.join(' ');
  };

  return (
    <div className="data-table-container">
      {/* Toolbar */}
      <div className="data-table-toolbar">
        <div className="search-wrapper">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search in table..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        
        <div className="rows-per-page">
          <span>Rows per page:</span>
          <select value={rowsPerPage} onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-number">#</th>
              {columns.map((column, idx) => {
                const columnType = getColumnType(column);
                const typeColor = COLUMN_TYPE_COLORS[columnType] || '#64748b';
                return (
                  <th 
                    key={idx}
                    onClick={() => handleSort(column)}
                    className={sortColumn === column ? 'sorted' : ''}
                    style={{ borderBottomColor: typeColor }}
                  >
                    <div className="th-content">
                      <span className="column-name" title={column}>{truncateText(column, 30)}</span>
                      <span className="column-type" style={{ color: typeColor }}>
                        {COLUMN_TYPE_LABELS[columnType] || columnType}
                      </span>
                      {sortColumn === column && (
                        <span className="sort-icon">
                          {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => {
              const actualRowIndex = (currentPage - 1) * rowsPerPage + rowIndex + 1;
              return (
                <tr key={rowIndex} className="data-row">
                  <td className="row-number">{actualRowIndex}</td>
                  {columns.map((column, colIndex) => {
                    const value = row[column];
                    return (
                      <td 
                        key={colIndex}
                        className={getCellClassName(value, column)}
                        onClick={() => onCellClick && onCellClick(row, column, value)}
                      >
                        {formatCellValue(value, column)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with Pagination */}
      {totalPages > 1 && (
        <div className="data-table-footer">
          <div className="pagination-info">
            Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} rows
          </div>
          
          <div className="pagination-controls">
            <button 
              className="page-btn" 
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft size={16} />
            </button>
            <button 
              className="page-btn" 
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            
            <button 
              className="page-btn" 
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
            <button 
              className="page-btn" 
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;