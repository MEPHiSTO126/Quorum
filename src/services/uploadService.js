import { ApiError } from './apiClient.js'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function mockUploadCandidatePhoto(file) {
  // Simulate upload delay
  await new Promise(r => setTimeout(r, 800 + Math.random() * 400))

  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new ApiError(400, 'INVALID_FILE_TYPE', 'Only image files are allowed.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError(400, 'FILE_TOO_LARGE', 'Image must be under 5MB.')
  }

  // Convert to data URL for persistence (works across page refreshes)
  const dataUrl = await fileToDataUrl(file)
  const filename = `cand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`

  return {
    url: dataUrl,
    filename,
    revoke: () => {}, // No-op for data URLs
  }
}

export const uploadService = {
  async uploadCandidatePhoto(file) {
    if (USE_MOCKS) return mockUploadCandidatePhoto(file)

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/uploads/candidate-photo`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Upload failed' }))
      throw new ApiError(response.status, err.code || 'UPLOAD_FAILED', err.message)
    }

    return response.json()
  },
}