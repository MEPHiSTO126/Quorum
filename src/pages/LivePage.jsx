import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { sessionService } from '../services/sessionService.js'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  CheckCircle2, UserCircle2, Radio, RefreshCw, ExternalLink, ShieldCheck, Vote, Sun, Moon
} from 'lucide-react'
import './LivePage.css'

function useLiveTelemetry(code, enabled, intervalMs) {
  const [telemetry, setTelemetry] = useState(null)
  const [syncState, setSyncState] = useState('idle')

  const poll = useCallback(async () => {
    if (!code || !enabled) return
    setSyncState('syncing')
    try {
      const fresh = await sessionService.getSessionByCode(code)
      setTelemetry(fresh)
      setSyncState('synced')
    } catch {
      setSyncState('error')
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

export default function LivePage() {
  const { id, sessionCode } = useParams()
  const { getSession, getSessionByCode } = useSession()
  const { token } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const code = id ? getSession(id)?.code : sessionCode
  const contextSession = id ? getSession(id) : getSessionByCode(sessionCode)
  const pollInterval = Number(import.meta.env.VITE_SESSION_POLL_INTERVAL_MS) || 4000
  const { telemetry, syncState } = useLiveTelemetry(
    code,
    contextSession?.status === 'live',
    pollInterval,
  )
  const session = telemetry || contextSession
  const isAdminView = Boolean(id && token)

  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!session) return
    function tick() {
      const now = Date.now()
      const end = new Date(session.endTime).getTime()
      if (session.status === 'live') {
        setTimeLeft(Math.max(0, end - now))
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session])

  if (!session) {
    return (
      <div className="live-shell">
        <header className="live-header">
          <div className="flex items-center gap-3">
<img src="/logo.png" alt="Quorum" className="live-brand-logo" />
            <span className="live-brand-title">Quorum <span className="text-muted text-xs font-mono">Tally Console</span></span>
          </div>
          <button className="theme-toggle-btn" onClick={toggleTheme} type="button">
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </header>
        <div className="live-content">
          <div className="live-not-found card">
            <Vote size={36} style={{ color: 'var(--text-muted)' }} />
            <h2 className="font-serif text-xl">Session Not Found</h2>
            <p className="text-secondary text-sm">This voting session does not exist or has been removed from the ledger.</p>
          </div>
        </div>
      </div>
    )
  }

  const turnoutPct = session.totalAccredited
    ? Math.round((session.totalVoted / session.totalAccredited) * 100)
    : 0

  const quorumThreshold = session.quorumThreshold || 50
  const quorumMet = turnoutPct >= quorumThreshold

  function fmtTime(ms) {
    if (ms === null || ms === undefined) return '--:--:--'
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':')
  }

  return (
    <div className="live-shell">
      {/* Header */}
      <header className="live-header">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Quorum" className="live-brand-logo" />
          <div>
            <div className="flex items-center gap-2">
              <span className="live-brand-title">Quorum</span>
              <span className="live-tally-pill font-mono">Official Tally Board</span>
            </div>
            <div className="text-xs text-muted font-mono">Session #{session.code}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session.status === 'live' && (
            <div className="badge badge-live">
              <div className="live-dot" />
              Live Tallying
            </div>
          )}
          {session.status === 'ended' && (
            <div className="badge badge-ended">
              <CheckCircle2 size={12} />
              Final Certified Results
            </div>
          )}
          {isAdminView && (
            <Link to="/admin/dashboard" className="btn btn-secondary btn-sm">
              Console <ExternalLink size={13} />
            </Link>
          )}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
            type="button"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </header>

      <div className="live-content">
        {/* Session title & Preamble */}
        <div className="live-session-title-block">
          <div className="civic-seal" style={{ width: 'fit-content' }}>
            <ShieldCheck size={13} style={{ color: 'var(--brand-500)' }} />
            <span>Public Canvass Ledger</span>
          </div>
          <h1 className="live-session-name font-serif">{session.name}</h1>
          {session.description && (
            <p className="live-session-desc text-secondary text-sm">{session.description}</p>
          )}
        </div>

        {/* Operational Metrics Row — Flat Tabular Density */}
        <div className="live-stats-row">
          <StatTile
            index="01"
            label="ACCREDITED"
            value={session.totalAccredited.toLocaleString()}
            subtext="Certified Elector Roster"
          />
          <StatTile
            index="02"
            label="COMMITTED"
            value={session.totalVoted.toLocaleString()}
            subtext={`${session.totalAccredited - session.totalVoted} ballots outstanding`}
          />
          <StatTile
            index="03"
            label="TURNOUT"
            value={`${turnoutPct}%`}
            accent={quorumMet ? 'success' : undefined}
            subtext={quorumMet ? `Quorum Met (≥${quorumThreshold}%)` : `Quorum Pending (<${quorumThreshold}%)`}
          />
          {session.status === 'live' && (
            <StatTile
              index="04"
              label="CLOSING IN"
              value={fmtTime(timeLeft)}
              accent="live"
              subtext="Real-time session clock"
            />
          )}
          {session.status === 'ended' && (
            <StatTile
              index="04"
              label="STATUS"
              value="Certified"
              accent="success"
              subtext="Polls closed & sealed"
            />
          )}
          {session.status === 'scheduled' && (
            <StatTile
              index="04"
              label="STATUS"
              value="Upcoming"
              subtext="Voting pending window"
            />
          )}
        </div>

        {/* Quorum Threshold Gauge */}
        <div className="live-turnout-card card">
          <div className="flex justify-between items-center text-sm" style={{ marginBottom: 6 }}>
            <div className="flex items-center gap-2">
              <span className="fw-600">Parliamentary Quorum Progress</span>
              <span className={`badge ${quorumMet ? 'badge-live' : 'badge-draft'}`} style={{ fontSize: 10 }}>
                {quorumMet ? 'Quorum Achieved' : `Pending ${quorumThreshold}% Threshold`}
              </span>
            </div>
            <span className="font-mono text-xs fw-600">
              {session.totalVoted} of {session.totalAccredited} ballots ({turnoutPct}%)
            </span>
          </div>

          <div className="quorum-track-wrapper">
            <div className="progress-track" style={{ height: 10 }}>
              <div
                className={`progress-fill ${quorumMet ? 'green' : ''}`}
                style={{ width: `${Math.min(turnoutPct, 100)}%` }}
              />
            </div>
            <div className="quorum-threshold-marker" style={{ left: `${quorumThreshold}%` }} title={`${quorumThreshold}% Quorum Requirement`}>
              <span className="marker-line" />
              <span className="marker-text font-mono">{quorumThreshold}% Quorum</span>
            </div>
          </div>
        </div>

        {/* Positions & Canvass Slates */}
        <div className="live-positions-section">
          <h2 className="section-title font-serif" style={{ fontSize: 20 }}>Official Ballot Returns</h2>
          {session.positions.length === 0 ? (
            <div className="live-empty card">
              <Radio size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-secondary text-sm">No position data registered on this ballot.</p>
            </div>
          ) : (
            <div className="live-positions">
              {session.positions.map(pos => (
                <PositionResults key={pos.id} position={pos} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="live-footer">
        <span className="text-xs text-muted">
          All returns cryptographically verified on ledger · Session <span className="mono fw-600 text-brand">#{session.code}</span>
        </span>
        {session.status === 'live' && (
          <div className="flex items-center gap-2 text-xs text-muted font-mono" role="status" aria-live="polite">
            {syncState === 'error' ? (
              <>
                <span className="live-dot" style={{ width: 7, height: 7, background: 'var(--warning)' }} />
                <span>Telemetry connection lost — retrying…</span>
              </>
            ) : (
              <>
                <RefreshCw size={11} className="spinner spinner-sm" style={{ borderWidth: 1.5 }} />
                <span>{syncState === 'syncing' ? 'Syncing tally…' : 'Telemetry Synchronized'}</span>
              </>
            )}
          </div>
        )}
      </footer>
    </div>
  )
}

function StatTile({ index, label, value, accent, subtext }) {
  return (
    <div className={`live-stat-tile card-flat ${accent ? `live-stat-${accent}` : ''}`}>
      <div className="flex items-center justify-between">
        <span className="live-stat-label text-xs font-mono text-muted">{index} // {label}</span>
        {accent === 'live' && <span className="live-dot" style={{ width: 6, height: 6 }} />}
      </div>
      <div className="live-stat-value font-mono">{value}</div>
      {subtext && <div className="text-xs text-muted font-mono" style={{ fontSize: 11 }}>{subtext}</div>}
    </div>
  )
}

function PositionResults({ position }) {
  const totalVotes = position.candidates.reduce((n, c) => n + (c.votes || 0), 0)
  const sorted = [...position.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0))
  const winner = sorted[0]

  return (
    <div className="live-position-card card-flat receipt-tape">
      <div className="live-position-header">
        <div>
          <h3 className="live-position-name">{position.name}</h3>
          {position.description && (
            <p className="text-xs text-secondary" style={{ marginTop: 2 }}>{position.description}</p>
          )}
        </div>
        <div className="live-position-total font-mono text-xs text-muted">
          <strong>{totalVotes}</strong> {totalVotes === 1 ? 'ballot' : 'ballots'} cast
        </div>
      </div>

      <div className="live-candidates">
        {sorted.map(cand => {
          const pct = totalVotes > 0 ? Math.round((cand.votes / totalVotes) * 100) : 0
          const isLeading = cand.id === winner?.id && totalVotes > 0

          return (
            <div key={cand.id} className={`live-cand-row ${isLeading ? 'leading' : ''}`}>
              <div className="live-cand-avatar">
                {cand.image || cand.imageUrl
                  ? <img src={cand.image || cand.imageUrl} alt={cand.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <UserCircle2 size={20} className="text-muted" />
                }
              </div>

              <div className="live-cand-info">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="fw-600 text-sm">{cand.name}</span>
                    {isLeading && (
                      <span className="badge badge-live" style={{ padding: '1px 6px', fontSize: 10 }}>
                        Leading
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="fw-700">{pct}%</span>
                    <span className="text-muted">({cand.votes || 0} votes)</span>
                  </div>
                </div>

                {cand.catchphrase && (
                  <span className="text-xs text-muted" style={{ display: 'block', margin: '2px 0 4px' }}>
                    "{cand.catchphrase}"
                  </span>
                )}

                <div className="progress-track" style={{ height: 6, marginTop: 4 }}>
                  <div
                    className={`progress-fill ${isLeading ? 'green' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
