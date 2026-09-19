// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  // NEW: tracks whether Supabase just fired a PASSWORD_RECOVERY event
  // (the user arrived via a password-reset email link). App.jsx needs
  // this to know to show the "set new password" screen instead of the
  // normal logged-in app, since Supabase signs the user into a
  // temporary recovery session automatically.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setSession(session)
        setUser(session?.user ?? null)
      } catch (err) {
        console.error('Error getting session:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email)
      if (_event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, fullName) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          },
          emailRedirectTo: window.location.origin
        }
      })
      if (error) throw error
      console.log('Sign up success:', data)
      return data
    } catch (err) {
      console.error('Sign up error:', err)
      setError(err.message)
      throw err
    }
  }

  const signIn = async (email, password) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      console.log('Sign in success:', data.user?.email)
      return data
    } catch (err) {
      console.error('Sign in error:', err)
      setError(err.message)
      throw err
    }
  }

  const signInWithGoogle = async () => {
    setError(null)
    try {
      // FIX: previously redirected to `${origin}/dashboard`, a route
      // that doesn't exist anywhere in this app — pages here are
      // switched by AppContext's `currentPage` state, not by URL path,
      // so nothing was set up to serve or interpret that path. Now
      // redirects to the plain origin, which the app already boots
      // correctly at; the auth listener above picks up the resulting
      // session regardless of which "page" state happens to be active
      // when it fires.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
      console.log('Google sign in initiated:', data)
      return data
    } catch (err) {
      console.error('Google sign in error:', err)
      setError(err.message)
      throw err
    }
  }

  const signOut = async () => {
    setError(null)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      console.log('Sign out success')
    } catch (err) {
      console.error('Sign out error:', err)
      setError(err.message)
      throw err
    }
  }

  const resetPassword = async (email) => {
    setError(null)
    try {
      // FIX: same root issue as Google OAuth above — `/reset-password`
      // was never a route this app could serve or recognize. Now
      // redirects to the origin; App.jsx (once wired) detects the
      // PASSWORD_RECOVERY auth event via `isPasswordRecovery` above and
      // shows the new ResetPassword page/state instead of a path-based
      // route.
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      })
      if (error) throw error
      return data
    } catch (err) {
      console.error('Reset password error:', err)
      setError(err.message)
      throw err
    }
  }

  // NEW: completes the password-reset flow — called from the new
  // ResetPassword page once the user submits their new password while
  // in a PASSWORD_RECOVERY session.
  const updatePassword = async (newPassword) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setIsPasswordRecovery(false)
      return data
    } catch (err) {
      console.error('Update password error:', err)
      setError(err.message)
      throw err
    }
  }

  // NEW: lets a page/App.jsx clear the recovery flag once the flow is
  // done (e.g. after successfully updating the password, or if the
  // user navigates away).
  const clearPasswordRecovery = () => setIsPasswordRecovery(false)

  const value = {
    user,
    session,
    loading,
    error,
    isPasswordRecovery,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    clearPasswordRecovery
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}