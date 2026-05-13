// frontend/src/components/Cleaning/BulkCleanPanel.jsx
import React, { useState } from 'react';
import { 
  Sparkles, Zap, Shield, TrendingUp, Type, Hash,
  Calendar, Mail, Phone, Loader2, CheckCircle,
  AlertCircle, Layers, Scissors, Copy, Edit3, X, Wand2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import './BulkCleanPanel.css';

const BulkCleanPanel = ({ isOpen, onClose, onComplete }) => {
  const { jobId, showSuccess, showError } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState('comprehensive');
  const [progress, setProgress] = useState(null);

  const cleaningProfiles = [
    {
      id: 'comprehensive',
      name: '✨ Comprehensive Clean',
      description: 'All cleaning operations in optimal order',
      icon: <Sparkles size={20} />,
      color: '#6366f1',
      operations: [
        'Remove duplicate rows',
        'Clean text formatting',
        'Fix encoding issues',
        'Fill missing values intelligently',
        'Standardize text case',
        'Cap outliers'
      ]
    },
    {
      id: 'basic',
      name: '⚡ Basic Clean',
      description: 'Quick cleaning for messy data',
      icon: <Zap size={20} />,
      color: '#f59e0b',
      operations: [
        'Remove duplicate rows',
        'Trim whitespace',
        'Fix basic encoding'
      ]
    },
    {
      id: 'aggressive',
      name: '🔧 Aggressive Clean',
      description: 'Thorough cleaning for dirty data',
      icon: <Shield size={20} />,
      color: '#ef4444',
      operations: [
        'Remove all duplicates',
        'Drop rows with missing values',
        'Remove statistical outliers',
        'Force consistent formatting'
      ]
    },
    {
      id: 'numeric_only',
      name: '🔢 Numeric Focus',
      description: 'Clean only numeric columns',
      icon: <Hash size={20} />,
      color: '#10b981',
      operations: [
        'Fill missing numeric values',
        'Remove outliers',
        'Convert to proper numeric types'
      ]
    },
    {
      id: 'text_only',
      name: '📝 Text Focus',
      description: 'Clean only text columns',
      icon: <Type size={20} />,
      color: '#8b5cf6',
      operations: [
        'Trim spaces',
        'Fix encoding',
        'Standardize case',
        'Remove special characters'
      ]
    }
  ];

  const handleClean = async () => {
    if (!jobId) {
      showError('No active job. Please upload a file first.');
      return;
    }

    setIsLoading(true);
    setProgress({ step: 0, total: 5, message: 'Starting cleaning process...' });

    try {
      let result;

      setProgress({ step: 1, total: 5, message: 'Analyzing data structure...' });
      await new Promise(r => setTimeout(r, 500));

      setProgress({ step: 2, total: 5, message: 'Applying cleaning operations...' });
      
      switch (selectedProfile) {
        case 'comprehensive':
          result = await api.comprehensiveClean(jobId);
          break;
        case 'basic':
          result = await api.applyCleaningProfile(jobId, 'basic');
          break;
        case 'aggressive':
          result = await api.applyCleaningProfile(jobId, 'aggressive');
          break;
        case 'numeric_only':
          result = await api.applyCleaningProfile(jobId, 'numeric_only');
          break;
        case 'text_only':
          result = await api.applyCleaningProfile(jobId, 'text_only');
          break;
        default:
          result = await api.comprehensiveClean(jobId);
      }

      setProgress({ step: 4, total: 5, message: 'Saving cleaned data...' });
      await new Promise(r => setTimeout(r, 500));

      setProgress({ step: 5, total: 5, message: 'Complete!' });

      showSuccess(result.message || 'Cleaning completed successfully!');
      
      if (onComplete) {
        onComplete(result);
      }
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Bulk clean error:', error);
      showError(error.message || 'Cleaning failed. Please check if bulk clean endpoints are available.');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="bulk-clean-overlay" onClick={onClose} />
      <div className="bulk-clean-panel">
        <div className="panel-header">
          <h3><Wand2 size={20} /> Bulk Data Cleaning</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="panel-body">
          <p className="description">
            Apply cleaning operations to your ENTIRE dataset at once. 
            Choose a profile based on your data quality needs.
          </p>

          <div className="profiles-grid">
            {cleaningProfiles.map(profile => (
              <div
                key={profile.id}
                className={`profile-card ${selectedProfile === profile.id ? 'selected' : ''}`}
                onClick={() => setSelectedProfile(profile.id)}
              >
                <div className="profile-icon" style={{ color: profile.color }}>
                  {profile.icon}
                </div>
                <div className="profile-info">
                  <h4>{profile.name}</h4>
                  <p>{profile.description}</p>
                  <ul className="profile-operations">
                    {profile.operations.map((op, i) => (
                      <li key={i}>
                        <CheckCircle size={12} />
                        <span>{op}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {progress && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(progress.step / progress.total) * 100}%` }}
                />
              </div>
              <div className="progress-message">
                {progress.message}
                {isLoading && <Loader2 size={14} className="spin" />}
              </div>
            </div>
          )}

          <div className="panel-footer">
            <button 
              className="clean-btn"
              onClick={handleClean}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Start Cleaning
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkCleanPanel;