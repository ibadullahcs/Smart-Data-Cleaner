// frontend/src/pages/Login.jsx
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, Loader, Sparkles, Shield, Zap, ArrowRight } from 'lucide-react'
import './Auth.css' 
const Login = () => {
  const { signIn, signInWithGoogle } = useAuth()
  const { setCurrentPage, showSuccess, showError } = useApp()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await signIn(email, password)
      showSuccess('Login successful!')
      setCurrentPage('upload')
    } catch (err) {
      setError(err.message || 'Login failed')
      showError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      // Redirect handled by Supabase OAuth
    } catch (err) {
      setError(err.message)
      showError(err.message)
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

      <div className="auth-card animate-slide-up">
        <div className="brand-banner">
          <div className="brand-icon">
            <Sparkles size={32} />
          </div>
          <div className="brand-text">
            <h3>Smart Cleaner</h3>
            <p>Intelligent Data Cleaning</p>
          </div>
        </div>

        <div className="auth-header">
          <h2>Welcome Back! 👋</h2>
          <p className="welcome-text">Sign in to continue your data cleaning journey</p>
        </div>

        {error && (
          <div className="message error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="close-btn" onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className="social-section">
          <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
            <img src="https://www.google.com/favicon.ico" alt="Google" className="google-icon-img" />
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="divider"><span>or sign in with email</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Password"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">Remember me</span>
            </label>
            <button type="button" className="forgot-link" onClick={() => setCurrentPage('forgot-password')}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <Loader size={18} className="spin" /> : <LogIn size={18} />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?
            <button className="signup-link" onClick={() => setCurrentPage('register')}>
              Create free account <ArrowRight size={14} />
            </button>
          </p>
        </div>

        <div className="feature-badges">
          <div className="feature-badge"><Shield size={14} /><span>Secure</span></div>
          <div className="feature-badge"><Zap size={14} /><span>Fast</span></div>
          <div className="feature-badge"><Sparkles size={14} /><span>Free</span></div>
        </div>
      </div>
    </div>
  )
}

export default Login