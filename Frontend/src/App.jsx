// frontend/src/App.jsx
import React from 'react'
import { Toaster } from 'react-hot-toast'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
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
  const { user, loading, isPasswordRecovery } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // FIX (the actual root cause of "login broken/incomplete"):
  // clicking a password-reset email link makes Supabase automatically
  // sign the person into a temporary recovery session — so `user`
  // becomes truthy. Previously, `if (!user)` was the ONLY gate on
  // showing auth pages, so anyone arriving via a reset link was
  // dropped straight into the normal authenticated app instead of
  // ever seeing a "set new password" screen — their password was
  // never actually changed, and the whole reset flow silently did
  // nothing useful. This check now comes FIRST, before the `!user`
  // check, specifically because it must override the "user is
  // logged in" case, not just supplement the "user is logged out"
  // case.
  if (isPasswordRecovery) {
    return <ResetPassword />
  }

  if (!user) {
    // Auth pages
    switch (currentPage) {
      case 'register':
        return <Register />
      case 'forgot-password':
        return <ForgotPassword />
      // NEW: reached only if isPasswordRecovery is somehow false but
      // currentPage was still set to 'reset-password' (e.g. a stale
      // link, or the recovery session already expired) — shows the
      // same screen rather than silently falling through to Login,
      // which would be a confusing dead end for someone who just
      // clicked a reset link.
      case 'reset-password':
        return <ResetPassword />
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