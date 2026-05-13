// frontend/src/components/Upload/UploadProgress.jsx
// Professional Upload Progress Indicator

import React from 'react';
import { Loader2, CheckCircle, Upload, FileText, Sparkles } from 'lucide-react';
import './UploadProgress.css';

const UploadProgress = ({ progress, status = 'uploading', filename }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 size={24} className="spin" />;
      case 'profiling':
        return <Sparkles size={24} className="pulse" />;
      case 'complete':
        return <CheckCircle size={24} />;
      default:
        return <Upload size={24} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading your file...';
      case 'profiling':
        return 'Analyzing data structure...';
      case 'complete':
        return 'Upload complete!';
      default:
        return 'Processing...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'var(--primary)';
      case 'profiling':
        return 'var(--info)';
      case 'complete':
        return 'var(--success)';
      default:
        return 'var(--gray)';
    }
  };

  return (
    <div className="upload-progress">
      <div className="progress-header">
        <div className="progress-icon" style={{ color: getStatusColor() }}>
          {getStatusIcon()}
        </div>
        <div className="progress-info">
          <span className="progress-status">{getStatusText()}</span>
          {filename && <span className="progress-filename">{filename}</span>}
        </div>
        <span className="progress-percentage" style={{ color: getStatusColor() }}>
          {progress}%
        </span>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progress}%`, backgroundColor: getStatusColor() }}
        />
      </div>
      
      <div className="progress-stats">
        <div className="stat">
          <span className="stat-label">Progress</span>
          <span className="stat-value">{progress}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Status</span>
          <span className={`stat-value status-${status}`}>
            {status === 'uploading' ? 'Uploading' : status === 'profiling' ? 'Analyzing' : 'Complete'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;