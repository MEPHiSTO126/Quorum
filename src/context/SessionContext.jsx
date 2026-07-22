import { createContext, useContext, useReducer } from 'react'

const SessionContext = createContext(null)

// ─── Mock sessions ────────────────────────────────────────────
export const MOCK_SESSIONS = [
  {
    id: 'sess-1',
    orgId: 'org-1',
    name: '2025 Executive Elections',
    description: 'Annual election for the student union executive positions.',
    code: 'WSU-2025',
    status: 'live',
    startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    endTime:   new Date(Date.now() + 1000 * 60 * 90).toISOString(),
    positions: [
      {
        id: 'pos-1',
        name: 'President',
        description: 'Leads the student union and represents students at the board level.',
        candidates: [
          { id: 'cand-1', name: 'Amara Osei',    catchphrase: 'Unity in Progress',   image: null, votes: 142 },
          { id: 'cand-2', name: 'Felix Adeyemi', catchphrase: 'Students First, Always', image: null, votes: 98  },
          { id: 'cand-3', name: 'Priya Nair',    catchphrase: 'Bold Change Starts Now', image: null, votes: 76  },
        ],
      },
      {
        id: 'pos-2',
        name: 'General Secretary',
        description: 'Manages records, communications, and administrative affairs.',
        candidates: [
          { id: 'cand-4', name: 'Tunde Bakare',  catchphrase: 'Structure. Clarity. Action.', image: null, votes: 180 },
          { id: 'cand-5', name: 'Ngozi Eze',     catchphrase: 'For Every Voice', image: null, votes: 136 },
        ],
      },
    ],
    totalAccredited: 410,
    totalVoted: 316,
  },
  {
    id: 'sess-2',
    orgId: 'org-1',
    name: 'Q3 Faculty Representative Vote',
    description: 'Faculty-level representative selection for Q3.',
    code: 'WSU-FAC3',
    status: 'scheduled',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    endTime:   new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
    positions: [],
    totalAccredited: 0,
    totalVoted: 0,
  },
  {
    id: 'sess-3',
    orgId: 'org-1',
    name: '2024 Year-End Awards Vote',
    description: 'Community vote for end-of-year recognition awards.',
    code: 'WSU-2024',
    status: 'ended',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
    endTime:   new Date(Date.now() - 1000 * 60 * 60 * 150).toISOString(),
    positions: [],
    totalAccredited: 280,
    totalVoted: 241,
  },
]

function sessionReducer(state, action) {
  switch (action.type) {
    case 'SET_SESSIONS':  return { ...state, sessions: action.sessions }
    case 'ADD_SESSION':   return { ...state, sessions: [action.session, ...state.sessions] }
    case 'UPDATE_SESSION':return { ...state, sessions: state.sessions.map(s => s.id === action.session.id ? action.session : s) }
    case 'SET_LOADING':   return { ...state, isLoading: action.value }
    default: return state
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, {
    sessions: MOCK_SESSIONS,
    isLoading: false,
  })

  async function createSession(data) {
    dispatch({ type: 'SET_LOADING', value: true })
    await new Promise(r => setTimeout(r, 1200))
    const code = `ORG-${Math.random().toString(36).slice(2,6).toUpperCase()}`
    const session = {
      id: `sess-${Date.now()}`,
      ...data,
      code,
      status: 'draft',
      totalAccredited: 0,
      totalVoted: 0,
    }
    dispatch({ type: 'ADD_SESSION', session })
    dispatch({ type: 'SET_LOADING', value: false })
    return { ok: true, session }
  }

  async function updateSession(id, data) {
    dispatch({ type: 'SET_LOADING', value: true })
    await new Promise(r => setTimeout(r, 800))
    const existing = state.sessions.find(s => s.id === id)
    const updated = { ...existing, ...data }
    dispatch({ type: 'UPDATE_SESSION', session: updated })
    dispatch({ type: 'SET_LOADING', value: false })
    return { ok: true, session: updated }
  }

  function getSession(id) {
    return state.sessions.find(s => s.id === id) || null
  }

  function getSessionByCode(code) {
    return state.sessions.find(s => s.code === code) || null
  }

  return (
    <SessionContext.Provider value={{ ...state, createSession, updateSession, getSession, getSessionByCode }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
