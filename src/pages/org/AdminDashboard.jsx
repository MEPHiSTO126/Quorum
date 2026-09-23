import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSession } from '../../context/SessionContext'
import AdminLayout from '../../layouts/AdminLayout'
import {
  Plus, Copy, ExternalLink, Edit3, Radio, Clock, CheckCircle2,
  FileText, Vote, Search, ShieldCheck, Check
} from 'lucide-react'
import './AdminDashboard.css'

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'badge-draft',     icon: FileText },
  scheduled: { label: 'Upcoming',  cls: 'badge-scheduled', icon: Clock },
  live:      { label: 'Live Now',  cls: 'badge-live',      icon: Radio },
  ended:     { label: 'Finished',  cls: 'badge-ended',     icon: CheckCircle2 },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function AdminDashboard() {
  const { org } = useAuth()
  const { sessions } = useSession()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'live' | 'scheduled' | 'ended'

  const liveSessions      = sessions.filter(s => s.status === 'live')
  const scheduledSessions = sessions.filter(s => s.status === 'scheduled')
  const totalVoters       = sessions.reduce((n, s) => n + (s.totalAccredited || 0), 0)
  const totalVotesCast    = sessions.reduce((n, s) => n + (s.totalVoted || 0), 0)

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.code.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' ? true : s.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [sessions, searchQuery, statusFilter])

  return (
    <AdminLayout>
      <div className="dashboard-page">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-info">
            <div className="civic-seal" style={{ marginBottom: 8 }}>
              <ShieldCheck size={13} style={{ color: 'var(--brand-500)' }} />
              <span>Certified Governance Console</span>
            </div>
            <h1 className="dashboard-title font-serif">Governance Overview</h1>
            <p className="dashboard-subtitle text-secondary text-sm">
              Managing legislative, board, and electoral sessions for <strong>{org?.name || 'Academic Senate'}</strong>.
            </p>
          </div>

          <Link to="/admin/sessions/new" className="btn btn-primary" id="new-session-btn">
            <Plus size={16} /> Create Ballot Session
          </Link>
        </div>

        {/* Operational Metrics Bar */}
        <div className="stats-grid">
          <StatCard
            index="01"
            label="SESSIONS"
            value={sessions.length}
            subtext="Configured on ledger"
          />
          <StatCard
            index="02"
            label="ACTIVE NOW"
            value={liveSessions.length}
            accent={liveSessions.length > 0 ? 'live' : undefined}
            subtext={liveSessions.length > 0 ? 'Voting currently open' : 'No active votes'}
          />
          <StatCard
            index="03"
            label="UPCOMING"
            value={scheduledSessions.length}
            subtext="Pending start window"
          />
          <StatCard
            index="04"
            label="ELECTORS"
            value={totalVoters.toLocaleString()}
            subtext={`${totalVotesCast} verified ballots cast`}
          />
        </div>

        {/* Live Session Command Banner */}
        {liveSessions.length > 0 && (
          <div className="live-banner">
            <div className="live-banner-left">
              <span className="live-dot" style={{ width: 9, height: 9 }} />
              <div>
                <span className="live-banner-title">
                  {liveSessions.length === 1 ? (
                    <>Session <strong>{liveSessions[0].name}</strong> is currently live</>
                  ) : (
                    <><strong>{liveSessions.length} electoral sessions</strong> are currently receiving votes</>
                  )}
                </span>
                <span className="live-banner-subtext">
                  Electors can currently access the voting booth with verified credentials.
                </span>
              </div>
            </div>
            <Link
              to={`/admin/sessions/${liveSessions[0].id}/live`}
              className="btn btn-sm btn-outline-brand"
            >
              Open Live Monitor <ExternalLink size={13} />
            </Link>
          </div>
        )}

        {/* Sessions Filter Toolbar & List */}
        <section className="sessions-section">
          <div className="sessions-toolbar">
            <div className="sessions-toolbar-left">
              <h2 className="section-title">Voting Sessions</h2>
              <span className="sessions-count-badge">
                {filteredSessions.length} {filteredSessions.length === 1 ? 'session' : 'sessions'}
              </span>
            </div>

            <div className="sessions-toolbar-controls">
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by title or code…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-tabs">
                {[
                  { id: 'all',       label: 'All' },
                  { id: 'live',      label: 'Live Now' },
                  { id: 'scheduled', label: 'Upcoming' },
                  { id: 'ended',     label: 'Finished' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`filter-tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
                    onClick={() => setStatusFilter(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <EmptyState
              onNew={() => navigate('/admin/sessions/new')}
              isFiltered={sessions.length > 0}
              onClear={() => { setSearchQuery(''); setStatusFilter('all') }}
            />
          ) : (
            <div className="sessions-list">
              {filteredSessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}

function StatCard({ index, label, value, accent, subtext }) {
  return (
    <div className={`stat-card card-flat ${accent ? `stat-${accent}` : ''}`}>
      <div className="stat-card-header">
        <span className="stat-label text-xs text-secondary font-mono">{label}</span>
        {accent === 'live' ? (
          <span className="live-dot" style={{ width: 7, height: 7 }} />
        ) : (
          <span className="stat-index font-mono text-muted">{index}</span>
        )}
      </div>
      <div className="stat-value font-mono">{value}</div>
      {subtext && <div className="stat-subtext text-xs text-muted">{subtext}</div>}
    </div>
  )
}

function SessionCard({ session }) {
  const meta = STATUS_META[session.status]
  const Icon = meta.icon
  const turnout = session.totalAccredited
    ? Math.round((session.totalVoted / session.totalAccredited) * 100)
    : 0

  const canEdit = session.status === 'draft' || session.status === 'scheduled'
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(session.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="session-card card-flat receipt-tape">
      <div className="session-card-header">
        <div className="session-card-info">
          <div className="flex items-center gap-2">
            <span className={`badge ${meta.cls}`}>
              <Icon size={11} />
              {meta.label}
            </span>
            <span className="session-code-badge font-mono">
              #{session.code}
            </span>
            <button
              className="copy-code-inline-btn"
              onClick={copyCode}
              title="Copy session code"
              type="button"
            >
              {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>
          <h3 className="session-name font-serif">{session.name}</h3>
          {session.description && (
            <p className="session-desc text-sm text-secondary">{session.description}</p>
          )}
        </div>

        <div className="session-card-actions">
          {canEdit && (
            <Link
              to={`/admin/sessions/${session.id}/edit`}
              className="btn btn-secondary btn-sm"
              id={`edit-${session.id}`}
            >
              <Edit3 size={13} /> Edit Ballot
            </Link>
          )}
          <Link
            to={`/admin/sessions/${session.id}/live`}
            className="btn btn-outline-brand btn-sm"
            id={`view-live-${session.id}`}
          >
            <ExternalLink size={13} /> Tally View
          </Link>
        </div>
      </div>

      <div className="session-card-footer">
        <div className="session-dates text-xs text-muted font-mono">
          <span>WINDOW: {formatDate(session.startTime)} — {formatDate(session.endTime)}</span>
        </div>

        {session.totalAccredited > 0 && (
          <div className="session-turnout-block">
            <div className="flex justify-between text-xs text-secondary font-mono" style={{ marginBottom: 4 }}>
              <span>QUORUM & TURNOUT</span>
              <span className="fw-700 text-primary">{session.totalVoted} / {session.totalAccredited} ({turnout}%)</span>
            </div>
            <div className="session-track-wrap">
              <div className="progress-track">
                <div
                  className={`progress-fill ${session.status === 'live' ? 'green' : ''}`}
                  style={{ width: `${Math.min(turnout, 100)}%` }}
                />
              </div>
              <div className="session-quorum-tick" style={{ left: '50%' }} title="50% Quorum Line" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onNew, isFiltered, onClear }) {
  return (
    <div className="empty-state card">
      <Vote size={36} className="empty-icon" />
      <h3 className="fw-600 font-serif">
        {isFiltered ? 'No matching electoral sessions' : 'No electoral sessions registered'}
      </h3>
      <p className="text-sm text-muted" style={{ maxWidth: 360, textAlign: 'center' }}>
        {isFiltered
          ? 'No sessions match your current search or status filter parameters.'
          : 'Establish your first voting session, define positions, and configure the electorate.'}
      </p>
      {isFiltered ? (
        <button className="btn btn-secondary btn-sm" onClick={onClear} type="button">
          Clear Filters
        </button>
      ) : (
        <button className="btn btn-primary" onClick={onNew} id="empty-new-session" type="button">
          <Plus size={15} /> Create Ballot Session
        </button>
      )}
    </div>
  )
}
