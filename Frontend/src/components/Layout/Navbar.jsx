// frontend/src/components/Layout/Navbar.jsx
// Professional Navbar - ACTIONS ONLY (No Page Navigation)

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sun, Moon, Bell, HelpCircle, User, ChevronDown,
  Download, RefreshCw, Settings, Menu, X,
  Sparkles, Database, Clock, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Tooltip from '../Common/Tooltip';
import './Navbar.css';

const Navbar = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { 
    darkMode, toggleDarkMode, jobId, filename, 
    totalRows, totalColumns, qualityScore, 
    showSuccess, showError, showInfo, setCurrentPage,
    // FIX (stale quality score / fake refresh / logout leak):
    // need the profile setters to genuinely refresh data, and
    // clearData to wipe dataset state on logout.
    setTotalRows, setTotalColumns, setQualityScore, setColumnProfile, setPreviewData,
    clearData
  } = useApp();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getPageTitle = () => {
    const titles = {
      upload: 'Upload Data',
      dashboard: 'Dashboard',
      cleaner: 'Data Cleaner',
      analysis: 'Data Analysis',
      history: 'Cleaning History',
      settings: 'Settings'
    };
    return titles[window.location.pathname.replace('/', '')] || 'Smart Cleaner';
  };

  const handleExport = async () => {
    if (!jobId) {
      showError('No data to export. Please upload a file first.');
      return;
    }
    try {
      await api.downloadFile(jobId, 'csv');
      showSuccess('File exported successfully');
    } catch (err) {
      showError(err.message || 'Export failed');
    }
  };

  // FIX: previously called window.location.reload(), which wipes the
  // entire in-memory session (uploaded file, cleaning progress,
  // everything) — a real risk of derailing a live demo. Now it
  // actually re-fetches the current job's profile data and updates
  // AppContext, without losing anything.
  const handleRefresh = async () => {
    if (!jobId) {
      showInfo('No active dataset to refresh.');
      return;
    }
    try {
      const refreshed = await api.profileData(jobId);
      setTotalRows(refreshed.total_rows);
      setTotalColumns(refreshed.total_columns);
      setQualityScore(refreshed.quality_score);
      setColumnProfile(refreshed.columns);
      setPreviewData(refreshed.preview_data);
      showSuccess('Data refreshed');
    } catch (err) {
      showError(err.message || 'Failed to refresh data');
    }
  };

  const handleLogout = async () => {
    await signOut();
    // FIX: previously left all dataset state (jobId, filename,
    // columnProfile, etc.) in AppContext after logout. If a different
    // user logged in afterward in the same browser session, they
    // could briefly or persistently see the previous user's dataset
    // metadata. clearData() already existed in AppContext but was
    // never called from the logout path.
    clearData();
    setCurrentPage('login');
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left Section - Toggle + Page Title */}
        <div className="navbar-left">
          <button 
            className="navbar-toggle" 
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
          
          <div className="page-title">
            <h1>{getPageTitle()}</h1>
            {jobId && filename && (
              <div className="page-metadata">
                <span className="metadata-badge">
                  <Database size={12} />
                  {filename.length > 30 ? filename.substring(0, 30) + '...' : filename}
                </span>
                <span className="metadata-badge">
                  <Clock size={12} />
                  {totalRows?.toLocaleString()} rows
                </span>
                <span className="metadata-badge">
                  <TrendingUp size={12} />
                  {qualityScore || 0}% quality
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Actions ONLY */}
        <div className="navbar-right">
          {/* Export Button */}
          {jobId && (
            <Tooltip content="Export cleaned data" position="bottom">
              <button className="nav-action-btn" onClick={handleExport}>
                <Download size={18} />
                <span>Export</span>
              </button>
            </Tooltip>
          )}

          {/* Refresh Button */}
          <Tooltip content="Refresh data" position="bottom">
            <button className="nav-icon-btn" onClick={handleRefresh}>
              <RefreshCw size={18} />
            </button>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip content={darkMode ? 'Light mode' : 'Dark mode'} position="bottom">
            <button className="nav-icon-btn" onClick={toggleDarkMode}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </Tooltip>

          {/* Settings */}
          <Tooltip content="Settings" position="bottom">
            <button className="nav-icon-btn" onClick={() => setCurrentPage('settings')}>
              <Settings size={18} />
            </button>
          </Tooltip>

          {/* User Menu */}
          <div className="user-menu">
            <button className="user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="user-avatar">
                {getUserInitials()}
              </div>
              <ChevronDown size={14} className={`user-chevron ${showUserMenu ? 'rotated' : ''}`} />
            </button>
            
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">{getUserInitials()}</div>
                  <div className="dropdown-info">
                    <span className="dropdown-name">{user?.email?.split('@')[0] || 'User'}</span>
                    <span className="dropdown-email">{user?.email}</span>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => setCurrentPage('settings')}>
                  <Settings size={14} />
                  Settings
                </button>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;