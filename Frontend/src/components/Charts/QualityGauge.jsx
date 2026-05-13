// frontend/src/components/Charts/QualityGauge.jsx
// Quality Gauge Chart - Visual representation of data health score

import React, { useEffect, useRef } from 'react';
import './QualityGauge.css';

const QualityGauge = ({ score, size = 'medium', showLabel = true }) => {
  const canvasRef = useRef(null);
  
  const getScoreColor = (scoreValue) => {
    if (scoreValue >= 80) return '#10b981';
    if (scoreValue >= 60) return '#3b82f6';
    if (scoreValue >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (scoreValue) => {
    if (scoreValue >= 80) return 'Excellent';
    if (scoreValue >= 60) return 'Good';
    if (scoreValue >= 40) return 'Fair';
    return 'Poor';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height - 20;
    const radius = Math.min(width, height) / 2 - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background arc (gray)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 15;
    ctx.stroke();
    
    // Draw foreground arc (colored based on score)
    const angle = Math.PI + (score / 100) * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, angle);
    ctx.strokeStyle = getScoreColor(score);
    ctx.lineWidth = 15;
    ctx.stroke();
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 20, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw score text
    ctx.font = `bold ${size === 'small' ? 20 : size === 'large' ? 36 : 28}px 'Inter', sans-serif`;
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${score}%`, centerX, centerY - 5);
    
    // Draw label
    if (showLabel) {
      ctx.font = '12px "Inter", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(getScoreLabel(score), centerX, centerY + 20);
    }
    
    // Draw tick marks
    for (let i = 0; i <= 100; i += 20) {
      const tickAngle = Math.PI + (i / 100) * Math.PI;
      const x1 = centerX + (radius - 10) * Math.cos(tickAngle);
      const y1 = centerY + (radius - 10) * Math.sin(tickAngle);
      const x2 = centerX + (radius - 20) * Math.cos(tickAngle);
      const y2 = centerY + (radius - 20) * Math.sin(tickAngle);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
  }, [score, size, showLabel]);

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'gauge-small';
      case 'large': return 'gauge-large';
      default: return 'gauge-medium';
    }
  };

  return (
    <div className={`quality-gauge ${getSizeClass()}`}>
      <canvas
        ref={canvasRef}
        width={size === 'small' ? 150 : size === 'large' ? 300 : 200}
        height={size === 'small' ? 100 : size === 'large' ? 180 : 130}
        className="gauge-canvas"
      />
    </div>
  );
};

export default QualityGauge;