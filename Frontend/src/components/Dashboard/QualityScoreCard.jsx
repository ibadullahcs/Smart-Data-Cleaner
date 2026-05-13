// frontend/src/components/Dashboard/QualityScoreCard.jsx
// Quality Score Card - Displays data health score with gauge

import React from 'react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './QualityScoreCard.css';

const QualityScoreCard = ({ score, previousScore = null, size = 'large' }) => {
  const getScoreColor = (scoreValue) => {
    if (scoreValue >= 80) return 'excellent';
    if (scoreValue >= 60) return 'good';
    if (scoreValue >= 40) return 'fair';
    return 'poor';
  };

  const getScoreLabel = (scoreValue) => {
    if (scoreValue >= 80) return 'Excellent';
    if (scoreValue >= 60) return 'Good';
    if (scoreValue >= 40) return 'Fair';
    return 'Poor';
  };

  const getScoreIcon = (scoreValue) => {
    if (scoreValue >= 80) return '🎉';
    if (scoreValue >= 60) return '👍';
    if (scoreValue >= 40) return '📊';
    return '⚠️';
  };

  const getScoreMessage = (scoreValue) => {
    if (scoreValue >= 80) return 'Your data is in great shape!';
    if (scoreValue >= 60) return 'Good quality, but room for improvement.';
    if (scoreValue >= 40) return 'Data needs attention.';
    return 'Significant issues detected. Needs cleaning.';
  };

  const getTrendIcon = () => {
    if (!previousScore) return null;
    const difference = score - previousScore;
    if (difference > 0) return <TrendingUp size={14} className="trend-up" />;
    if (difference < 0) return <TrendingDown size={14} className="trend-down" />;
    return <Minus size={14} className="trend-neutral" />;
  };

  const getTrendText = () => {
    if (!previousScore) return null;
    const difference = score - previousScore;
    if (difference > 0) return `+${difference}% from last cleaning`;
    if (difference < 0) return `${difference}% from last cleaning`;
    return 'No change from last cleaning';
  };

  const scoreColor = getScoreColor(score);
  const radius = size === 'large' ? 80 : 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`quality-score-card ${scoreColor} ${size}`}>
      <div className="card-header">
        <Activity size={20} />
        <h3>Data Health Score</h3>
        {previousScore !== undefined && (
          <div className="trend-indicator">
            {getTrendIcon()}
            <span className="trend-text">{getTrendText()}</span>
          </div>
        )}
      </div>

      <div className="score-container">
        <div className="gauge-container">
          <svg className="gauge-svg" viewBox="0 0 200 100">
            <defs>
              <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="33%" stopColor="#f59e0b" />
                <stop offset="66%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              className="gauge-bg"
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="var(--light-dark)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              className="gauge-fill"
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="url(#gauge-gradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="score-value">
            <span className="score-number">{score}</span>
            <span className="score-percent">%</span>
          </div>
        </div>

        <div className="score-info">
          <div className={`score-badge ${scoreColor}`}>
            <span className="score-icon">{getScoreIcon(score)}</span>
            <span className="score-label">{getScoreLabel(score)}</span>
          </div>
          <p className="score-message">{getScoreMessage(score)}</p>
        </div>
      </div>

      <div className="score-categories">
        <div className="category">
          <div className="category-bar excellent" style={{ width: '100%' }} />
          <span className="category-label">Excellent (80-100)</span>
        </div>
        <div className="category">
          <div className="category-bar good" style={{ width: '100%' }} />
          <span className="category-label">Good (60-79)</span>
        </div>
        <div className="category">
          <div className="category-bar fair" style={{ width: '100%' }} />
          <span className="category-label">Fair (40-59)</span>
        </div>
        <div className="category">
          <div className="category-bar poor" style={{ width: '100%' }} />
          <span className="category-label">Poor (0-39)</span>
        </div>
      </div>
    </div>
  );
};

export default QualityScoreCard;