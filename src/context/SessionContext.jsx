/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { sessionService } from '../services/sessionService.js'
import { voterService } from '../services/voterService.js'
import { mockDb } from '../services/mockDb.js'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

function getInitialSessions() {
  if (!USE_MOCKS) return []
  try {
    const db = mockDb.getDb()
    return (db.sessions || []).map((s) => {
      const rest = { ...s }
      delete rest.accreditedVoters
      return rest
    })
  } catch {
    return []
  }
}

const SessionContext = createContext(null)

function sessionReducer(state, action) {
  switch (action.type) {
    case 'SET_SESSIONS':   return { ...state, sessions: action.sessions, isLoading: false }
    case 'ADD_SESSION':    return { ...state, sessions: [action.session, ...state.sessions], isLoading: false }
    case 'UPDATE_SESSION': return { ...state, sessions: state.sessions.map(s => s.id === action.session.id ? action.session : s), isLoading: false }
    case 'REMOVE_SESSION': return { ...state, sessions: state.sessions.filter(s => s.id !== action.id), isLoading: false }
    case 'SET_LOADING':    return { ...state, isLoading: action.value }
    case 'SET_ERROR':      return { ...state, error: action.error, isLoading: false }
    default: return state
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () => {
    const seeded = getInitialSessions()
    return {
      sessions: seeded,
      isLoading: !USE_MOCKS && seeded.length === 0,
      error: null,
    }
  })

  // Initial load — only in live mode (mock mode uses synchronous seed + subscription)
  useEffect(() => {
    if (USE_MOCKS) return
    let mounted = true
    async function load() {
      dispatch({ type: 'SET_LOADING', value: true })
      try {
        const sessions = await sessionService.getSessions()
        if (mounted) dispatch({ type: 'SET_SESSIONS', sessions })
      } catch (err) {
        if (mounted) dispatch({ type: 'SET_ERROR', error: err.message })
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // Sync session statuses on startup (both modes)
  useEffect(() => {
    let mounted = true
    async function sync() {
      try {
        await sessionService.syncSessionStatuses()
        // Refetch sessions after sync
        const sessions = await sessionService.getSessions()
        if (mounted) dispatch({ type: 'SET_SESSIONS', sessions })
      } catch (err) {
        if (mounted) dispatch({ type: 'SET_ERROR', error: err.message })
      }
    }
    sync()
    return () => { mounted = false }
  }, [])

  // Subscribe to mock DB changes for live updates across tabs (mock mode only)
  useEffect(() => {
    if (!USE_MOCKS) return
    const unsub = sessionService.subscribeToAll((sessions) => {
      dispatch({ type: 'SET_SESSIONS', sessions })
    })
    return unsub
  }, [])

  const createSession = useCallback(async (data) => {
    dispatch({ type: 'SET_LOADING', value: true })
    try {
      const result = await sessionService.createSession(data)
      if (result.ok) {
        dispatch({ type: 'ADD_SESSION', session: result.session })
      }
      return result
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const updateSession = useCallback(async (id, data) => {
    dispatch({ type: 'SET_LOADING', value: true })
    try {
      const result = await sessionService.updateSession(id, data)
      if (result.ok) {
        dispatch({ type: 'UPDATE_SESSION', session: result.session })
      }
      return result
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const deleteSession = useCallback(async (id) => {
    dispatch({ type: 'SET_LOADING', value: true })
    try {
      const result = await sessionService.deleteSession(id)
      if (result.ok) {
        dispatch({ type: 'REMOVE_SESSION', id })
      }
      return result
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const accreditVoter = useCallback(async (sessionId, email) => {
    dispatch({ type: 'SET_LOADING', value: true })
    try {
      const result = await sessionService.accreditVoter(sessionId, email)
      // Refresh session to get updated counts
      const updated = await sessionService.getSessionById(sessionId)
      dispatch({ type: 'UPDATE_SESSION', session: updated })
      return result
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const isVoterAccredited = useCallback(async (sessionId, email) => {
    try {
      return await sessionService.isVoterAccredited(sessionId, email)
    } catch {
      return false
    }
  }, [])

  const getSession = useCallback((id) => {
    return state.sessions.find(s => s.id === id) || null
  }, [state.sessions])

  const getSessionByCode = useCallback((code) => {
    return state.sessions.find(s => s.code === code) || null
  }, [state.sessions])

  const castBallot = useCallback(async (sessionCode, votes, voterToken) => {
    dispatch({ type: 'SET_LOADING', value: true })
    try {
      const result = await voterService.castBallot(sessionCode, votes, voterToken)
      if (result.ok && result.session) {
        dispatch({ type: 'UPDATE_SESSION', session: result.session })
      }
      return result
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  return (
    <SessionContext.Provider value={{
      ...state,
      createSession,
      updateSession,
      deleteSession,
      accreditVoter,
      isVoterAccredited,
      getSession,
      getSessionByCode,
      castBallot,
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}