// frontend/src/utils/colors.js
// Chart color utilities

export const chartColors = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  orange: '#f97316',
  rose: '#f43f5e'
};

export const colorPalette = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.success,
  chartColors.warning,
  chartColors.error,
  chartColors.info,
  chartColors.purple,
  chartColors.pink,
  chartColors.indigo,
  chartColors.cyan,
  chartColors.teal,
  chartColors.orange,
  chartColors.rose
];

export const getColor = (index) => {
  return colorPalette[index % colorPalette.length];
};

export const getGradient = (ctx, startColor, endColor) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);
  return gradient;
};

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        boxWidth: 10,
        font: {
          family: "'Inter', sans-serif",
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: {
        family: "'Inter', sans-serif",
        size: 13
      },
      bodyFont: {
        family: "'Inter', sans-serif",
        size: 12
      },
      padding: 10,
      cornerRadius: 8
    }
  }
};

export default {
  chartColors,
  colorPalette,
  getColor,
  getGradient,
  chartOptions
};