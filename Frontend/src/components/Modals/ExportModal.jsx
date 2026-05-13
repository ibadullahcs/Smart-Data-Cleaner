// frontend/src/components/Modals/ExportModal.jsx
// Export Options Modal - Choose export format and options

import React, { useState } from 'react';
import { 
  X, Download, FileText, FileSpreadsheet, FileJson, 
  Database, ChevronDown, Check, AlertCircle,
  Table, Code, FileCode, FileDown
} from 'lucide-react';
import { validateTableName } from '../../utils/validators';
import './ExportModal.css';

const ExportModal = ({ onClose, onExport }) => {
  const [format, setFormat] = useState('csv');
  const [tableName, setTableName] = useState('cleaned_data');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [tableNameError, setTableNameError] = useState('');

  const exportFormats = [
    {
      id: 'csv',
      name: 'CSV',
      icon: <FileText size={20} />,
      description: 'Comma-separated values, compatible with Excel, Google Sheets',
      extension: '.csv'
    },
    {
      id: 'excel',
      name: 'Excel',
      icon: <FileSpreadsheet size={20} />,
      description: 'Microsoft Excel format with formatting',
      extension: '.xlsx'
    },
    {
      id: 'pdf',
      name: 'PDF',
      icon: <FileJson size={20} />,
      description: 'PDF report with data and statistics',
      extension: '.pdf'
    },
    {
      id: 'sql',
      name: 'SQL',
      icon: <Database size={20} />,
      description: 'SQL INSERT statements for database import',
      extension: '.sql'
    }
  ];

  const handleTableNameChange = (value) => {
    setTableName(value);
    const validation = validateTableName(value);
    if (!validation.isValid) {
      setTableNameError(validation.errorMessage);
    } else {
      setTableNameError('');
    }
  };

  const handleExport = () => {
    if (format === 'sql') {
      const validation = validateTableName(tableName);
      if (!validation.isValid) {
        setTableNameError(validation.errorMessage);
        return;
      }
      onExport(format, { tableName: validation.sanitized, includeHeaders });
    } else {
      onExport(format, { includeHeaders });
    }
    onClose();
  };

  const selectedFormat = exportFormats.find(f => f.id === format);

  return (
    <div className="export-modal-overlay">
      <div className="export-modal-container">
        {/* Header */}
        <div className="export-modal-header">
          <div className="header-left">
            <Download size={24} className="header-icon" />
            <div>
              <h2>Export Data</h2>
              <p className="header-subtitle">Choose your export format and options</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="export-modal-content">
          {/* Format Selection */}
          <div className="format-section">
            <h3>Export Format</h3>
            <div className="format-grid">
              {exportFormats.map((fmt) => (
                <button
                  key={fmt.id}
                  className={`format-card ${format === fmt.id ? 'selected' : ''}`}
                  onClick={() => setFormat(fmt.id)}
                >
                  <div className="format-icon">{fmt.icon}</div>
                  <div className="format-info">
                    <span className="format-name">{fmt.name}</span>
                    <span className="format-extension">{fmt.extension}</span>
                  </div>
                  {format === fmt.id && <Check size={16} className="format-check" />}
                </button>
              ))}
            </div>
          </div>

          {/* SQL Options (only shown when SQL is selected) */}
          {format === 'sql' && (
            <div className="sql-options">
              <h3>SQL Options</h3>
              <div className="option-group">
                <label htmlFor="tableName">Table Name</label>
                <input
                  type="text"
                  id="tableName"
                  value={tableName}
                  onChange={(e) => handleTableNameChange(e.target.value)}
                  placeholder="Enter table name"
                  className={tableNameError ? 'error' : ''}
                />
                {tableNameError && (
                  <span className="error-message">
                    <AlertCircle size={12} />
                    {tableNameError}
                  </span>
                )}
                <p className="option-hint">Used in CREATE TABLE and INSERT statements</p>
              </div>
            </div>
          )}

          {/* General Options */}
          <div className="options-section">
            <h3>Export Options</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
              />
              <span>Include column headers</span>
            </label>
            <p className="option-hint">First row will contain column names</p>
          </div>

          {/* Preview */}
          <div className="preview-section">
            <h3>Preview</h3>
            <div className="preview-card">
              <div className="preview-icon">
                {selectedFormat?.icon}
              </div>
              <div className="preview-info">
                <span className="preview-name">{selectedFormat?.name}</span>
                <span className="preview-description">{selectedFormat?.description}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="export-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="export-btn" onClick={handleExport}>
            <Download size={16} />
            Export as {selectedFormat?.name}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;