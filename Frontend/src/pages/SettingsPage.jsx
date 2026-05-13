// frontend/src/pages/SettingsPage.jsx
// Professional Settings Page - Tabbed Layout with Preferences

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Settings, Save, RotateCcw, Download, Upload, 
  Sun, Moon, Monitor, Globe, Calendar, Hash,
  Database, AlertTriangle, Bell, Mail, Shield,
  ChevronRight, Check, X, HelpCircle, Eye,
  EyeOff, Code, Server, HardDrive, Zap,
  Sliders, ToggleLeft, ToggleRight, Lock, Unlock,
  Trash2, RefreshCw, FileJson, FileText,
  Activity, BarChart3, Palette, Sparkles, Brush,
  Filter, TrendingUp, Layers, Clock, Volume2, VolumeX
} from 'lucide-react';
import Tooltip from '../components/Common/Tooltip';
import './SettingsPage.css';

// Default settings
const DEFAULT_SETTINGS = {
  version: '2.0',
  general: {
    defaultPage: 'upload',
    theme: 'system',
    language: 'en',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '1,234.56',
    itemsPerPage: 50,
    autoSave: true
  },
  cleaning: {
    missingValueStrategy: 'median',
    dropThreshold: 50,
    autoRemoveDuplicates: false,
    trimSpaces: true,
    lowercaseText: false,
    smartCleanProfile: 'balanced'  // fast, balanced, deep
  },
  analysis: {
    defaultChartType: 'bar',
    enableAnimations: true,
    showAdvancedInsights: true,
    animationSpeed: 'normal',  // slow, normal, fast
    enable3DCharts: false
  },
  appearance: {
    theme: 'system',
    accentColor: '#6366f1',
    fontSize: 'medium',
    enableGlassmorphism: true,
    reduceMotion: false
  },
  notifications: {
    cleaningComplete: true,
    showErrors: true,
    smartSuggestions: true,
    soundEnabled: false
  },
  privacy: {
    autoDeleteData: false,
    dataStorageLocation: 'server',
    shareAnalytics: false
  }
};

// Storage key
const SETTINGS_STORAGE_KEY = 'smart_cleaner_settings';

// Helper functions
const loadSettings = () => {
  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
};

const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

const SettingsPage = () => {
  const { darkMode, toggleDarkMode, showSuccess, showError, showInfo } = useApp();
  
  // ============ STATE ============
  const [settings, setSettings] = useState(loadSettings);
  const [activeCategory, setActiveCategory] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const saved = loadSettings();
    if (JSON.stringify(saved) !== JSON.stringify(settings)) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [settings]);

  // Update setting
  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  // Save all settings
  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveSettings(settings);
      
      // Apply theme immediately
      if (settings.appearance.theme === 'dark') {
        document.documentElement.classList.add('dark');
        if (!darkMode) toggleDarkMode();
      } else if (settings.appearance.theme === 'light') {
        document.documentElement.classList.remove('dark');
        if (darkMode) toggleDarkMode();
      } else if (settings.appearance.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      // Apply accent color
      document.documentElement.style.setProperty('--primary', settings.appearance.accentColor);
      
      showSuccess('Settings saved successfully');
      setIsSaving(false);
      setHasChanges(false);
    }, 500);
  };

  // Reset to defaults
  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults? This cannot be undone.')) {
      setSettings(DEFAULT_SETTINGS);
      showInfo('Settings reset to defaults');
    }
  };

  // Export settings
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_cleaner_settings_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Settings exported');
  };

  // Import settings
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setSettings({ ...DEFAULT_SETTINGS, ...imported });
        showSuccess('Settings imported');
      } catch (err) {
        showError('Invalid settings file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Clear cache
  const handleClearCache = () => {
    if (window.confirm('Clear all cached data? This will not delete your sessions.')) {
      localStorage.removeItem('smart_cleaner_history');
      localStorage.removeItem('session_to_load');
      showSuccess('Cache cleared');
    }
  };

  const categories = [
    { id: 'general', label: 'General', icon: <Settings size={18} /> },
    { id: 'cleaning', label: 'Cleaning', icon: <Brush size={18} /> },
    { id: 'analysis', label: 'Analysis', icon: <BarChart3 size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield size={18} /> }
  ];

  const themeOptions = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> }
  ];

  const dateFormatOptions = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' }
  ];

  const pageOptions = [
    { value: 'upload', label: 'Upload Page' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'cleaner', label: 'Cleaner' },
    { value: 'analysis', label: 'Analysis' },
    { value: 'history', label: 'History' }
  ];

  const missingValueOptions = [
    { value: 'mean', label: 'Mean', description: 'Fill with average value' },
    { value: 'median', label: 'Median', description: 'Fill with median value' },
    { value: 'mode', label: 'Mode', description: 'Fill with most frequent value' }
  ];

  const smartCleanProfiles = [
    { value: 'fast', label: 'Fast Clean', description: 'Basic cleaning only', icon: <Zap size={14} /> },
    { value: 'balanced', label: 'Balanced', description: 'Standard cleaning', icon: <Activity size={14} /> },
    { value: 'deep', label: 'Deep Clean', description: 'Aggressive cleaning', icon: <Sparkles size={14} /> }
  ];

  const chartTypeOptions = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'pie', label: 'Pie Chart' }
  ];

  const animationSpeedOptions = [
    { value: 'slow', label: 'Slow' },
    { value: 'normal', label: 'Normal' },
    { value: 'fast', label: 'Fast' }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small', size: '14px' },
    { value: 'medium', label: 'Medium', size: '16px' },
    { value: 'large', label: 'Large', size: '18px' }
  ];

  const accentColors = [
    { value: '#6366f1', label: 'Indigo', color: '#6366f1' },
    { value: '#8b5cf6', label: 'Purple', color: '#8b5cf6' },
    { value: '#10b981', label: 'Green', color: '#10b981' },
    { value: '#f59e0b', label: 'Orange', color: '#f59e0b' },
    { value: '#ef4444', label: 'Red', color: '#ef4444' },
    { value: '#06b6d4', label: 'Cyan', color: '#06b6d4' }
  ];

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div className="header-left">
          <Settings size={24} />
          <h1>Settings</h1>
          {hasChanges && <span className="unsaved-badge">Unsaved changes</span>}
        </div>
        <div className="header-right">
          <Tooltip content="Export settings" position="bottom">
            <button className="settings-btn" onClick={handleExport}>
              <Download size={16} />
              Export
            </button>
          </Tooltip>
          <label className="settings-btn import-btn">
            <Upload size={16} />
            Import
            <input type="file" accept=".json" onChange={handleImport} hidden />
          </label>
          <Tooltip content="Reset to defaults" position="bottom">
            <button className="settings-btn reset" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset
            </button>
          </Tooltip>
          <button className={`save-btn ${hasChanges ? 'active' : ''}`} onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <div className="spinner-small" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="settings-container">
        {/* Sidebar */}
        <div className="settings-sidebar">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`sidebar-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon}
              <span>{cat.label}</span>
              <ChevronRight size={14} className="item-arrow" />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-content">
          
          {/* ============ GENERAL SETTINGS ============ */}
          {activeCategory === 'general' && (
            <div className="settings-section">
              <h2>General Preferences</h2>
              <p className="section-desc">Customize how Smart Cleaner behaves</p>

              <div className="settings-group">
                <div className="setting-row">
                  <div className="setting-info">
                    <label>Default Page</label>
                    <p className="setting-desc">Page to show after successful upload</p>
                  </div>
                  <div className="setting-control">
                    <select 
                      value={settings.general.defaultPage}
                      onChange={(e) => updateSetting('general', 'defaultPage', e.target.value)}
                    >
                      {pageOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Date Format</label>
                    <p className="setting-desc">How dates are displayed throughout the app</p>
                  </div>
                  <div className="setting-control">
                    <div className="radio-group">
                      {dateFormatOptions.map(opt => (
                        <label key={opt.value} className="radio-label">
                          <input
                            type="radio"
                            name="dateFormat"
                            value={opt.value}
                            checked={settings.general.dateFormat === opt.value}
                            onChange={(e) => updateSetting('general', 'dateFormat', e.target.value)}
                          />
                          <span>{opt.label}</span>
                          <small>({opt.example})</small>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Items Per Page</label>
                    <p className="setting-desc">Default number of rows to show in tables</p>
                  </div>
                  <div className="setting-control">
                    <select 
                      value={settings.general.itemsPerPage}
                      onChange={(e) => updateSetting('general', 'itemsPerPage', parseInt(e.target.value))}
                    >
                      <option value={25}>25 rows</option>
                      <option value={50}>50 rows</option>
                      <option value={100}>100 rows</option>
                      <option value={250}>250 rows</option>
                    </select>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Auto Save</label>
                    <p className="setting-desc">Automatically save settings changes</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.general.autoSave ? 'active' : ''}`}
                      onClick={() => updateSetting('general', 'autoSave', !settings.general.autoSave)}
                    >
                      {settings.general.autoSave ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.general.autoSave ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ CLEANING PREFERENCES ============ */}
          {activeCategory === 'cleaning' && (
            <div className="settings-section">
              <h2>Cleaning Preferences</h2>
              <p className="section-desc">Configure default cleaning behavior</p>

              <div className="settings-group">
                <div className="setting-row">
                  <div className="setting-info">
                    <label>Missing Values Strategy</label>
                    <p className="setting-desc">Default method for filling missing values</p>
                  </div>
                  <div className="setting-control">
                    <select 
                      value={settings.cleaning.missingValueStrategy}
                      onChange={(e) => updateSetting('cleaning', 'missingValueStrategy', e.target.value)}
                    >
                      {missingValueOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label} - {opt.description}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Drop Column Threshold</label>
                    <p className="setting-desc">Drop column if missing values exceed this percentage</p>
                  </div>
                  <div className="setting-control">
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.cleaning.dropThreshold}
                        onChange={(e) => updateSetting('cleaning', 'dropThreshold', parseInt(e.target.value))}
                      />
                      <span className="slider-value">{settings.cleaning.dropThreshold}%</span>
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Auto Remove Duplicates</label>
                    <p className="setting-desc">Automatically remove duplicate rows during cleaning</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.cleaning.autoRemoveDuplicates ? 'active' : ''}`}
                      onClick={() => updateSetting('cleaning', 'autoRemoveDuplicates', !settings.cleaning.autoRemoveDuplicates)}
                    >
                      {settings.cleaning.autoRemoveDuplicates ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.cleaning.autoRemoveDuplicates ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Trim Spaces</label>
                    <p className="setting-desc">Remove leading/trailing spaces from text columns</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.cleaning.trimSpaces ? 'active' : ''}`}
                      onClick={() => updateSetting('cleaning', 'trimSpaces', !settings.cleaning.trimSpaces)}
                    >
                      {settings.cleaning.trimSpaces ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.cleaning.trimSpaces ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Smart Clean Profile</label>
                    <p className="setting-desc">Choose cleaning intensity for Smart Clean button</p>
                  </div>
                  <div className="setting-control">
                    <div className="profile-buttons">
                      {smartCleanProfiles.map(profile => (
                        <button
                          key={profile.value}
                          className={`profile-btn ${settings.cleaning.smartCleanProfile === profile.value ? 'active' : ''}`}
                          onClick={() => updateSetting('cleaning', 'smartCleanProfile', profile.value)}
                        >
                          {profile.icon}
                          <span>{profile.label}</span>
                          <small>{profile.description}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ ANALYSIS PREFERENCES ============ */}
          {activeCategory === 'analysis' && (
            <div className="settings-section">
              <h2>Analysis Preferences</h2>
              <p className="section-desc">Configure chart and analysis behavior</p>

              <div className="settings-group">
                <div className="setting-row">
                  <div className="setting-info">
                    <label>Default Chart Type</label>
                    <p className="setting-desc">Preferred chart type for analysis</p>
                  </div>
                  <div className="setting-control">
                    <select 
                      value={settings.analysis.defaultChartType}
                      onChange={(e) => updateSetting('analysis', 'defaultChartType', e.target.value)}
                    >
                      {chartTypeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Enable Animations</label>
                    <p className="setting-desc">Show animations in charts and transitions</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.analysis.enableAnimations ? 'active' : ''}`}
                      onClick={() => updateSetting('analysis', 'enableAnimations', !settings.analysis.enableAnimations)}
                    >
                      {settings.analysis.enableAnimations ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.analysis.enableAnimations ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Animation Speed</label>
                    <p className="setting-desc">How fast animations should play</p>
                  </div>
                  <div className="setting-control">
                    <select 
                      value={settings.analysis.animationSpeed}
                      onChange={(e) => updateSetting('analysis', 'animationSpeed', e.target.value)}
                    >
                      {animationSpeedOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Show Advanced Insights</label>
                    <p className="setting-desc">Display AI-powered insights in analysis page</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.analysis.showAdvancedInsights ? 'active' : ''}`}
                      onClick={() => updateSetting('analysis', 'showAdvancedInsights', !settings.analysis.showAdvancedInsights)}
                    >
                      {settings.analysis.showAdvancedInsights ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.analysis.showAdvancedInsights ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Enable 3D Charts</label>
                    <p className="setting-desc">Use 3D effects in charts (experimental)</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.analysis.enable3DCharts ? 'active' : ''}`}
                      onClick={() => updateSetting('analysis', 'enable3DCharts', !settings.analysis.enable3DCharts)}
                    >
                      {settings.analysis.enable3DCharts ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.analysis.enable3DCharts ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ APPEARANCE SETTINGS ============ */}
          {activeCategory === 'appearance' && (
            <div className="settings-section">
              <h2>Appearance</h2>
              <p className="section-desc">Customize the look and feel</p>

              <div className="settings-group">
                <div className="setting-row">
                  <div className="setting-info">
                    <label>Theme</label>
                    <p className="setting-desc">Choose your preferred visual theme</p>
                  </div>
                  <div className="setting-control">
                    <div className="theme-buttons">
                      {themeOptions.map(opt => (
                        <button
                          key={opt.value}
                          className={`theme-btn ${settings.appearance.theme === opt.value ? 'active' : ''}`}
                          onClick={() => updateSetting('appearance', 'theme', opt.value)}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Accent Color</label>
                    <p className="setting-desc">Primary color used throughout the app</p>
                  </div>
                  <div className="setting-control">
                    <div className="color-picker">
                      {accentColors.map(color => (
                        <button
                          key={color.value}
                          className={`color-option ${settings.appearance.accentColor === color.value ? 'active' : ''}`}
                          style={{ backgroundColor: color.color }}
                          onClick={() => updateSetting('appearance', 'accentColor', color.value)}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Font Size</label>
                    <p className="setting-desc">Adjust text size throughout the app</p>
                  </div>
                  <div className="setting-control">
                    <div className="font-size-buttons">
                      {fontSizeOptions.map(opt => (
                        <button
                          key={opt.value}
                          className={`font-btn ${settings.appearance.fontSize === opt.value ? 'active' : ''}`}
                          onClick={() => updateSetting('appearance', 'fontSize', opt.value)}
                        >
                          <span style={{ fontSize: opt.size }}>Aa</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Enable Glassmorphism</label>
                    <p className="setting-desc">Use glass/blur effects on cards</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.appearance.enableGlassmorphism ? 'active' : ''}`}
                      onClick={() => updateSetting('appearance', 'enableGlassmorphism', !settings.appearance.enableGlassmorphism)}
                    >
                      {settings.appearance.enableGlassmorphism ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.appearance.enableGlassmorphism ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Reduce Motion</label>
                    <p className="setting-desc">Disable animations for accessibility</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.appearance.reduceMotion ? 'active' : ''}`}
                      onClick={() => updateSetting('appearance', 'reduceMotion', !settings.appearance.reduceMotion)}
                    >
                      {settings.appearance.reduceMotion ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.appearance.reduceMotion ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ NOTIFICATION SETTINGS ============ */}
          {activeCategory === 'notifications' && (
            <div className="settings-section">
              <h2>Notifications</h2>
              <p className="section-desc">Control when you receive alerts</p>

              <div className="settings-group">
                <div className="setting-row">
                  <div className="setting-info">
                    <label>Cleaning Complete Alerts</label>
                    <p className="setting-desc">Show notification when cleaning finishes</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.notifications.cleaningComplete ? 'active' : ''}`}
                      onClick={() => updateSetting('notifications', 'cleaningComplete', !settings.notifications.cleaningComplete)}
                    >
                      {settings.notifications.cleaningComplete ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.notifications.cleaningComplete ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Show Errors</label>
                    <p className="setting-desc">Display error messages when something goes wrong</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.notifications.showErrors ? 'active' : ''}`}
                      onClick={() => updateSetting('notifications', 'showErrors', !settings.notifications.showErrors)}
                    >
                      {settings.notifications.showErrors ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.notifications.showErrors ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Smart Suggestions</label>
                    <p className="setting-desc">Show AI-powered cleaning suggestions</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.notifications.smartSuggestions ? 'active' : ''}`}
                      onClick={() => updateSetting('notifications', 'smartSuggestions', !settings.notifications.smartSuggestions)}
                    >
                      {settings.notifications.smartSuggestions ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.notifications.smartSuggestions ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Sound Effects</label>
                    <p className="setting-desc">Play sounds on important events</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.notifications.soundEnabled ? 'active' : ''}`}
                      onClick={() => updateSetting('notifications', 'soundEnabled', !settings.notifications.soundEnabled)}
                    >
                      {settings.notifications.soundEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.notifications.soundEnabled ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ PRIVACY SETTINGS ============ */}
          {activeCategory === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy & Security</h2>
              <p className="section-desc">Manage your data and privacy</p>

              <div className="settings-group">
                <div className="setting-row">
                  <div className="setting-info">
                    <label>Auto-Delete Data After Session</label>
                    <p className="setting-desc">Automatically delete uploaded files when you close the app</p>
                  </div>
                  <div className="setting-control">
                    <button 
                      className={`toggle-btn ${settings.privacy.autoDeleteData ? 'active' : ''}`}
                      onClick={() => updateSetting('privacy', 'autoDeleteData', !settings.privacy.autoDeleteData)}
                    >
                      {settings.privacy.autoDeleteData ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      <span>{settings.privacy.autoDeleteData ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Data Storage Location</label>
                    <p className="setting-desc">Where your cleaning history is stored</p>
                  </div>
                  <div className="setting-control">
                    <select 
                      value={settings.privacy.dataStorageLocation}
                      onChange={(e) => updateSetting('privacy', 'dataStorageLocation', e.target.value)}
                    >
                      <option value="local">Local Only (Browser)</option>
                      <option value="server">Server (Cloud)</option>
                    </select>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Clear Cache</label>
                    <p className="setting-desc">Clear temporary files and cached data</p>
                  </div>
                  <div className="setting-control">
                    <button className="danger-btn" onClick={handleClearCache}>
                      <Trash2 size={14} />
                      Clear Cache
                    </button>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <label>Export All Data</label>
                    <p className="setting-desc">Download all your cleaning history</p>
                  </div>
                  <div className="setting-control">
                    <button className="secondary-btn" onClick={handleExport}>
                      <FileJson size={14} />
                      Export Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Footer */}
          <div className="settings-footer">
            <button className="reset-footer-btn" onClick={handleReset}>
              <RotateCcw size={14} />
              Reset to Defaults
            </button>
            <button className={`save-footer-btn ${hasChanges ? 'active' : ''}`} onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? (
                <>
                  <div className="spinner-small" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save All Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;