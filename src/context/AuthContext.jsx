import { createContext, useContext, useReducer } from 'react'

const AuthContext = createContext(null)

const initialState = {
  org: null,          // { id, name, email, description }
  token: null,
  isLoading: false,
  error: null,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'LOADING':  return { ...state, isLoading: true, error: null }
    case 'SUCCESS':  return { ...state, isLoading: false, org: action.org, token: action.token }
    case 'ERROR':    return { ...state, isLoading: false, error: action.error }
    case 'LOGOUT':   return { ...initialState }
    default:         return state
  }
}

// ─── Mock API ─────────────────────────────────────────────────
const mockOrgs = [
  { id: 'org-1', name: 'Westfield Student Union', email: 'admin@westfield.edu', description: 'Student governance body for Westfield University.' },
]

// Simulated in-memory OTP store  { email → otp }
const pendingOtps = {}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  /**
   * Step 1 — Request OTP for sign-in.
   * Backend would look up the org by email and email the OTP.
   * Returns { ok, exists } — exists:false means no account for that email.
   */
  async function requestOtp(email) {
    dispatch({ type: 'LOADING' })
    await new Promise(r => setTimeout(r, 900))

    const org = mockOrgs.find(o => o.email.toLowerCase() === email.toLowerCase())
    if (!org) {
      dispatch({ type: 'ERROR', error: null })   // clear loading, no toast needed — UI handles it
      return { ok: false, exists: false }
    }

    // "Send" mock OTP — always 123456 in demo
    pendingOtps[email.toLowerCase()] = '123456'
    dispatch({ type: 'ERROR', error: null })      // clear loading state cleanly
    return { ok: true, exists: true }
  }

  /**
   * Step 2 — Verify OTP for sign-in.
   */
  async function verifyOtp(email, otp) {
    dispatch({ type: 'LOADING' })
    await new Promise(r => setTimeout(r, 800))

    const stored = pendingOtps[email.toLowerCase()]
    const org    = mockOrgs.find(o => o.email.toLowerCase() === email.toLowerCase())

    if (stored && otp === stored && org) {
      delete pendingOtps[email.toLowerCase()]
      dispatch({ type: 'SUCCESS', org, token: 'mock-token-abc' })
      return { ok: true }
    }
    dispatch({ type: 'ERROR', error: 'Incorrect code. Please try again.' })
    return { ok: false }
  }

  /**
   * Sign-up Step 1 — Register org details, trigger OTP to email.
   * Returns { ok } — backend creates a pending org and sends OTP.
   */
  async function registerOrg(name, email, description) {
    dispatch({ type: 'LOADING' })
    await new Promise(r => setTimeout(r, 1000))
    // Store details temporarily; OTP "sent"
    pendingOtps[email.toLowerCase()] = '123456'
    // Save pending data for step 2 to use
    pendingOtps[`__data__${email.toLowerCase()}`] = { name, email, description }
    dispatch({ type: 'ERROR', error: null })
    return { ok: true }
  }

  /**
   * Sign-up Step 2 — Verify OTP, complete account creation.
   */
  async function verifyRegistration(email, otp) {
    dispatch({ type: 'LOADING' })
    await new Promise(r => setTimeout(r, 800))

    const stored = pendingOtps[email.toLowerCase()]
    const data   = pendingOtps[`__data__${email.toLowerCase()}`]

    if (stored && otp === stored && data) {
      delete pendingOtps[email.toLowerCase()]
      delete pendingOtps[`__data__${email.toLowerCase()}`]
      const org = { id: `org-${Date.now()}`, ...data }
      mockOrgs.push(org)
      dispatch({ type: 'SUCCESS', org, token: `mock-token-${Date.now()}` })
      return { ok: true }
    }
    dispatch({ type: 'ERROR', error: 'Incorrect code. Please try again.' })
    return { ok: false }
  }

  function logout() { dispatch({ type: 'LOGOUT' }) }

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
