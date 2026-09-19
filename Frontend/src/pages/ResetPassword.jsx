// frontend/src/pages/ResetPassword.jsx
// Completes the password-reset flow: shown when the user arrives via
// the reset email and Supabase has placed them in a PASSWORD_RECOVERY
// session. Lets them set and confirm a new password.

import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader, Sparkles } from 'lucide-react'
import './Auth.css'

const ResetPassword = () => {
  const { updatePassword, clearPasswordRecovery } = useAuth()
  const { setCurrentPage, showSuccess, showError } = useApp()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      setSuccess(true)
      showSuccess('Password updated successfully')
    } catch (err) {
      setError(err.message || 'Failed to update password')
      showError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReturnToApp = () => {
    clearPasswordRecovery()
    setCurrentPage('upload')
  }

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="bg-gradient"></div>
        <div className="bg-pattern"></div>
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>

      <div className="auth-card forgot-card">
        <div className="auth-header">
          <div className="icon-wrapper"><Sparkles size={32} /></div>
          <h2>Set New Password</h2>
          <p className="welcome-text">
            {success
              ? 'Your password has been updated.'
              : 'Choose a new password for your account'}
          </p>
        </div>

        {error && (
          <div className="message error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="close-btn" onClick={() => setError('')}>×</button>
          </div>
        )}

        {success ? (
          <div className="success-state">
            <div className="success-icon"><CheckCircle size={48} /></div>
            <h3>Password Updated</h3>
            <p>You can now continue using Smart Cleaner with your new password.</p>
            <button className="return-link" onClick={handleReturnToApp}>
              Continue to App
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="New password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Confirm new password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <Loader size={18} className="spin" /> : <Lock size={18} />}
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword