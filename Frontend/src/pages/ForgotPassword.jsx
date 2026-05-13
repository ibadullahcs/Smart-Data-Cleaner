// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle, Loader, Sparkles } from 'lucide-react'
import './Auth.css'
const ForgotPassword = () => {
  const { resetPassword } = useAuth()
  const { setCurrentPage, showSuccess, showError } = useApp()
  
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await resetPassword(email)
      setSuccess(true)
      showSuccess('Password reset email sent!')
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
      showError(err.message)
    } finally {
      setLoading(false)
    }
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
        <button className="back-link" onClick={() => setCurrentPage('login')}>
          <ArrowLeft size={16} /> Back to Login
        </button>

        <div className="auth-header">
          <div className="icon-wrapper"><Sparkles size={32} /></div>
          <h2>Reset Password</h2>
          <p className="welcome-text">Enter your email and we'll send you instructions to reset your password</p>
        </div>

        {error && (<div className="message error"><AlertCircle size={18} /><span>{error}</span></div>)}

        {success ? (
          <div className="success-state">
            <div className="success-icon"><CheckCircle size={48} /></div>
            <h3>Check Your Email</h3>
            <p>We've sent password reset instructions to <strong>{email}</strong></p>
            <div className="email-tips">
              <p>📧 Check your spam folder if you don't see it</p>
              <p>⏱️ The link expires in 1 hour</p>
            </div>
            <button className="return-link" onClick={() => setCurrentPage('login')}>Return to Login</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group floating-label">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} placeholder=" " />
              <label className={email ? 'filled' : ''}><Mail size={16} /> Email Address</label>
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <Loader size={18} className="spin" /> : <Send size={18} />}
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </form>
        )}

        {!success && (
          <div className="auth-footer">
            <p>Remember your password? <button onClick={() => setCurrentPage('login')}>Sign in</button></p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword