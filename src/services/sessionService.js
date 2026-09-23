import { apiClient, ApiError } from './apiClient.js'
import { mockDb } from './mockDb.js'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

function generateCode() {
  return `ORG-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function stripPrivateSessionData(session) {
  const publicSession = { ...session }
  delete publicSession.accreditedVoters
  return publicSession
}

/**
 * Compute the correct session status based on current time
 * Returns: 'draft' | 'scheduled' | 'live' | 'ended'
 */
function computeSessionStatus(session) {
  const now = Date.now()
  const start = new Date(session.startTime).getTime()
  const end = new Date(session.endTime).getTime()

  if (session.status === 'ended') return 'ended' // Terminal state
  if (session.status === 'draft') return 'draft' // Manual promotion only
  if (now >= end) return 'ended'
  if (now >= start) return 'live'
  return 'scheduled'
}

/**
 * Check all sessions and transition statuses based on time
 * Call on app startup and periodically (e.g., every minute)
 */
async function mockSyncSessionStatuses() {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  let changed = false

  for (const session of db.sessions) {
    const newStatus = computeSessionStatus(session)
    if (session.status !== newStatus) {
      session.status = newStatus
      changed = true
    }
  }

  if (changed) {
    mockDb.saveDb(db)
  }
  return changed
}

async function mockGetSessions() {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  return db.sessions.map(stripPrivateSessionData)
}

async function mockGetSessionById(id) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  const session = db.sessions.find(s => s.id === id)
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Session not found')
  return session // Admin gets full session including accreditedVoters
}

async function mockGetSessionByCode(code) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  const session = db.sessions.find(s => s.code === code)
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Session not found')
  return stripPrivateSessionData(session)
}

async function mockCreateSession(data, orgId) {
  await mockDb.DELAY(500)
  const db = mockDb.getDb()
  const session = {
    id: `sess-${Date.now()}`,
    orgId: orgId || 'org-1',
    ...data,
    code: generateCode(),
    status: 'draft',
    totalAccredited: 0,
    totalVoted: 0,
    accreditedVoters: [],
    quorumThreshold: data.quorumThreshold || 50,
  }
  db.sessions.unshift(session)
  mockDb.saveDb(db)
  return { ok: true, session }
}

async function mockUpdateSession(id, data) {
  await mockDb.DELAY(300)
  const db = mockDb.getDb()
  const idx = db.sessions.findIndex(s => s.id === id)
  if (idx === -1) throw new ApiError(404, 'NOT_FOUND', 'Session not found')
  const updated = { ...db.sessions[idx], ...data }
  db.sessions[idx] = updated
  mockDb.saveDb(db)
  return { ok: true, session: updated }
}

async function mockDeleteSession(id) {
  await mockDb.DELAY(300)
  const db = mockDb.getDb()
  const idx = db.sessions.findIndex(s => s.id === id)
  if (idx === -1) throw new ApiError(404, 'NOT_FOUND', 'Session not found')
  db.sessions.splice(idx, 1)
  mockDb.saveDb(db)
  return { ok: true }
}

async function mockAccreditVoter(sessionId, email) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  const session = db.sessions.find(s => s.id === sessionId)
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Session not found')
  if (session.status === 'live' || session.status === 'ended') {
    throw new ApiError(409, 'ACCREDITATION_CLOSED', 'Accreditation is closed — voting has already begun or concluded for this session.')
  }

  const normalized = email.toLowerCase().trim()
  const alreadyAccredited = (session.accreditedVoters || []).some(e => e.toLowerCase() === normalized)
  if (alreadyAccredited) {
    return { ok: true, alreadyExisted: true }
  }

  session.accreditedVoters = [...(session.accreditedVoters || []), normalized]
  session.totalAccredited = (session.totalAccredited || 0) + 1
  mockDb.saveDb(db)
  return { ok: true, alreadyExisted: false }
}

async function mockIsVoterAccredited(sessionId, email) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  const session = db.sessions.find(s => s.id === sessionId)
  if (!session) return false
  return (session.accreditedVoters || []).some(e => e.toLowerCase() === email.toLowerCase().trim())
}

async function mockSetSessionStatus(id, status) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  const session = db.sessions.find(s => s.id === id)
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Session not found')
  session.status = status
  mockDb.saveDb(db)
  return { ok: true, session }
}

export const sessionService = {
  async getSessions(token) {
    if (USE_MOCKS) return mockGetSessions()
    return apiClient.get('/sessions', { token })
  },

  async getSessionById(id, token) {
    if (USE_MOCKS) return mockGetSessionById(id)
    return apiClient.get(`/sessions/${id}`, { token })
  },

  async getSessionByCode(code) {
    if (USE_MOCKS) return mockGetSessionByCode(code)
    return apiClient.get(`/sessions/code/${code}`)
  },

  async createSession(data, token) {
    if (USE_MOCKS) return mockCreateSession(data, token)
    return apiClient.post('/sessions', { body: data, token })
  },

  async updateSession(id, data, token) {
    if (USE_MOCKS) return mockUpdateSession(id, data)
    return apiClient.put(`/sessions/${id}`, { body: data, token })
  },

  async deleteSession(id, token) {
    if (USE_MOCKS) return mockDeleteSession(id)
    return apiClient.delete(`/sessions/${id}`, { token })
  },

  async accreditVoter(sessionId, email) {
    if (USE_MOCKS) return mockAccreditVoter(sessionId, email)
    return apiClient.post(`/sessions/${sessionId}/accredit`, { body: { email } })
  },

  async isVoterAccredited(sessionId, email) {
    if (USE_MOCKS) return mockIsVoterAccredited(sessionId, email)
    return apiClient.get(`/sessions/${sessionId}/accreditation/${encodeURIComponent(email)}`)
  },

  async setSessionStatus(id, status, token) {
    if (USE_MOCKS) return mockSetSessionStatus(id, status)
    return apiClient.patch(`/sessions/${id}/status`, { body: { status }, token })
  },

  async syncSessionStatuses() {
    if (USE_MOCKS) return mockSyncSessionStatuses()
    // In live mode, this would be a server-side cron job
    return apiClient.post('/sessions/sync-statuses')
  },

  subscribeToAll(callback) {
    if (USE_MOCKS) {
      return mockDb.subscribeToDbChanges((db) => {
        callback((db.sessions || []).map(stripPrivateSessionData))
      })
    }
    return () => {}
  },

  subscribeToSession(code, callback) {
    if (USE_MOCKS) {
      return mockDb.subscribeToDbChanges((db) => {
        const session = (db.sessions || []).find(s => s.code === code)
        if (session) callback(stripPrivateSessionData(session))
      })
    }
    // In live mode, this would return an EventSource / WebSocket subscription
    const eventSource = new EventSource(`${import.meta.env.VITE_API_BASE_URL}/sessions/${code}/stream`)
    eventSource.onmessage = (e) => callback(JSON.parse(e.data))
    return () => eventSource.close()
  },
}