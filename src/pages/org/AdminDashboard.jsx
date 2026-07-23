import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSession } from '../../context/SessionContext'
import AdminLayout from '../../layouts/AdminLayout'
import {
  Plus, Copy, ExternalLink, Edit3, Radio, Clock, CheckCircle2,
  FileText, Users, Vote, TrendingUp, Layers, Activity, CalendarClock, UserCheck
} from 'lucide-react'
import './AdminDashboard.css'

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'badge-draft',     icon: FileText },
  scheduled: { label: 'Scheduled', cls: 'badge-scheduled', icon: Clock },
  live:      { label: 'Live',      cls: 'badge-live',      icon: Radio },
  ended:     { label: 'Ended',     cls: 'badge-ended',     icon: CheckCircle2 },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

export default function AdminDashboard() {
  const { org } = useAuth()
  const { sessions } = useSession()
  const navigate = useNavigate()

  const liveSessions     = sessions.filter(s => s.status === 'live')
  const scheduledSessions= sessions.filter(s => s.status === 'scheduled')
  const totalVoters      = sessions.reduce((n, s) => n + (s.totalAccredited || 0), 0)

  return (
    <AdminLayout>
      <div className="dashboard-page">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h2 className="dashboard-title">Dashboard</h2>
            <p className="dashboard-subtitle text-secondary text-sm">
              Welcome back, <strong>{org?.name}</strong>
            </p>
          </div>
          <Link to="/admin/sessions/new" className="btn btn-primary" id="new-session-btn">
            <Plus size={16} /> New Session
          </Link>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <StatCard icon={Layers}        label="Total Sessions"   value={sessions.length} />
          <StatCard icon={Activity}      label="Live Now"         value={liveSessions.length}      accent="live" />
          <StatCard icon={CalendarClock} label="Upcoming"         value={scheduledSessions.length} accent="warn" />
          <StatCard icon={UserCheck}     label="Total Accredited" value={totalVoters.toLocaleString()} />
        </div>

        {/* Live banner */}
        {liveSessions.length > 0 && (
          <div className="live-banner">
            <div className="flex items-center gap-3">
              <span className="live-banner-text">
                {liveSessions.length === 1 ? (
                  <>
                    <span className="live-session-glowing-name">{liveSessions[0].name}</span> is live right now
                  </>
                ) : (
                  <>
                    <span className="live-session-glowing-name">{liveSessions.length} sessions</span> are live right now
                  </>
                )}
              </span>
            </div>
            <Link to={`/admin/sessions/${liveSessions[0].id}/live`} className="btn btn-sm" style={{background:'rgba(34,197,94,0.15)', color:'var(--live)', border:'1px solid rgba(34,197,94,0.3)'}}>
              View Live <TrendingUp size={14} />
            </Link>
          </div>
        )}

        {/* Sessions list */}
        <section>
          <h3 className="section-title">Voting Sessions</h3>
          {sessions.length === 0 ? (
            <EmptyState onNew={() => navigate('/admin/sessions/new')} />
          ) : (
            <div className="sessions-list">
              {sessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={`stat-card ${accent ? `stat-${accent}` : ''}`}>
      <div className="stat-icon"><Icon size={18} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label text-sm text-muted">{label}</div>
      </div>
    </div>
  )
}

function SessionCard({ session }) {
  const navigate = useNavigate()
  const meta = STATUS_META[session.status]
  const Icon = meta.icon
  const turnout = session.totalAccredited
    ? Math.round((session.totalVoted / session.totalAccredited) * 100)
    : 0

  const canEdit = session.status === 'draft' || session.status === 'scheduled'

  return (
    <div className="session-card">
      <div className="session-card-header">
        <div className="session-card-info">
          <h4 className="session-name">{session.name}</h4>
          <p className="session-desc text-sm text-secondary">{session.description}</p>
        </div>
        <div className={`badge ${meta.cls}`}>
          <Icon size={11} />
          {meta.label}
        </div>
      </div>

      <div className="session-card-meta">
        <div className="session-code-pill">
          <span className="mono text-sm">{session.code}</span>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => copyToClipboard(session.code)}
            title="Copy session code"
            id={`copy-code-${session.id}`}
            style={{padding:'4px'}}
          >
            <Copy size={13} />
          </button>
        </div>
        <div className="session-dates text-xs text-muted">
          {formatDate(session.startTime)} → {formatDate(session.endTime)}
        </div>
      </div>

      {session.totalAccredited > 0 && (
        <div className="session-turnout">
          <div className="flex justify-between text-xs text-muted" style={{marginBottom:6}}>
            <span>Voter turnout</span>
            <span>{session.totalVoted} / {session.totalAccredited} ({turnout}%)</span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${session.status === 'live' ? 'green' : ''}`}
              style={{width:`${turnout}%`}}
            />
          </div>
        </div>
      )}

      <div className="session-card-actions">
        {canEdit && (
          <Link to={`/admin/sessions/${session.id}/edit`} className="btn btn-secondary btn-sm" id={`edit-${session.id}`}>
            <Edit3 size={14} /> Edit
          </Link>
        )}
        <Link to={`/admin/sessions/${session.id}/live`} className="btn btn-ghost btn-sm" id={`view-live-${session.id}`}>
          <ExternalLink size={14} /> Live Page
        </Link>
      </div>
    </div>
  )
}

function EmptyState({ onNew }) {
  return (
    <div className="empty-state">
      <Vote size={40} className="empty-icon" />
      <h4 className="fw-600">No voting sessions yet</h4>
      <p className="text-sm text-muted">Create your first session to get started.</p>
      <button className="btn btn-primary" onClick={onNew} id="empty-new-session">
        <Plus size={16} /> Create Session
      </button>
    </div>
  )
}
