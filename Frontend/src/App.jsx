// frontend/src/App.jsx
import React from 'react'
import { Toaster } from 'react-hot-toast'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import CleanerPage from './pages/CleanerPage'
import AnalysisPage from './pages/AnalysisPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import './styles/globals.css'
import './App.css'

const AppContent = () => {
  const { currentPage, setCurrentPage } = useApp()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    // Auth pages
    switch (currentPage) {
      case 'register':
        return <Register />
      case 'forgot-password':
        return <ForgotPassword />
      default:
        return <Login />
    }
  }

  // Authenticated pages
  const renderPage = () => {
    switch (currentPage) {
      case 'upload': return <UploadPage />
      case 'dashboard': return <DashboardPage />
      case 'cleaner': return <CleanerPage />
      case 'analysis': return <AnalysisPage />
      case 'history': return <HistoryPage />
      case 'settings': return <SettingsPage />
      default: return <UploadPage />
    }
  }

  return <Layout>{renderPage()}</Layout>
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}

export default App