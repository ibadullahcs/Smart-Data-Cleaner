// frontend/src/components/Layout/Sidebar.jsx
// Professional Sidebar - PRIMARY NAVIGATION ONLY
// No duplicate pages - this is the ONLY place for page navigation

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Upload, LayoutDashboard, Brush, BarChart3, History, Settings,
  Sparkles, LogOut, ChevronLeft, ChevronRight,
  Database, FolderOpen, Activity, Clock, Shield, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ collapsed, onToggle }) => {
  const { currentPage, setCurrentPage, jobId, totalRows, totalColumns, qualityScore } = useApp();
  const { signOut } = useAuth();
  const [hoveredItem, setHoveredItem] = useState(null);

  // PRIMARY NAVIGATION - All pages here only
  const navItems = [
    { id: 'upload', label: 'Upload', icon: Upload, description: 'Upload your data' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Data overview', requiresData: true },
    { id: 'cleaner', label: 'Cleaner', icon: Brush, description: 'Clean your data', requiresData: true },
    { id: 'analysis', label: 'Analysis', icon: BarChart3, description: 'Statistical insights', requiresData: true },
    { id: 'history', label: 'History', icon: History, description: 'Past jobs' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Preferences' },
  ];

  const handleNavClick = (pageId) => {
    const item = navItems.find(i => i.id === pageId);
    if (item?.requiresData && !jobId && pageId !== 'upload') return;
    setCurrentPage(pageId);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentPage('login');
  };

  const isDisabled = (item) => {
    return item.requiresData && !jobId && item.id !== 'upload';
  };

  const getScoreColor = () => {
    if (qualityScore >= 80) return '#10b981';
    if (qualityScore >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      {!collapsed && <div className="sidebar-overlay" onClick={onToggle} />}
      
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Sparkles size={28} />
          </div>
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-smart">Smart</span>
              <span className="logo-cleaner">Cleaner</span>
            </div>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const disabled = isDisabled(item);
            return (
              <div
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => !disabled && handleNavClick(item.id)}
              >
                <div className="nav-icon">
                  <item.icon size={20} />
                  {currentPage === item.id && <div className="nav-active-dot" />}
                </div>
                {!collapsed && (
                  <div className="nav-info">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-desc">{item.description}</span>
                  </div>
                )}
                {collapsed && hoveredItem === item.id && (
                  <div className="nav-tooltip">
                    <span className="tooltip-label">{item.label}</span>
                    <span className="tooltip-desc">{item.description}</span>
                  </div>
                )}
                {disabled && !collapsed && (
                  <div className="nav-badge">Upload First</div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Data Stats (Only when data is loaded) */}
        {jobId && !collapsed && (
          <div className="sidebar-stats">
            <div className="stats-header">
              <Database size={14} />
              <span>Current Dataset</span>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <FolderOpen size={12} />
                <div>
                  <div className="stat-value">{totalRows?.toLocaleString() || 0}</div>
                  <div className="stat-label">Rows</div>
                </div>
              </div>
              <div className="stat-item">
                <Activity size={12} />
                <div>
                  <div className="stat-value">{totalColumns || 0}</div>
                  <div className="stat-label">Columns</div>
                </div>
              </div>
            </div>
            <div className="quality-indicator">
              <div className="quality-bar">
                <div className="quality-fill" style={{ width: `${qualityScore || 0}%`, backgroundColor: getScoreColor() }} />
              </div>
              <span className="quality-score">{qualityScore || 0}% Quality</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="footer-item" onClick={handleLogout}>
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </div>
          {!collapsed && (
            <div className="footer-version">
              <Shield size={12} />
              <span>v2.0.0</span>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;