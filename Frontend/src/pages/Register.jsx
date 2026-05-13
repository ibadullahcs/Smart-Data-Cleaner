// frontend/src/pages/Register.jsx
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader, Sparkles, Shield, Zap, ArrowRight } from 'lucide-react'
import './Auth.css'
const Register = () => {
  const { signUp } = useAuth()
  const { setCurrentPage, showSuccess, showError } = useApp()
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }
    
    if (!acceptTerms) {
      setError('You must accept the Terms of Service')
      setLoading(false)
      return
    }
    
    try {
      await signUp(email, password, fullName)
      showSuccess('Account created! Please check your email to verify.')
      setCurrentPage('login')
    } catch (err) {
      setError(err.message || 'Registration failed')
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

      <div className="auth-card register-card animate-slide-up">
        <div className="brand-banner">
          <div className="brand-icon"><Sparkles size={32} /></div>
          <div className="brand-text"><h3>Smart Cleaner</h3><p>Intelligent Data Cleaning</p></div>
        </div>

        <div className="auth-header">
          <h2>Create Account 🚀</h2>
          <p className="welcome-text">Join thousands of data professionals</p>
        </div>

        {error && (
          <div className="message error">
            <AlertCircle size={18} /><span>{error}</span>
            <button className="close-btn" onClick={() => setError('')}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={loading} placeholder="Full name" />
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} placeholder="Email address" />
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} placeholder="Password" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} placeholder="Confirm password" />
              <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="terms-section">
            <label className="checkbox-label">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">I accept the <button type="button">Terms of Service</button> and <button type="button">Privacy Policy</button></span>
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <Loader size={18} className="spin" /> : <Sparkles size={18} />}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <button className="login-link" onClick={() => setCurrentPage('login')}>Sign in <ArrowRight size={14} /></button></p>
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

export default Register