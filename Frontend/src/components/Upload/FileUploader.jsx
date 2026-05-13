// frontend/src/components/Upload/FileUploader.jsx
// Professional Drag & Drop File Upload Component

import React, { useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, FileSpreadsheet, FileCode, FileJson } from 'lucide-react';
import './FileUploader.css';

const FileUploader = ({ onFileSelect, isDragging, setIsDragging, disabled = false, acceptedFormats = ['.csv', '.xlsx', '.xls', '.json'] }) => {
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (disabled) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleButtonClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getFileIcon = () => {
    return <Upload size={48} />;
  };

  return (
    <div
      className={`file-uploader ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      
      <div className="upload-icon-wrapper">
        <div className="upload-icon-bg">
          {getFileIcon()}
        </div>
      </div>
      
      <h3 className="upload-title">
        {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
      </h3>
      
      <p className="upload-subtitle">
        or
      </p>
      
      <button 
        className="upload-button"
        onClick={handleButtonClick}
        disabled={disabled}
      >
        <FileText size={18} />
        Browse Files
      </button>
      
      <div className="upload-info">
        <div className="info-row">
          <CheckCircle size={14} />
          <span>Secure processing</span>
        </div>
        <div className="info-row">
          <CheckCircle size={14} />
          <span>Automatic column detection</span>
        </div>
        <div className="info-row">
          <CheckCircle size={14} />
          <span>Smart cleaning recommendations</span>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;