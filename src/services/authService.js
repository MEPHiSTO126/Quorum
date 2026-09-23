import { apiClient, ApiError } from './apiClient.js'
import { mockDb } from './mockDb.js'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

// Rate limit configs
const OTP_REQUEST_LIMIT = { maxAttempts: 3, windowMs: 15 * 60 * 1000 } // 3 per 15 min
const OTP_VERIFY_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 } // 5 per 15 min

function generateToken(prefix = 'token') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function mockRequestOtp(email) {
  await mockDb.DELAY()

  // Rate limit OTP requests
  const rlKey = `otp_request:${email.toLowerCase()}`
  if (!mockDb.checkRateLimit(rlKey, OTP_REQUEST_LIMIT.maxAttempts, OTP_REQUEST_LIMIT.windowMs)) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many OTP requests. Please wait before trying again.')
  }

  const db = mockDb.getDb()
  const org = db.orgs.find(o => o.email.toLowerCase() === email.toLowerCase())
  if (!org) {
    return { ok: false, exists: false }
  }
  db.pendingOtps[email.toLowerCase()] = '123456'
  mockDb.saveDb(db)
  return { ok: true, exists: true }
}

async function mockVerifyOtp(email, otp) {
  await mockDb.DELAY()

  // Rate limit OTP verification attempts
  const rlKey = `otp_verify:${email.toLowerCase()}`
  if (!mockDb.checkRateLimit(rlKey, OTP_VERIFY_LIMIT.maxAttempts, OTP_VERIFY_LIMIT.windowMs)) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many verification attempts. Please wait before trying again.')
  }

  const db = mockDb.getDb()
  const stored = db.pendingOtps[email.toLowerCase()]
  const org = db.orgs.find(o => o.email.toLowerCase() === email.toLowerCase())

  if (stored && otp === stored && org) {
    delete db.pendingOtps[email.toLowerCase()]
    const token = generateToken('admin')
    mockDb.saveDb(db)
    // Clear rate limit on successful verification
    mockDb.clearRateLimit(`otp_request:${email.toLowerCase()}`)
    mockDb.clearRateLimit(`otp_verify:${email.toLowerCase()}`)
    return { ok: true, org, token }
  }
  throw new ApiError(401, 'INVALID_OTP', 'Incorrect code. Please try again.')
}

async function mockRegisterOrg(name, email, description) {
  await mockDb.DELAY(500)
  const db = mockDb.getDb()
  db.pendingOtps[email.toLowerCase()] = '123456'
  db.pendingOtps[`__data__${email.toLowerCase()}`] = { name, email, description }
  mockDb.saveDb(db)
  return { ok: true }
}

async function mockVerifyRegistration(email, otp) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  const stored = db.pendingOtps[email.toLowerCase()]
  const data = db.pendingOtps[`__data__${email.toLowerCase()}`]

  if (stored && otp === stored && data) {
    delete db.pendingOtps[email.toLowerCase()]
    delete db.pendingOtps[`__data__${email.toLowerCase()}`]
    const org = { id: `org-${Date.now()}`, ...data }
    db.orgs.push(org)
    const token = generateToken('admin')
    mockDb.saveDb(db)
    return { ok: true, org, token }
  }
  throw new ApiError(401, 'INVALID_OTP', 'Incorrect code. Please try again.')
}

async function mockGetMe(token) {
  await mockDb.DELAY()
  const db = mockDb.getDb()
  if (token && (token.startsWith('admin-') || token.startsWith('mock-token-'))) {
    const org = db.orgs[0]
    return { ok: true, org, token }
  }
  throw new ApiError(401, 'INVALID_TOKEN', 'Session expired or invalid')
}

export const authService = {
  async requestOtp(email) {
    if (USE_MOCKS) return mockRequestOtp(email)
    return apiClient.post('/auth/request-otp', { body: { email } })
  },

  async verifyOtp(email, otp) {
    if (USE_MOCKS) return mockVerifyOtp(email, otp)
    return apiClient.post('/auth/verify-otp', { body: { email, otp } })
  },

  async registerOrg(name, email, description) {
    if (USE_MOCKS) return mockRegisterOrg(name, email, description)
    return apiClient.post('/auth/register', { body: { name, email, description } })
  },

  async verifyRegistration(email, otp) {
    if (USE_MOCKS) return mockVerifyRegistration(email, otp)
    return apiClient.post('/auth/verify-registration', { body: { email, otp } })
  },

  async getMe(token) {
    if (USE_MOCKS) return mockGetMe(token)
    return apiClient.get('/auth/me', { token })
  },
}