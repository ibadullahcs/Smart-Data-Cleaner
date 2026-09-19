// frontend/src/pages/SettingsPage.jsx
// Professional Settings Page - unified with AppContext, genuine autosave

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp, DEFAULT_SETTINGS } from '../context/AppContext';
import { 
  Settings, Save, RotateCcw, Download, Upload, 
  Sun, Moon, Monitor, Globe, Calendar, Hash,
  Database, AlertTriangle, Bell, Mail, Shield,
  ChevronRight, Check, X, HelpCircle, Eye,
  EyeOff, Code, Server, HardDrive, Zap,
  Sliders, ToggleLeft, ToggleRight, Lock, Unlock,
  Trash2, RefreshCw, FileJson, FileText,
  Activity, BarChart3, Palette, Sparkles, Brush,
  Filter, TrendingUp, Layers, Clock, Volume2, VolumeX,
  Search, CheckCircle2, Info
} from 'lucide-react';
import Tooltip from '../components/Common/Tooltip';
import './SettingsPage.css';

const StatusTag = ({ status, note }) => {
  if (status === 'live') {
    return (
      <Tooltip content={note || 'This setting actively affects the app'} position="top">
        <span className="status-tag live">
          <CheckCircle2 size={11} /> Live
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={note || 'Saved, but not yet applied anywhere in the app'} position="top">
      <span className="status-tag pending">
        <Info size={11} /> Not yet applied
      </span>
    </Tooltip>
  );
};

const SettingRow = ({ label, description, status, statusNote, searchQuery, children }) => {
  if (searchQuery) {
    const haystack = `${label} ${description || ''}`.toLowerCase();
    if (!haystack.includes(searchQuery.toLowerCase())) return null;
  }
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label-line">
          <label>{label}</label>
          <StatusTag status={status} note={statusNote} />
        </div>
        {description && <p className="setting-desc">{description}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
};

const SettingsPage = () => {
  const {
    darkMode, toggleDarkMode, showSuccess, showError, showInfo,
    settings: contextSettings, applySettings
  } = useApp();

  const [settings, setSettings] = useState(contextSettings);
  const [activeCategory, setActiveCategory] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    setHasChanges(JSON.stringify(contextSettings) !== JSON.stringify(settings));
  }, [settings, contextSettings]);

  useEffect(() => {
    if (!settings.general.autoSave) return;
    if (JSON.stringify(contextSettings) === JSON.stringify(settings)) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      applySettings(settings);
      setHasChanges(false);
    }, 800);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], [key]: value }
    }));
  };

  const handleThemeChange = (value) => {
    const next = { ...settings, appearance: { ...settings.appearance, theme: value } };
    setSettings(next);
    applySettings(next);

    let shouldBeDark;
    if (value === 'dark') shouldBeDark = true;
    else if (value === 'light') shouldBeDark = false;
    else shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (shouldBeDark !== darkMode) toggleDarkMode();
  };

  const handleAccentChange = (value) => {
    const next = { ...settings, appearance: { ...settings.appearance, accentColor: value } };
    setSettings(next);
    applySettings(next);
    document.documentElement.style.setProperty('--primary', value);
  };

  const handleReduceMotionChange = (value) => {
    const next = { ...settings, appearance: { ...settings.appearance, reduceMotion: value } };
    setSettings(next);
    applySettings(next);
    document.documentElement.classList.toggle('reduce-motion', value);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      applySettings(settings);
      showSuccess('Settings saved successfully');
      setIsSaving(false);
      setHasChanges(false);
    }, 400);
  };

  const handleReset = () => {
    if (window.confirm('Reset ALL settings to defaults? This cannot be undone.')) {
      setSettings(DEFAULT_SETTINGS);
      applySettings(DEFAULT_SETTINGS);
      handleThemeChange(DEFAULT_SETTINGS.appearance.theme);
      document.documentElement.style.setProperty('--primary', DEFAULT_SETTINGS.appearance.accentColor);
      document.documentElement.classList.toggle('reduce-motion', DEFAULT_SETTINGS.appearance.reduceMotion);
      showInfo('Settings reset to defaults');
    }
  };

  const handleResetCategory = () => {
    const label = categories.find(c => c.id === activeCategory)?.label || activeCategory;
    if (window.confirm(`Reset "${label}" settings to defaults?`)) {
      const next = { ...settings, [activeCategory]: DEFAULT_SETTINGS[activeCategory] };
      setSettings(next);
      if (activeCategory === 'appearance') {
        applySettings(next);
        handleThemeChange(DEFAULT_SETTINGS.appearance.theme);
        document.documentElement.style.setProperty('--primary', DEFAULT_SETTINGS.appearance.accentColor);
        document.documentElement.classList.toggle('reduce-motion', DEFAULT_SETTINGS.appearance.reduceMotion);
      }
      showInfo(`${label} settings reset`);
    }
  };

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

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setSettings({ ...DEFAULT_SETTINGS, ...imported });
        showSuccess('Settings imported — click Save (or enable Auto Save) to keep them');
      } catch (err) {
        showError('Invalid settings file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

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
    { value: 'fast', label: 'Fast Clean', description: 'Duplicates + trim only', icon: <Zap size={14} /> },
    { value: 'balanced', label: 'Balanced', description: 'Standard cleaning', icon: <Activity size={14} /> },
    { value: 'deep', label: 'Deep Clean', description: 'Also fills text/category gaps', icon: <Sparkles size={14} /> }
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

  // Recomputed for this revision: 20 of 28 settings are genuinely live.
  const functionalCounts = useMemo(() => ({ live: 20, total: 28 }), []);

  return (
    <div className="settings-page">
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
          <Tooltip content="Reset all settings to defaults" position="bottom">
            <button className="settings-btn reset" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset All
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

      <div className="settings-overview-strip">
        <div className="overview-preview-card">
          <div className="preview-swatch" style={{ background: settings.appearance.accentColor }} />
          <div className="preview-info">
            <span className="preview-title">Current appearance</span>
            <span className="preview-detail">
              {themeOptions.find(t => t.value === settings.appearance.theme)?.label || 'System'} theme · Accent {settings.appearance.accentColor}
            </span>
          </div>
        </div>
        <div className="overview-status-card">
          <Info size={16} />
          <span>
            <strong>{functionalCounts.live}</strong> of <strong>{functionalCounts.total}</strong> settings are actively applied right now — the rest are saved but not yet wired to app behavior, clearly marked below.
          </span>
        </div>
      </div>

      <div className="settings-container">
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

        <div className="settings-content">

          <div className="settings-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-settings-search" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
          
          {/* ============ GENERAL SETTINGS ============ */}
          {activeCategory === 'general' && (
            <div className="settings-section">
              <h2>General Preferences</h2>
              <p className="section-desc">Customize how Smart Cleaner behaves</p>

              <div className="settings-group">
                <SettingRow
                  label="Default Page After Upload"
                  description="Page to show after a successful upload"
                  status="live"
                  statusNote="Genuinely used by the Upload page's post-upload redirect"
                  searchQuery={searchQuery}
                >
                  <select 
                    value={settings.general.defaultPage}
                    onChange={(e) => updateSetting('general', 'defaultPage', e.target.value)}
                  >
                    {pageOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow
                  label="Date Format"
                  description="How dates are displayed throughout the app"
                  status="pending"
                  searchQuery={searchQuery}
                >
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
                </SettingRow>

                <SettingRow
                  label="Items Per Page"
                  description="Default number of rows shown in the Cleaner table"
                  status="live"
                  statusNote="Sets the Cleaner page's initial rows-per-page — change it there afterward any time"
                  searchQuery={searchQuery}
                >
                  <select 
                    value={settings.general.itemsPerPage}
                    onChange={(e) => updateSetting('general', 'itemsPerPage', parseInt(e.target.value))}
                  >
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                    <option value={250}>250 rows</option>
                  </select>
                </SettingRow>

                <SettingRow
                  label="Auto Save Settings"
                  description="Save changes automatically as you make them, without clicking Save"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.general.autoSave ? 'active' : ''}`}
                    onClick={() => updateSetting('general', 'autoSave', !settings.general.autoSave)}
                  >
                    {settings.general.autoSave ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.general.autoSave ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>
              </div>
            </div>
          )}

          {/* ============ CLEANING PREFERENCES ============ */}
          {activeCategory === 'cleaning' && (
            <div className="settings-section">
              <h2>Cleaning Preferences</h2>
              <p className="section-desc">Configure default cleaning behavior for Smart Clean</p>
              <div className="section-banner live">
                <CheckCircle2 size={14} />
                <span>Every setting in this section is genuinely wired to what the Smart Clean button does.</span>
              </div>

              <div className="settings-group">
                <SettingRow
                  label="Missing Values Strategy"
                  description="How Smart Clean fills missing numeric values"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <select 
                    value={settings.cleaning.missingValueStrategy}
                    onChange={(e) => updateSetting('cleaning', 'missingValueStrategy', e.target.value)}
                  >
                    {missingValueOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label} - {opt.description}</option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow
                  label="Enable Drop Threshold"
                  description="Let Smart Clean drop columns whose missing values exceed the threshold below"
                  status="live"
                  statusNote="Off by default — so simply setting a threshold value never drops anything on its own"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.cleaning.enableDropThreshold ? 'active' : ''}`}
                    onClick={() => updateSetting('cleaning', 'enableDropThreshold', !settings.cleaning.enableDropThreshold)}
                  >
                    {settings.cleaning.enableDropThreshold ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.cleaning.enableDropThreshold ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Drop Column Threshold"
                  description="Drop a column if its missing values exceed this percentage (only when enabled above)"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <div className="slider-container">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.cleaning.dropThreshold}
                      disabled={!settings.cleaning.enableDropThreshold}
                      onChange={(e) => updateSetting('cleaning', 'dropThreshold', parseInt(e.target.value))}
                    />
                    <span className="slider-value">{settings.cleaning.dropThreshold}%</span>
                  </div>
                </SettingRow>

                <SettingRow
                  label="Auto Remove Duplicates"
                  description="Let Smart Clean remove duplicate rows"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.cleaning.autoRemoveDuplicates ? 'active' : ''}`}
                    onClick={() => updateSetting('cleaning', 'autoRemoveDuplicates', !settings.cleaning.autoRemoveDuplicates)}
                  >
                    {settings.cleaning.autoRemoveDuplicates ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.cleaning.autoRemoveDuplicates ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Trim Spaces"
                  description="Let Smart Clean remove leading/trailing spaces from text columns"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.cleaning.trimSpaces ? 'active' : ''}`}
                    onClick={() => updateSetting('cleaning', 'trimSpaces', !settings.cleaning.trimSpaces)}
                  >
                    {settings.cleaning.trimSpaces ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.cleaning.trimSpaces ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Smart Clean Profile"
                  description="Fast (duplicates + trim only), Balanced (standard), or Deep (also fills gaps in text/category columns)"
                  status="live"
                  searchQuery={searchQuery}
                >
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
                </SettingRow>
              </div>
            </div>
          )}

          {/* ============ ANALYSIS PREFERENCES ============ */}
          {activeCategory === 'analysis' && (
            <div className="settings-section">
              <h2>Analysis Preferences</h2>
              <p className="section-desc">Configure chart and analysis behavior</p>

              <div className="settings-group">
                <SettingRow
                  label="Default Chart Type"
                  description="Preferred chart type for analysis"
                  status="pending"
                  statusNote="The Analysis page uses a purpose-built chart type per section (histogram, donut, correlation bars) — a single global override doesn't cleanly apply to all of them"
                  searchQuery={searchQuery}
                >
                  <select 
                    value={settings.analysis.defaultChartType}
                    onChange={(e) => updateSetting('analysis', 'defaultChartType', e.target.value)}
                  >
                    {chartTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow
                  label="Enable Animations"
                  description="Show animations when charts render on the Analysis page"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.analysis.enableAnimations ? 'active' : ''}`}
                    onClick={() => updateSetting('analysis', 'enableAnimations', !settings.analysis.enableAnimations)}
                  >
                    {settings.analysis.enableAnimations ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.analysis.enableAnimations ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Animation Speed"
                  description="How fast chart animations play"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <select 
                    value={settings.analysis.animationSpeed}
                    onChange={(e) => updateSetting('analysis', 'animationSpeed', e.target.value)}
                  >
                    {animationSpeedOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow
                  label="Show Advanced Insights"
                  description="Display the Smart Insights section on the Analysis page"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.analysis.showAdvancedInsights ? 'active' : ''}`}
                    onClick={() => updateSetting('analysis', 'showAdvancedInsights', !settings.analysis.showAdvancedInsights)}
                  >
                    {settings.analysis.showAdvancedInsights ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.analysis.showAdvancedInsights ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>
              </div>
            </div>
          )}

          {/* ============ APPEARANCE SETTINGS ============ */}
          {activeCategory === 'appearance' && (
            <div className="settings-section">
              <h2>Appearance</h2>
              <p className="section-desc">Customize the look and feel</p>

              <div className="settings-group">
                <SettingRow
                  label="Theme"
                  description="Applies instantly and survives a page reload"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <div className="theme-buttons">
                    {themeOptions.map(opt => (
                      <button
                        key={opt.value}
                        className={`theme-btn ${settings.appearance.theme === opt.value ? 'active' : ''}`}
                        onClick={() => handleThemeChange(opt.value)}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </SettingRow>

                <SettingRow
                  label="Accent Color"
                  description="Applies instantly and survives a page reload, on every page"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <div className="color-picker">
                    {accentColors.map(color => (
                      <button
                        key={color.value}
                        className={`color-option ${settings.appearance.accentColor === color.value ? 'active' : ''}`}
                        style={{ backgroundColor: color.color }}
                        onClick={() => handleAccentChange(color.value)}
                        title={color.label}
                      />
                    ))}
                  </div>
                </SettingRow>

                <SettingRow
                  label="Font Size"
                  description="Adjust text size throughout the app"
                  status="pending"
                  statusNote="Not applied — scaling font size app-wide safely needs a review of every page's CSS to avoid breaking layouts, which hasn't been done yet"
                  searchQuery={searchQuery}
                >
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
                </SettingRow>

                <SettingRow
                  label="Enable Glassmorphism"
                  description="Use glass/blur effects on cards"
                  status="pending"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.appearance.enableGlassmorphism ? 'active' : ''}`}
                    onClick={() => updateSetting('appearance', 'enableGlassmorphism', !settings.appearance.enableGlassmorphism)}
                  >
                    {settings.appearance.enableGlassmorphism ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.appearance.enableGlassmorphism ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Reduce Motion"
                  description="Disable animations for accessibility — applies instantly, app-wide"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.appearance.reduceMotion ? 'active' : ''}`}
                    onClick={() => handleReduceMotionChange(!settings.appearance.reduceMotion)}
                  >
                    {settings.appearance.reduceMotion ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.appearance.reduceMotion ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>
              </div>
            </div>
          )}

          {/* ============ NOTIFICATION SETTINGS ============ */}
          {activeCategory === 'notifications' && (
            <div className="settings-section">
              <h2>Notifications</h2>
              <p className="section-desc">Control when you receive alerts</p>
              <div className="section-banner pending">
                <Info size={14} />
                <span>"Cleaning Complete Alerts" and "Show Errors" are genuinely wired. The other two below aren't connected to anything yet.</span>
              </div>

              <div className="settings-group">
                <SettingRow
                  label="Cleaning Complete Alerts"
                  description="Show a notification when Smart Clean or Quick Clean finishes"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.notifications.cleaningComplete ? 'active' : ''}`}
                    onClick={() => updateSetting('notifications', 'cleaningComplete', !settings.notifications.cleaningComplete)}
                  >
                    {settings.notifications.cleaningComplete ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.notifications.cleaningComplete ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Show Errors"
                  description="Display error messages when something goes wrong"
                  status="live"
                  statusNote="Errors are still logged to the console either way"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.notifications.showErrors ? 'active' : ''}`}
                    onClick={() => updateSetting('notifications', 'showErrors', !settings.notifications.showErrors)}
                  >
                    {settings.notifications.showErrors ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.notifications.showErrors ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Smart Suggestions"
                  description="Show AI-powered cleaning suggestions"
                  status="pending"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.notifications.smartSuggestions ? 'active' : ''}`}
                    onClick={() => updateSetting('notifications', 'smartSuggestions', !settings.notifications.smartSuggestions)}
                  >
                    {settings.notifications.smartSuggestions ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.notifications.smartSuggestions ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Sound Effects"
                  description="Play sounds on important events"
                  status="pending"
                  statusNote="No sound playback exists anywhere in this app yet — this toggle has nothing to control"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.notifications.soundEnabled ? 'active' : ''}`}
                    onClick={() => updateSetting('notifications', 'soundEnabled', !settings.notifications.soundEnabled)}
                  >
                    {settings.notifications.soundEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.notifications.soundEnabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>
              </div>
            </div>
          )}

          {/* ============ PRIVACY SETTINGS ============ */}
          {activeCategory === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy & Security</h2>
              <p className="section-desc">Manage your data and privacy</p>

              <div className="settings-group">
                <SettingRow
                  label="Auto-Delete Data After Session"
                  description="Automatically delete uploaded files when you close the app"
                  status="pending"
                  statusNote="Would require a real backend feature (no such hook exists yet) — not implemented"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.privacy.autoDeleteData ? 'active' : ''}`}
                    onClick={() => updateSetting('privacy', 'autoDeleteData', !settings.privacy.autoDeleteData)}
                  >
                    {settings.privacy.autoDeleteData ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.privacy.autoDeleteData ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Data Storage Location"
                  description="Where your uploaded files and cleaning history are stored"
                  status="live"
                  statusNote="Accurately reflects reality: this app always stores data server-side"
                  searchQuery={searchQuery}
                >
                  <select value="server" disabled>
                    <option value="server">Server (Cloud) — the only mode this app supports</option>
                  </select>
                </SettingRow>

                <SettingRow
                  label="Clear Cache"
                  description="Clear temporary files and cached data"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <button className="danger-btn" onClick={handleClearCache}>
                    <Trash2 size={14} />
                    Clear Cache
                  </button>
                </SettingRow>

                <SettingRow
                  label="Export All Data"
                  description="Download your current settings as a JSON file"
                  status="live"
                  searchQuery={searchQuery}
                >
                  <button className="secondary-btn" onClick={handleExport}>
                    <FileJson size={14} />
                    Export Data
                  </button>
                </SettingRow>

                <SettingRow
                  label="Share Anonymous Analytics"
                  description="Help improve the app by sharing anonymous usage data"
                  status="pending"
                  statusNote="No analytics/telemetry system exists anywhere in this app — this toggle has nothing to control either way"
                  searchQuery={searchQuery}
                >
                  <button 
                    className={`toggle-btn ${settings.privacy.shareAnalytics ? 'active' : ''}`}
                    onClick={() => updateSetting('privacy', 'shareAnalytics', !settings.privacy.shareAnalytics)}
                  >
                    {settings.privacy.shareAnalytics ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    <span>{settings.privacy.shareAnalytics ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </SettingRow>
              </div>
            </div>
          )}

          {/* Save Footer */}
          <div className="settings-footer">
            <button className="reset-category-btn" onClick={handleResetCategory}>
              <RotateCcw size={14} />
              Reset This Section
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