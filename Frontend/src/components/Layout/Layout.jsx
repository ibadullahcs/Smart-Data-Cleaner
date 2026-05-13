// frontend/src/components/Layout/Layout.jsx
// Main Layout Component - Wraps all pages with header and sidebar

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import LoadingSpinner from '../Common/LoadingSpinner';
import './Layout.css';

const Layout = ({ children }) => {
  const { isLoading } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="layout">
      <Navbar onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
      
      <div className="layout-wrapper">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        
        <main className={`layout-content ${sidebarCollapsed ? 'expanded' : ''}`}>
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
      
      {isLoading && <LoadingSpinner fullPage />}
    </div>
  );
};

export default Layout;