import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import OrgAuth from './OrgAuth.jsx'

const requestOtp = vi.fn()
const verifyOtp = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    requestOtp,
    verifyOtp,
    registerOrg: vi.fn(),
    verifyRegistration: vi.fn(),
    isLoading: false,
    error: null,
  }),
}))

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

async function reachOtpStep(email = 'admin@westfield.edu') {
  render(<OrgAuth />)
  fireEvent.change(screen.getByLabelText(/organization administrator email/i), {
    target: { value: email },
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /authenticate with passcode/i }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  requestOtp.mockResolvedValue({ ok: true, exists: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('OrgAuth sign-in resend cooldown', () => {
  it('starts a single 60s ticker that decrements exactly once per second', async () => {
    await reachOtpStep()

    expect(requestOtp).toHaveBeenCalledTimes(1)
    const resendBtn = screen.getByRole('button', { name: /resend \(60s\)/i })
    expect(resendBtn).toBeDisabled()

    // A single ticker decrements once per second — never faster.
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(screen.getByRole('button', { name: /resend \(55s\)/i })).toBeDisabled()

    await act(async () => { vi.advanceTimersByTime(55000) })
    const readyBtn = screen.getByRole('button', { name: /^resend code$/i })
    expect(readyBtn).not.toBeDisabled()
    expect(requestOtp).toHaveBeenCalledTimes(1)
  })

  it('resends exactly once per cooldown window and resets the ticker', async () => {
    await reachOtpStep()

    await act(async () => { vi.advanceTimersByTime(60000) })
    const readyBtn = screen.getByRole('button', { name: /^resend code$/i })

    await act(async () => { fireEvent.click(readyBtn) })

    expect(requestOtp).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: /resend \(60s\)/i })).toBeDisabled()

    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(screen.getByRole('button', { name: /resend \(57s\)/i })).toBeDisabled()
  })

  it('ignores resend attempts while the cooldown is active', async () => {
    await reachOtpStep()

    // Button is disabled during cooldown, so no second request can fire.
    await act(async () => { vi.advanceTimersByTime(10000) })
    expect(screen.getByRole('button', { name: /resend \(50s\)/i })).toBeDisabled()
    expect(requestOtp).toHaveBeenCalledTimes(1)
  })
})
