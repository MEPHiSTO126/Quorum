import { apiClient, ApiError } from './apiClient.js'
import { mockDb } from './mockDb.js'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

async function sha256Hash(input) {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateReceiptId() {
  return `QR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function generateBlockNumber() {
  return Math.floor(100000 + Math.random() * 900000)
}

async function mockAccreditVoter(sessionCode, email) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  const session = db.sessions.find(s => s.code === sessionCode)
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

async function mockCheckAccreditation(sessionCode, email) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  const session = db.sessions.find(s => s.code === sessionCode)
  if (!session) return { accredited: false }
  const accredited = (session.accreditedVoters || []).some(e => e.toLowerCase() === email.toLowerCase().trim())
  return { accredited }
}

async function mockLoginVoter(sessionCode, email, token) {
  await mockDb.DELAY()
  const db = mockDb.getDb()

  // Check if token already used
  const usedTokens = Array.isArray(db.usedVoterTokens) ? db.usedVoterTokens : []
  if (usedTokens.includes(token)) {
    throw new ApiError(409, 'TOKEN_CONSUMED', 'This token has already been used to cast a ballot.')
  }

  const session = db.sessions.find(s => s.code === sessionCode)
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Session not found')
  if (session.status !== 'live') {
    throw new ApiError(409, 'SESSION_NOT_LIVE', 'Voting is not currently open for this session.')
  }

  const accredited = (session.accreditedVoters || []).some(e => e.toLowerCase() === email.toLowerCase().trim())
  if (!accredited) {
    throw new ApiError(403, 'NOT_ACCREDITED', 'You are not accredited for this session.')
  }

  // Validate demo token
  if (token !== 'vote123') {
    throw new ApiError(401, 'INVALID_TOKEN', 'Authentication token not recognised.')
  }

  const voterToken = generateToken('voter')
  return { ok: true, voterToken, session: stripPrivateSessionData(session) }
}

async function mockCastBallot(sessionCode, votes, voterToken) {
  await mockDb.DELAY(500)
  const db = mockDb.getDb()

  const consumed = Array.isArray(db.usedVoterTokens) ? db.usedVoterTokens : []
  if (voterToken && consumed.includes(voterToken)) {
    throw new ApiError(409, 'TOKEN_CONSUMED', 'This voting token has already been used.')
  }

  const session = db.sessions.find(s => s.code === sessionCode)
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Session not found')
  if (session.status !== 'live') {
    throw new ApiError(409, 'SESSION_NOT_LIVE', 'Voting is not currently open for this session.')
  }

  // Increment votes for each selected candidate
  const votedCandidateIds = []

  session.positions.forEach(position => {
    const candidateId = votes[position.id]
    if (candidateId && candidateId !== 'skip') {
      const candidate = position.candidates.find(c => c.id === candidateId)
      if (candidate) {
        candidate.votes = (candidate.votes || 0) + 1
        votedCandidateIds.push(candidateId)
      }
    }
  })

  session.totalVoted = (session.totalVoted || 0) + 1
  if (!Array.isArray(db.usedVoterTokens)) db.usedVoterTokens = []
  if (voterToken) db.usedVoterTokens.push(voterToken)

  // Store receipt for verification
  if (!Array.isArray(db.receipts)) db.receipts = []
  db.receipts.push({
    receiptId: receipt.receiptId,
    hash: receipt.hash,
    timestamp: receipt.timestamp,
    blockNumber: receipt.blockNumber,
    sessionCode,
    votedCandidateIds,
  })

  mockDb.saveDb(db)

  // Generate cryptographic receipt
  const ballotData = `${sessionCode}:${voterToken}:${votedCandidateIds.sort().join(',')}:${Date.now()}`
  const hash = await sha256Hash(ballotData)

  const receipt = {
    receiptId: generateReceiptId(),
    hash,
    timestamp: new Date().toISOString(),
    blockNumber: generateBlockNumber(),
  }

  return { ok: true, receipt, session }
}

function generateToken(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function stripPrivateSessionData(session) {
  const publicSession = { ...session }
  delete publicSession.accreditedVoters
  return publicSession
}

async function mockVerifyReceipt(receiptId) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  const receipt = (db.receipts || []).find(r => r.receiptId === receiptId)
  if (!receipt) {
    throw new ApiError(404, 'RECEIPT_NOT_FOUND', 'Receipt not found in the ledger.')
  }
  return { ok: true, receipt }
}

export const voterService = {
  async accreditVoter(sessionCode, email) {
    if (USE_MOCKS) return mockAccreditVoter(sessionCode, email)
    return apiClient.post(`/sessions/${sessionCode}/accredit`, { body: { email } })
  },

  async checkAccreditation(sessionCode, email) {
    if (USE_MOCKS) return mockCheckAccreditation(sessionCode, email)
    return apiClient.get(`/sessions/${sessionCode}/accreditation/${encodeURIComponent(email)}`)
  },

  async loginVoter(sessionCode, email, token) {
    if (USE_MOCKS) return mockLoginVoter(sessionCode, email, token)
    return apiClient.post(`/sessions/${sessionCode}/login`, { body: { email, token } })
  },

  async castBallot(sessionCode, ballotPayload, voterToken) {
    if (USE_MOCKS) return mockCastBallot(sessionCode, ballotPayload, voterToken)
    return apiClient.post(`/sessions/${sessionCode}/ballot`, { body: ballotPayload, token: voterToken })
  },

  async verifyReceipt(receiptId) {
    if (USE_MOCKS) return mockVerifyReceipt(receiptId)
    return apiClient.get(`/receipts/${receiptId}`)
  },
}