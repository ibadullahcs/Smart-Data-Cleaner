// frontend/src/components/Cleaning/SmartCleanButton.jsx
// Smart Clean Button - One-click automatic data cleaning

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { Sparkles, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import './SmartCleanButton.css';

const SmartCleanButton = ({ jobId, onComplete, onDownload }) => {
  const { setIsLoading, setError, setSuccess } = useApp();
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaned, setCleaned] = useState(false);
  const [results, setResults] = useState(null);

  const handleSmartClean = async () => {
    if (!jobId) {
      setError('No file uploaded. Please upload a file first.');
      return;
    }

    setIsCleaning(true);
    setIsLoading(true);
    setResults(null);
    setCleaned(false);

    try {
      // Call the smart-clean endpoint
      const response = await api.smartClean(jobId);
      
      setResults(response);
      setCleaned(true);
      setSuccess(`Smart Clean complete! ${response.changes_count} changes made. Health score improved from ${response.health_score_before}% to ${response.health_score_after}%.`);
      
      if (onComplete) {
        onComplete(response);
      }
    } catch (err) {
      console.error('Smart clean error:', err);
      setError(err.message || 'Smart clean failed. Please try again.');
    } finally {
      setIsCleaning(false);
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload('csv');
    } else {
      api.downloadFile(jobId, 'csv');
    }
    setSuccess('File downloaded successfully!');
  };

  const getHealthImprovement = () => {
    if (!results) return null;
    const improvement = results.health_score_after - results.health_score_before;
    if (improvement > 0) {
      return <span className="improvement positive">+{improvement}%</span>;
    } else if (improvement < 0) {
      return <span className="improvement negative">{improvement}%</span>;
    }
    return <span className="improvement neutral">0%</span>;
  };

  return (
    <div className="smart-clean-container">
      <div className="smart-clean-card">
        <div className="card-icon">
          <Sparkles size={32} />
        </div>
        <div className="card-content">
          <h3>Smart Clean</h3>
          <p>One-click automatic data cleaning. Our AI detects column types and applies the right cleaning operations.</p>
        </div>
        <button 
          className={`smart-clean-btn ${isCleaning ? 'cleaning' : ''} ${cleaned ? 'cleaned' : ''}`}
          onClick={handleSmartClean}
          disabled={isCleaning}
        >
          {isCleaning ? (
            <>
              <RefreshCw size={18} className="spin" />
              Cleaning...
            </>
          ) : cleaned ? (
            <>
              <CheckCircle size={18} />
              Cleaned!
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Run Smart Clean
            </>
          )}
        </button>
      </div>

      {results && (
        <div className="smart-clean-results">
          <div className="result-card">
            <div className="result-icon success">
              <CheckCircle size={20} />
            </div>
            <div className="result-info">
              <span className="result-label">Changes Made</span>
              <span className="result-value">{results.changes_count}</span>
            </div>
          </div>
          <div className="result-card">
            <div className="result-icon info">
              <AlertCircle size={20} />
            </div>
            <div className="result-info">
              <span className="result-label">Rows Affected</span>
              <span className="result-value">{results.rows_affected}</span>
            </div>
          </div>
          <div className="result-card">
            <div className="result-icon health">
              <Sparkles size={20} />
            </div>
            <div className="result-info">
              <span className="result-label">Health Score</span>
              <div className="result-value-group">
                <span className="result-value old">{results.health_score_before}%</span>
                <span className="result-arrow">→</span>
                <span className="result-value new">{results.health_score_after}%</span>
                {getHealthImprovement()}
              </div>
            </div>
          </div>
          <button className="download-btn" onClick={handleDownload}>
            Download Cleaned File
          </button>
        </div>
      )}

      {results && results.columns_affected && results.columns_affected.length > 0 && (
        <div className="affected-columns">
          <h4>Columns Affected</h4>
          <div className="columns-list">
            {results.columns_affected.map((col, idx) => (
              <span key={idx} className="column-tag">{col}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCleanButton;