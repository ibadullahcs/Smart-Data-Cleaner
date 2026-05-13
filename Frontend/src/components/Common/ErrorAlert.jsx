// frontend/src/components/Common/ErrorAlert.jsx
// Professional Error Alert Component

import React, { useState, useEffect } from 'react';
import { AlertCircle, X, RefreshCw, HelpCircle } from 'lucide-react';
import './ErrorAlert.css';

const ErrorAlert = ({ message, onClose, dismissible = true, autoDismiss = false, autoDismissTime = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoDismissTime);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissTime]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (!isVisible) return null;

  return (
    <div className={`error-alert-3d ${isExiting ? 'exiting' : ''}`}>
      <div className="error-alert-icon">
        <AlertCircle size={20} />
      </div>
      <div className="error-alert-content">
        <div className="error-alert-title">Error</div>
        <div className="error-alert-message">{message}</div>
      </div>
      <div className="error-alert-actions">
        <button className="error-action-btn retry" onClick={handleRetry} title="Retry">
          <RefreshCw size={16} />
        </button>
        {dismissible && (
          <button className="error-action-btn close" onClick={handleClose} title="Dismiss">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;