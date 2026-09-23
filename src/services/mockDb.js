// In-memory mock database with BroadcastChannel sync for multi-tab consistency
const DB_KEY = 'quorum_mock_db'
const CHANNEL_NAME = 'quorum-mock-sync'

function getDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed.usedVoterTokens)) parsed.usedVoterTokens = []
      if (!parsed.pendingOtps) parsed.pendingOtps = {}
      if (!Array.isArray(parsed.sessions)) parsed.sessions = []
      if (!Array.isArray(parsed.orgs)) parsed.orgs = []
      return parsed
    }
  } catch { /* corrupted mock db — fall through to seed data */ }
  return {
    orgs: [
      { id: 'org-1', name: 'Westfield Student Union', email: 'admin@westfield.edu', description: 'Student governance body for Westfield University.' },
    ],
    sessions: [
      {
        id: 'sess-1',
        orgId: 'org-1',
        name: '2025 Executive Elections',
        description: 'Annual election for the student union executive positions.',
        code: 'WSU-2025',
        status: 'live',
        startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        endTime: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
        positions: [
          {
            id: 'pos-1',
            name: 'President',
            description: 'Leads the student union and represents students at the board level.',
            candidates: [
              { id: 'cand-1', name: 'Amara Osei', catchphrase: 'Unity in Progress', image: null, votes: 142 },
              { id: 'cand-2', name: 'Felix Adeyemi', catchphrase: 'Students First, Always', image: null, votes: 98 },
              { id: 'cand-3', name: 'Priya Nair', catchphrase: 'Bold Change Starts Now', image: null, votes: 76 },
            ],
          },
          {
            id: 'pos-2',
            name: 'General Secretary',
            description: 'Manages records, communications, and administrative affairs.',
            candidates: [
              { id: 'cand-4', name: 'Tunde Bakare', catchphrase: 'Structure. Clarity. Action.', image: null, votes: 180 },
              { id: 'cand-5', name: 'Ngozi Eze', catchphrase: 'For Every Voice', image: null, votes: 136 },
            ],
          },
        ],
        totalAccredited: 410,
        totalVoted: 316,
        accreditedVoters: ['voter@demo.com', 'student@westfield.edu', 'elector@institution.ac.uk'],
        quorumThreshold: 50,
      },
      {
        id: 'sess-2',
        orgId: 'org-1',
        name: 'Q3 Faculty Representative Vote',
        description: 'Faculty-level representative selection for Q3.',
        code: 'WSU-FAC3',
        status: 'scheduled',
        startTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        positions: [],
        totalAccredited: 0,
        totalVoted: 0,
        accreditedVoters: [],
        quorumThreshold: 50,
      },
      {
        id: 'sess-3',
        orgId: 'org-1',
        name: '2024 Year-End Awards Vote',
        description: 'Community vote for end-of-year recognition awards.',
        code: 'WSU-2024',
        status: 'ended',
        startTime: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
        endTime: new Date(Date.now() - 1000 * 60 * 60 * 150).toISOString(),
        positions: [
          {
            id: 'pos-3',
            name: 'Best Academic Initiative',
            description: 'Vote for the most impactful academic initiative of 2024.',
            candidates: [
              { id: 'cand-6', name: 'Peer Tutoring Network', catchphrase: 'Learn Together', image: null, votes: 140 },
              { id: 'cand-7', name: 'Open-Source Syllabus Bank', catchphrase: 'Knowledge is Free', image: null, votes: 61 },
              { id: 'cand-8', name: 'Mental Health Champions', catchphrase: 'Wellbeing First', image: null, votes: 40 },
            ],
          },
        ],
        totalAccredited: 280,
        totalVoted: 241,
        accreditedVoters: ['voter@demo.com', 'alumnus@westfield.edu'],
        quorumThreshold: 50,
      },
    ],
    pendingOtps: {},
    usedVoterTokens: [],
    rateLimits: {}, // key -> { attempts: number, windowStart: number }
    receipts: [], // { receiptId, hash, timestamp, blockNumber, sessionCode, votedCandidateIds }
  }
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  broadcast({ type: 'DB_UPDATED', db })
}

/**
 * Simple sliding-window rate limiter
 * @param {string} key - e.g., 'otp_request:email@example.com' or 'otp_verify:email@example.com'
 * @param {number} maxAttempts - max attempts per window
 * @param {number} windowMs - window in milliseconds
 * @returns {boolean} true if allowed, false if rate limited
 */
function checkRateLimit(key, maxAttempts, windowMs) {
  const db = getDb()
  const now = Date.now()
  const windowStart = now - windowMs

  if (!db.rateLimits[key]) {
    db.rateLimits[key] = { attempts: 0, windowStart: now }
  }

  // Clean old entries
  if (db.rateLimits[key].windowStart < windowStart) {
    db.rateLimits[key] = { attempts: 0, windowStart: now }
  }

  if (db.rateLimits[key].attempts >= maxAttempts) {
    return false
  }

  db.rateLimits[key].attempts++
  saveDb(db)
  return true
}

export function clearRateLimit(key) {
  const db = getDb()
  if (db.rateLimits[key]) {
    delete db.rateLimits[key]
    saveDb(db)
  }
}

let channel = null
const subscribers = new Set()
let storageFallbackAttached = false

function notifySubscribers(db) {
  subscribers.forEach(cb => {
    try { cb(db) } catch { /* subscriber error — isolate */ }
  })
}

function getChannel() {
  if (typeof BroadcastChannel !== 'undefined' && !channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME)
      channel.onmessage = (e) => {
        if (e.data?.type === 'DB_UPDATED') {
          localStorage.setItem(DB_KEY, JSON.stringify(e.data.db))
          notifySubscribers(e.data.db)
        }
      }
    } catch {
      channel = null
    }
  }
  return channel
}

// Fallback for environments without BroadcastChannel (e.g. Safari private
// browsing): the `storage` event fires in *other* tabs when localStorage
// changes, which saveDb already triggers via setItem.
function attachStorageFallback() {
  if (storageFallbackAttached || typeof window === 'undefined') return
  storageFallbackAttached = true
  window.addEventListener('storage', (e) => {
    if (e.key !== DB_KEY || !e.newValue) return
    try {
      notifySubscribers(JSON.parse(e.newValue))
    } catch { /* corrupted payload — ignore */ }
  })
}

function broadcast(msg) {
  const ch = getChannel()
  if (ch) {
    try { ch.postMessage(msg) } catch { /* channel broken — storage event still propagates */ }
  }
}

export function subscribeToDbChanges(cb) {
  subscribers.add(cb)
  getChannel()
  attachStorageFallback()
  return () => subscribers.delete(cb)
}

// Simulated network delay
const DELAY = (ms = 300) => new Promise(r => setTimeout(r, ms + Math.random() * 200))

export const mockDb = {
  getDb,
  saveDb,
  subscribeToDbChanges,
  DELAY,
  checkRateLimit,
  clearRateLimit,
}