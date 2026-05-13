// frontend/src/components/Common/SuccessAlert.jsx
// Professional Success Alert Component

import React, { useState, useEffect } from 'react';
import { CheckCircle, X, Sparkles } from 'lucide-react';
import './SuccessAlert.css';

const SuccessAlert = ({ message, onClose, dismissible = true, autoDismiss = true, autoDismissTime = 4000 }) => {
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

  if (!isVisible) return null;

  return (
    <div className={`success-alert-3d ${isExiting ? 'exiting' : ''}`}>
      <div className="success-alert-icon">
        <CheckCircle size={20} />
        <div className="success-pulse" />
      </div>
      <div className="success-alert-content">
        <div className="success-alert-title">Success!</div>
        <div className="success-alert-message">{message}</div>
      </div>
      <div className="success-alert-badge">
        <Sparkles size={12} />
      </div>
      {dismissible && (
        <button className="success-action-btn" onClick={handleClose}>
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default SuccessAlert;