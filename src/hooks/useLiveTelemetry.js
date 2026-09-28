import { useState, useEffect, useCallback, useRef } from 'react'
import { sessionService } from '../services/sessionService.js'

const POLL_FALLBACK_MS = 4000

export function useLiveTelemetry(code, enabled, intervalMs = POLL_FALLBACK_MS) {
  const [telemetry, setTelemetry] = useState(null)
  const [syncState, setSyncState] = useState('idle')
  const requestRef = useRef(0)
  const inFlightRef = useRef(false)
  const inFlightCodeRef = useRef(null)

  const poll = useCallback(async () => {
    if (!code || !enabled) return
    // Skip overlapping polls for the same session. A session switch always
    // cuts in line — the stale-response guard below discards the old flight.
    if (inFlightRef.current && inFlightCodeRef.current === code) return
    inFlightRef.current = true
    inFlightCodeRef.current = code
    const requestId = ++requestRef.current
    setSyncState('syncing')
    try {
      const fresh = await sessionService.getSessionByCode(code)
      if (requestRef.current !== requestId) return // superseded (e.g. session switched mid-flight)
      setTelemetry(fresh)
      setSyncState('synced')
    } catch {
      if (requestRef.current !== requestId) return
      setSyncState('error')
    } finally {
      // Only the newest flight may release the lock; a stale flight
      // resolving late must not reopen the door behind a newer poll.
      if (requestRef.current === requestId) inFlightRef.current = false
    }
  }, [code, enabled])

  useEffect(() => {
    if (!code || !enabled) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial tally fetch on mount
    poll()
    const timer = setInterval(poll, intervalMs)
    const unsub = sessionService.subscribeToSession(code, (updated) => {
      setTelemetry(updated)
      setSyncState('synced')
    })
    return () => { clearInterval(timer); if (typeof unsub === 'function') unsub() }
  }, [code, enabled, intervalMs, poll])

  return { telemetry, syncState, poll }
}
