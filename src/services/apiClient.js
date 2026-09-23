const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const CSRF_HEADER = 'X-CSRF-Token'
const CSRF_META_NAME = 'csrf-token'

function readCsrfToken() {
  try {
    if (typeof document === 'undefined') return null
    const meta = document.querySelector(`meta[name="${CSRF_META_NAME}"]`)
    const fromMeta = meta?.getAttribute('content')
    if (fromMeta) return fromMeta
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

function isUnsafeMethod(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
}

class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request(method, path, options = {}) {
  const { body, headers = {}, token, ...rest } = options

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  // Attach CSRF token on state-changing requests (live mode only — the mock
  // services bypass HTTP entirely, so there is nothing to protect there).
  if (!USE_MOCKS && isUnsafeMethod(method)) {
    const csrf = readCsrfToken()
    if (csrf && !requestHeaders[CSRF_HEADER]) {
      requestHeaders[CSRF_HEADER] = csrf
    }
  }

  const url = USE_MOCKS ? path : `${BASE_URL}${path}`

  const config = {
    method,
    headers: requestHeaders,
    ...rest,
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      let errorData = {}
      try {
        errorData = await response.json()
      } catch {
        errorData = { message: response.statusText }
      }

      throw new ApiError(
        response.status,
        errorData.code || 'REQUEST_FAILED',
        errorData.message || `HTTP ${response.status}`,
        errorData.details || {}
      )
    }

    if (response.status === 204) return null
    return await response.json()
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(0, 'NETWORK_ERROR', err.message || 'Network request failed')
  }
}

export const apiClient = {
  get: (path, options) => request('GET', path, options),
  post: (path, options) => request('POST', path, options),
  put: (path, options) => request('PUT', path, options),
  patch: (path, options) => request('PATCH', path, options),
  delete: (path, options) => request('DELETE', path, options),
}

export { ApiError }