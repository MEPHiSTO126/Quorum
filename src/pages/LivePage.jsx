import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useAuth } from '../context/AuthContext'
import {
  Users, TrendingUp, Clock, CheckCircle2, UserCircle2,
  Radio, RefreshCw, ExternalLink
} from 'lucide-react'
import './LivePage.css'

export default function LivePage() {
  const { id, sessionCode } = useParams()
  const { getSession, getSessionByCode } = useSession()
  const { token } = useAuth()

  const session = id ? getSession(id) : getSessionByCode(sessionCode)
  const isAdminView = Boolean(id && token)

  const [timeLeft, setTimeLeft] = useState(null)
  const [elapsed, setElapsed]   = useState(null)

  useEffect(() => {
    if (!session) return
    function tick() {
      const now = Date.now()
      const end = new Date(session.endTime).getTime()
      const start = new Date(session.startTime).getTime()
      if (session.status === 'live') {
        setTimeLeft(Math.max(0, end - now))
        setElapsed(Math.max(0, now - start))
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session])

  if (!session) {
    return (
      <div className="live-shell">
        <div className="live-not-found">
          <Vote size={40} style={{color:'var(--text-muted)'}} />
          <h2>Session not found</h2>
          <p className="text-secondary text-sm">This voting session doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  const turnoutPct = session.totalAccredited
    ? Math.round((session.totalVoted / session.totalAccredited) * 100)
    : 0

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
            <span className="fw-800 live-brand-text">Quorum</span>
            <span className="text-muted text-xs" style={{marginLeft:8}}>Live Results</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session.status === 'live' && (
            <div className="badge badge-live">
              <div className="live-dot" style={{width:6,height:6}} />
              Live
            </div>
          )}
          {isAdminView && (
            <Link to="/admin/dashboard" className="btn btn-ghost btn-sm">
              Dashboard <ExternalLink size={13} />
            </Link>
          )}
        </div>
      </header>

      <div className="live-content">
        {/* Session title */}
        <div className="live-session-title-block">
          <h1 className="live-session-name">{session.name}</h1>
          {session.description && (
            <p className="text-secondary text-sm">{session.description}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="live-stats-row">
          <StatTile
            icon={Users}
            label="Accredited"
            value={session.totalAccredited.toLocaleString()}
          />
          <StatTile
            icon={TrendingUp}
            label="Votes Cast"
            value={session.totalVoted.toLocaleString()}
          />
          <StatTile
            icon={CheckCircle2}
            label="Turnout"
            value={`${turnoutPct}%`}
            accent={turnoutPct > 60 ? 'success' : ''}
          />
          {session.status === 'live' && (
            <StatTile icon={Clock} label="Time Left" value={fmtTime(timeLeft)} accent="live" />
          )}
          {session.status === 'ended' && (
            <StatTile icon={CheckCircle2} label="Status" value="Ended" />
          )}
          {session.status === 'scheduled' && (
            <StatTile icon={Clock} label="Opens" value="Scheduled" />
          )}
        </div>

        {/* Turnout bar */}
        <div className="live-turnout-bar">
          <div className="flex justify-between text-sm" style={{marginBottom:8}}>
            <span className="text-secondary">Overall Turnout</span>
            <span className="fw-600">{session.totalVoted} / {session.totalAccredited}</span>
          </div>
          <div className="progress-track" style={{height:10}}>
            <div className="progress-fill green" style={{width:`${turnoutPct}%`}} />
          </div>
        </div>

        {/* Positions */}
        {session.positions.length === 0 ? (
          <div className="live-empty">
            <Radio size={32} style={{color:'var(--text-muted)'}} />
            <p className="text-secondary">No position data yet.</p>
          </div>
        ) : (
          <div className="live-positions">
            {session.positions.map(pos => (
              <PositionResults key={pos.id} position={pos} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="live-footer">
        <span className="text-xs text-muted">
          Results update automatically · Session <span className="mono text-brand">{session.code}</span>
        </span>
        {session.status === 'live' && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <RefreshCw size={11} className="spinning-slow" />
            Live
          </div>
        )}
      </footer>
    </div>
  )
}

function StatTile({ icon: Icon, label, value, accent }) {
  return (
    <div className={`live-stat-tile ${accent ? `live-stat-${accent}` : ''}`}>
      <Icon size={16} className="live-stat-icon" />
      <div className="live-stat-value">{value}</div>
      <div className="live-stat-label text-xs text-muted">{label}</div>
    </div>
  )
}

function PositionResults({ position }) {
  const totalVotes = position.candidates.reduce((n, c) => n + (c.votes || 0), 0)
  const sorted = [...position.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0))
  const winner = sorted[0]

  return (
    <div className="live-position-card">
      <div className="live-position-header">
        <h3 className="live-position-name">{position.name}</h3>
        {position.description && (
          <p className="text-xs text-muted">{position.description}</p>
        )}
        <div className="live-position-total text-xs text-muted">
          {totalVotes} votes cast
        </div>
      </div>

      <div className="live-candidates">
        {sorted.map((cand, i) => {
          const pct = totalVotes > 0 ? Math.round((cand.votes / totalVotes) * 100) : 0
          const isLeading = cand.id === winner.id && totalVotes > 0
          return (
            <div key={cand.id} className={`live-cand-row ${isLeading ? 'leading' : ''}`}>
              <div className="live-cand-avatar">
                {cand.image || cand.imageUrl
                  ? <img src={cand.image || cand.imageUrl} alt={cand.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  : <UserCircle2 size={22} />
                }
              </div>
              <div className="live-cand-info">
                <div className="flex items-center gap-2">
                  <span className="fw-600 text-sm">{cand.name}</span>
                  {isLeading && <span className="badge badge-live" style={{padding:'2px 7px',fontSize:10}}>Leading</span>}
                </div>
                {cand.catchphrase && (
                  <span className="text-xs text-muted">"{cand.catchphrase}"</span>
                )}
                <div className="live-cand-bar-wrap">
                  <div className="progress-track" style={{height:6,flex:1}}>
                    <div
                      className={`progress-fill ${isLeading ? 'green' : ''}`}
                      style={{width:`${pct}%`}}
                    />
                  </div>
                  <span className="live-cand-pct text-xs">{pct}%</span>
                  <span className="live-cand-count text-xs text-muted">({cand.votes || 0})</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
