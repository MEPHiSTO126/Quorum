/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { authService } from '../services/authService.js'

const AuthContext = createContext(null)

const initialState = {
  org: null,
  token: null,
  isLoading: false,
  isInitializing: true,
  error: null,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'LOADING':     return { ...state, isLoading: true, error: null }
    case 'SUCCESS':     return { ...state, isLoading: false, isInitializing: false, org: action.org, token: action.token }
    case 'ERROR':       return { ...state, isLoading: false, isInitializing: false, error: action.error }
    case 'LOGOUT':      return { ...initialState, isInitializing: false }
    case 'INIT_DONE':   return { ...state, isInitializing: false }
    default:            return state
  }
}

const STORAGE_KEY = 'quorum_admin_auth'

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Hydrate from localStorage on startup
  useEffect(() => {
    let mounted = true
    async function hydrate() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const { org, token } = JSON.parse(stored)
          if (org && token) {
            // Validate token with backend, but keep the stored org profile
            await authService.getMe(token)
            if (mounted) dispatch({ type: 'SUCCESS', org, token })
            return
          }
        }
        // If we get here, clear invalid storage
        if (mounted) localStorage.removeItem(STORAGE_KEY)
      } catch {
        if (mounted) localStorage.removeItem(STORAGE_KEY)
      } finally {
        if (mounted) dispatch({ type: 'INIT_DONE' })
      }
    }
    hydrate()
    return () => { mounted = false }
  }, [])

  const requestOtp = useCallback(async (email) => {
    dispatch({ type: 'LOADING' })
    try {
      return await authService.requestOtp(email)
    } catch (err) {
      dispatch({ type: 'ERROR', error: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const verifyOtp = useCallback(async (email, otp) => {
    dispatch({ type: 'LOADING' })
    try {
      const result = await authService.verifyOtp(email, otp)
      if (result.ok) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ org: result.org, token: result.token }))
        dispatch({ type: 'SUCCESS', org: result.org, token: result.token })
      } else {
        dispatch({ type: 'ERROR', error: 'Incorrect code. Please try again.' })
      }
      return result
    } catch (err) {
      dispatch({ type: 'ERROR', error: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const registerOrg = useCallback(async (name, email, description) => {
    dispatch({ type: 'LOADING' })
    try {
      return await authService.registerOrg(name, email, description)
    } catch (err) {
      dispatch({ type: 'ERROR', error: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const verifyRegistration = useCallback(async (email, otp) => {
    dispatch({ type: 'LOADING' })
    try {
      const result = await authService.verifyRegistration(email, otp)
      if (result.ok) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ org: result.org, token: result.token }))
        dispatch({ type: 'SUCCESS', org: result.org, token: result.token })
      } else {
        dispatch({ type: 'ERROR', error: 'Incorrect code. Please try again.' })
      }
      return result
    } catch (err) {
      dispatch({ type: 'ERROR', error: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    dispatch({ type: 'LOGOUT' })
  }, [])

  return (
    <AuthContext.Provider value={{
      ...state,
      requestOtp,
      verifyOtp,
      registerOrg,
      verifyRegistration,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}