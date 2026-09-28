import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { sessionService } from '../services/sessionService.js'
import { useLiveTelemetry } from './useLiveTelemetry.js'

vi.mock('../services/sessionService.js', () => ({
  sessionService: {
    getSessionByCode: vi.fn(),
    subscribeToSession: vi.fn(() => () => {}),
  },
}))

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useLiveTelemetry', () => {
  it('discards a stale slow response when the session switches mid-flight', async () => {
    const slowAAA = deferred()
    const sessionAAA = { code: 'AAA', totalVoted: 10, status: 'live' }
    const sessionBBB = { code: 'BBB', totalVoted: 99, status: 'live' }

    sessionService.getSessionByCode.mockImplementation((code) => {
      if (code === 'AAA') return slowAAA.promise
      return Promise.resolve(sessionBBB)
    })

    const { result, rerender } = renderHook(
      ({ code }) => useLiveTelemetry(code, true, 60000),
      { initialProps: { code: 'AAA' } },
    )

    // Slow AAA poll is in flight; switch session before it resolves.
    rerender({ code: 'BBB' })

    await waitFor(() => {
      expect(result.current.telemetry).toEqual(sessionBBB)
    })
    expect(result.current.syncState).toBe('synced')

    // The stale AAA response lands late — it must never clobber BBB.
    await act(async () => { slowAAA.resolve(sessionAAA) })

    expect(result.current.telemetry).toEqual(sessionBBB)
    expect(result.current.syncState).toBe('synced')
  })

  it('reports an error when the tally fetch fails', async () => {
    sessionService.getSessionByCode.mockRejectedValue(new Error('Network down'))

    const { result } = renderHook(() => useLiveTelemetry('AAA', true, 60000))

    await waitFor(() => {
      expect(result.current.syncState).toBe('error')
    })
    expect(result.current.telemetry).toBeNull()
  })

  it('does not poll when disabled or code is missing', async () => {
    const { rerender } = renderHook(
      ({ code, enabled }) => useLiveTelemetry(code, enabled, 60000),
      { initialProps: { code: null, enabled: true } },
    )
    rerender({ code: 'AAA', enabled: false })

    // Allow any stray microtask to flush; no fetch may have been issued.
    await act(async () => {})
    expect(sessionService.getSessionByCode).not.toHaveBeenCalled()
  })
})
