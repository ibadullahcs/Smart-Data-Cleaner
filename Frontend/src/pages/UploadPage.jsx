// frontend/src/pages/UploadPage.jsx
// Professional Upload Page - Fixed duplicate notifications

import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Upload, FileText, X, CheckCircle, AlertCircle, 
  Sparkles, ArrowRight, Database, Zap, Shield,
  FileSpreadsheet, FileCode, Loader2
} from 'lucide-react';
import './UploadPage.css';

const UploadPage = () => {
  const { 
    setCurrentPage, setJobId, setUploadData, setProfileData,
    setTotalRows, setTotalColumns, setQualityScore,
    setColumnProfile, setPreviewData, setFilename,
    setFileSize, showSuccess, showError, setIsLoading
  } = useApp();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, profiling, complete

  const supportedFormats = [
    { ext: '.csv', name: 'CSV', icon: <FileCode size={14} />, color: '#10b981' },
    { ext: '.xlsx', name: 'Excel', icon: <FileSpreadsheet size={14} />, color: '#10b981' },
    { ext: '.xls', name: 'Excel', icon: <FileSpreadsheet size={14} />, color: '#10b981' }
  ];

  const maxSizeMB = 100;

  // Simple file validation (no external dependency)
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
      // For large files, don't try to read the entire content
      let rowCount = '...';
      
      if (file.name.endsWith('.csv') && file.size < 5 * 1024 * 1024) {
        // Only read first few KB for small files
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          const lines = content.split('\n');
          rowCount = lines.length - 1;
          resolve({
            name: file.name,
            size: file.size,
            type: file.name.split('.').pop().toUpperCase(),
            rowCount: rowCount > 0 ? rowCount.toLocaleString() : '...',
            lastModified: new Date(file.lastModified).toLocaleDateString()
          });
        };
        reader.readAsText(file.slice(0, 1024 * 100)); // Read first 100KB only
      } else {
        resolve({
          name: file.name,
          size: file.size,
          type: file.name.split('.').pop().toUpperCase(),
          rowCount: '...',
          lastModified: new Date(file.lastModified).toLocaleDateString()
        });
      }
    });
  };

  const handleFileSelect = async (file) => {
    setError(null);
    
    // Validate file type
    const typeValidation = validateFileType(file);
    if (!typeValidation.isValid) {
      setError(typeValidation.error);
      setSelectedFile(null);
      setFileInfo(null);
      return;
    }
    
    // Validate file size
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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleBrowse = () => {
    document.getElementById('file-input').click();
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
    document.getElementById('file-input').value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    setIsLoading(true);
    setError(null);

    try {
      console.log('📤 Starting upload for:', selectedFile.name);
      
      // Step 1: Upload file to backend
      const uploadResult = await api.uploadFile(selectedFile, (progress) => {
        console.log(`📊 Upload progress: ${progress}%`);
        setUploadProgress(progress);
      });

      console.log('✅ Upload successful:', uploadResult);
      setJobId(uploadResult.job_id);
      setUploadData(uploadResult);
      setUploadStatus('profiling');
      
      // ONLY ONE SUCCESS NOTIFICATION FOR UPLOAD
      // Removed duplicate showSuccess here - will show only after profiling

      // Step 2: Get data profile
      console.log('📊 Fetching profile for job:', uploadResult.job_id);
      const profileResult = await api.profileData(uploadResult.job_id);
      
      console.log('✅ Profile received:', profileResult);
      
      // Step 3: Store profile data in context
      setProfileData(profileResult);
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

      // SINGLE SUCCESS NOTIFICATION - Only one message
      showSuccess(`"${selectedFile.name}" uploaded successfully! ${profileResult.total_rows.toLocaleString()} rows loaded.`);

      // Step 4: Navigate to dashboard after short delay
      setTimeout(() => {
        setIsUploading(false);
        setIsLoading(false);
        setCurrentPage('dashboard');
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

  return (
    <div className="upload-page">
      <div className="upload-container">
        {/* Hero Section */}
        <div className="upload-hero">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Smart Data Cleaning</span>
          </div>
          <h1 className="gradient-text">Upload Your Data</h1>
          <p>Start cleaning your data in seconds. We support CSV and Excel formats.</p>
        </div>

        {/* Drop Zone */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
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
              <h3>Drag & drop your file here</h3>
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
                      {fileInfo.rowCount} rows (est.)
                    </span>
                  )}
                </div>
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

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Features Section */}
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