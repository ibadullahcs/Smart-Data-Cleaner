// frontend/src/pages/UploadPage.jsx
// Professional Upload Page

import React, { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Upload, FileText, X, CheckCircle, AlertCircle, AlertTriangle,
  Sparkles, ArrowRight, Database, Zap, Shield,
  FileSpreadsheet, FileCode, Loader2
} from 'lucide-react';
import './UploadPage.css';

const UploadPage = () => {
  const { 
    setCurrentPage, setJobId,
    setTotalRows, setTotalColumns, setQualityScore,
    setColumnProfile, setPreviewData, setFilename,
    setFileSize, showSuccess, showError, setIsLoading,
    // NEW (real wiring): reads the unified settings object so the
    // "Default Page After Upload" setting genuinely controls where
    // the user lands, instead of the previous hardcoded 'dashboard'.
    settings
  } = useApp();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragInvalid, setIsDragInvalid] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');

  const fileInputRef = useRef(null);

  const supportedFormats = [
    { ext: '.csv', name: 'CSV', icon: <FileCode size={14} />, color: '#10b981' },
    { ext: '.xlsx', name: 'Excel', icon: <FileSpreadsheet size={14} />, color: '#10b981' },
    { ext: '.xls', name: 'Excel', icon: <FileSpreadsheet size={14} />, color: '#10b981' }
  ];

  const maxSizeMB = 100;
  const SAMPLE_READ_BYTES = 1024 * 100;
  const WARN_SIZE_MB = maxSizeMB * 0.8;

  const validateFileSize = (file) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { isValid: false, error: `File too large. Maximum size is ${maxSizeMB}MB.` };
    }
    return { isValid: true, error: null };
  };

  const validateFileType = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!supportedFormats.map(f => f.ext).includes(ext)) {
      return { isValid: false, error: `Unsupported file type. Please upload CSV or Excel files.` };
    }
    return { isValid: true, error: null };
  };

  const parseFileInfo = async (file) => {
    return new Promise((resolve) => {
      let rowCount = '...';
      let isEstimate = false;

      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          const lines = content.split('\n');
          const linesRead = Math.max(0, lines.length - 1);
          const bytesRead = Math.min(file.size, SAMPLE_READ_BYTES);

          if (file.size <= SAMPLE_READ_BYTES) {
            rowCount = linesRead;
            isEstimate = false;
          } else {
            const bytesPerLine = bytesRead / Math.max(linesRead, 1);
            rowCount = Math.round(file.size / Math.max(bytesPerLine, 1));
            isEstimate = true;
          }

          resolve({
            name: file.name,
            size: file.size,
            type: file.name.split('.').pop().toUpperCase(),
            rowCount: rowCount > 0 ? rowCount.toLocaleString() : '...',
            rowCountIsEstimate: isEstimate,
            lastModified: new Date(file.lastModified).toLocaleDateString()
          });
        };
        reader.readAsText(file.slice(0, SAMPLE_READ_BYTES));
      } else {
        resolve({
          name: file.name,
          size: file.size,
          type: file.name.split('.').pop().toUpperCase(),
          rowCount: '...',
          rowCountIsEstimate: false,
          lastModified: new Date(file.lastModified).toLocaleDateString()
        });
      }
    });
  };

  const handleFileSelect = async (file) => {
    setError(null);
    
    const typeValidation = validateFileType(file);
    if (!typeValidation.isValid) {
      setError(typeValidation.error);
      setSelectedFile(null);
      setFileInfo(null);
      return;
    }
    
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.isValid) {
      setError(sizeValidation.error);
      setSelectedFile(null);
      setFileInfo(null);
      return;
    }

    setSelectedFile(file);
    setFilename(file.name);
    setFileSize(file.size);
    
    const info = await parseFileInfo(file);
    setFileInfo(info);
  };

  const looksLikeUnsupportedDrag = (e) => {
    const items = e.dataTransfer?.items;
    if (!items || items.length === 0) return false;
    const item = items[0];
    if (item.kind !== 'file') return true;
    if (!item.type) return false;
    const validMimeHints = ['csv', 'excel', 'spreadsheet', 'text/plain'];
    return !validMimeHints.some(hint => item.type.toLowerCase().includes(hint));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    setIsDragInvalid(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    setIsDragInvalid(looksLikeUnsupportedDrag(e));
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    setIsDragInvalid(false);
  }, []);

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleDropZoneKeyDown = (e) => {
    if (selectedFile) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBrowse();
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileInfo(null);
    setError(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    setIsLoading(true);
    setError(null);

    try {
      console.log('📤 Starting upload for:', selectedFile.name);
      
      const uploadResult = await api.uploadFile(selectedFile, (progress) => {
        console.log(`📊 Upload progress: ${progress}%`);
        setUploadProgress(progress);
      });

      console.log('✅ Upload successful:', uploadResult);

      setJobId(uploadResult.job_id);
      setUploadStatus('profiling');

      console.log('📊 Fetching profile for job:', uploadResult.job_id);
      const profileResult = await api.profileData(uploadResult.job_id);
      
      console.log('✅ Profile received:', profileResult);
      
      setTotalRows(profileResult.total_rows);
      setTotalColumns(profileResult.total_columns);
      setQualityScore(profileResult.quality_score);
      setColumnProfile(profileResult.columns);
      setPreviewData(profileResult.preview_data);
      setUploadStatus('complete');
      
      console.log('📊 Profile data saved:', {
        total_rows: profileResult.total_rows,
        columns: profileResult.columns?.length,
        preview: profileResult.preview_data?.length
      });

      showSuccess(`"${selectedFile.name}" uploaded successfully! ${profileResult.total_rows.toLocaleString()} rows loaded.`);

      setTimeout(() => {
        setIsUploading(false);
        setIsLoading(false);
        // FIX (real wiring): previously always hardcoded to 'dashboard'
        // regardless of the "Default Page After Upload" setting, which
        // existed on the Settings page but was never actually read
        // anywhere. Falls back to 'dashboard' if the setting is
        // somehow missing, matching the prior behavior exactly.
        setCurrentPage(settings?.general?.defaultPage || 'dashboard');
      }, 800);

    } catch (err) {
      console.error('❌ Upload error:', err);
      console.error('Error details:', err.message);
      showError(err.message || 'Failed to upload file. Please try again.');
      setError(err.message || 'Failed to upload file');
      setUploadStatus('idle');
      setIsUploading(false);
      setIsLoading(false);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload size={48} />;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext === 'csv') return <FileCode size={48} />;
    if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet size={48} />;
    return <FileText size={48} />;
  };

  const fileSizeMB = fileInfo ? fileInfo.size / 1024 / 1024 : 0;
  const showSizeWarning = fileInfo && fileSizeMB >= WARN_SIZE_MB && fileSizeMB <= maxSizeMB;

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-hero">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Smart Data Cleaning</span>
          </div>
          <h1 className="gradient-text">Upload Your Data</h1>
          <p>Start cleaning your data in seconds. We support CSV and Excel formats.</p>
        </div>

        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${isDragInvalid ? 'dragging-invalid' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role={!selectedFile ? 'button' : undefined}
          tabIndex={!selectedFile ? 0 : undefined}
          onKeyDown={handleDropZoneKeyDown}
          aria-label={!selectedFile ? 'Upload a CSV or Excel file' : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="file-input"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />

          {!selectedFile ? (
            <div className="drop-zone-content">
              <div className="upload-icon-wrapper">
                <div className="upload-icon-bg">
                  {getFileIcon()}
                </div>
              </div>
              <h3>
                {isDragInvalid ? 'This file type isn\'t supported' : isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
              </h3>
              <p>or</p>
              <button className="browse-btn" onClick={handleBrowse}>
                Browse Files
              </button>
              <div className="format-hint">
                {supportedFormats.map((format) => (
                  <span key={format.ext} className="format-badge">
                    {format.icon}
                    {format.name}
                  </span>
                ))}
                <span className="size-limit">Max {maxSizeMB}MB</span>
              </div>
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-icon">
                {getFileIcon()}
              </div>
              <div className="file-details">
                <div className="file-name">
                  {fileInfo?.name}
                  <button className="remove-file" onClick={handleRemoveFile}>
                    <X size={16} />
                  </button>
                </div>
                <div className="file-meta">
                  <span className="meta-badge">
                    <Database size={12} />
                    {(fileInfo?.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <span className="meta-badge">
                    <FileText size={12} />
                    {fileInfo?.type}
                  </span>
                  {fileInfo?.rowCount && fileInfo.rowCount !== '...' && (
                    <span className="meta-badge">
                      <Zap size={12} />
                      {fileInfo.rowCount} rows{fileInfo.rowCountIsEstimate ? ' (est.)' : ''}
                    </span>
                  )}
                </div>
                {showSizeWarning && (
                  <div className="size-warning">
                    <AlertTriangle size={12} />
                    <span>This file is close to the {maxSizeMB}MB limit — upload may take longer than usual.</span>
                  </div>
                )}
              </div>
              
              {isUploading ? (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <div className="progress-status">
                    {uploadProgress < 100 ? (
                      <>
                        <Loader2 size={14} className="spin" />
                        Uploading... {uploadProgress}%
                      </>
                    ) : uploadStatus === 'profiling' ? (
                      <>
                        <Loader2 size={14} className="spin" />
                        Analyzing data...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        Complete! Redirecting...
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <button className="upload-btn" onClick={handleUpload}>
                  Upload File
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="upload-features">
          <div className="feature-item">
            <Shield size={16} />
            <span>Secure Processing</span>
          </div>
          <div className="feature-divider" />
          <div className="feature-item">
            <Zap size={16} />
            <span>Fast & Efficient</span>
          </div>
          <div className="feature-divider" />
          <div className="feature-item">
            <CheckCircle size={16} />
            <span>Auto Detection</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;