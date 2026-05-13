// frontend/src/components/Common/LoadingSpinner.jsx
// Professional Loading Spinner with Animations

import React from 'react';
import { Sparkles } from 'lucide-react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', fullPage = false }) => {
  const sizeClass = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  }[size];

  const SpinnerContent = () => (
    <div className="loading-container">
      <div className={`spinner-3d ${sizeClass}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring ring-2"></div>
        <div className="spinner-ring ring-3"></div>
        <div className="spinner-core">
          <Sparkles size={size === 'small' ? 16 : size === 'large' ? 32 : 24} className="spinner-icon" />
        </div>
      </div>
      {text && (
        <div className="loading-text">
          <span className="loading-text-main">{text}</span>
          <div className="loading-dots">
            <span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="loading-overlay">
        <div className="loading-backdrop" />
        <SpinnerContent />
      </div>
    );
  }

  return <SpinnerContent />;
};

export default LoadingSpinner;