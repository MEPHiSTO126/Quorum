import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import {
  LayoutDashboard, Plus, LogOut, ChevronRight,
  Hash, Link2, UserCheck, Copy, Check, ChevronDown, ChevronUp
} from 'lucide-react'
import './AdminLayout.css'

export default function AdminLayout({ children }) {
  const { org, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/sessions/new', label: 'New Session', icon: Plus },
  ]

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="Quorum" className="sidebar-logo" />
          <span className="brand-name">Quorum</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`nav-item ${pathname === to || (to !== '/admin/dashboard' && pathname.startsWith(to)) ? 'active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {pathname === to && <ChevronRight size={14} className="nav-chevron" />}
            </Link>
          ))}
        </nav>

        {/* Session Quick Links panel */}
        <SessionLinksPanel />

        <div className="sidebar-footer">
          <div className="org-pill">
            <div className="org-avatar">{org?.name?.[0] ?? 'O'}</div>
            <div className="org-info">
              <span className="org-name">{org?.name}</span>
              <span className="org-email">{org?.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon logout-btn" onClick={handleLogout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Session Quick Links — shown for every non-ended session
───────────────────────────────────────────────────────────── */
function SessionLinksPanel() {
  const { sessions } = useSession()
  // Show draft, scheduled, and live — not ended
  const activeSessions = sessions.filter(s => s.status !== 'ended')
  if (activeSessions.length === 0) return null

  return (
    <div className="sidebar-sessions">
      <div className="sidebar-section-label">Session Links</div>
      <div className="sidebar-sessions-list">
        {activeSessions.map(session => (
          <SessionLinkCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}

function SessionLinkCard({ session }) {
  const [open, setOpen] = useState(session.status === 'live') // live sessions open by default
  const origin = window.location.origin
  const accredUrl  = `${origin}/join?code=${session.code}`
  const voteUrl    = `${origin}/vote/${session.code}/login`
  const votingHasStarted = session.status === 'live' || session.status === 'ended'

  return (
    <div className={`session-link-card ${session.status === 'live' ? 'slc-live' : ''}`}>
      {/* Header row — session name + toggle */}
      <button
        className="slc-header"
        onClick={() => setOpen(o => !o)}
        id={`slc-toggle-${session.id}`}
      >
        <div className="slc-name-row">
          {session.status === 'live' && <span className="live-dot" style={{flexShrink:0}} />}
          <span className="slc-name">{session.name}</span>
        </div>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="slc-body">
          {/* Session Code */}
          <LinkRow
            icon={Hash}
            label="Session code"
            value={session.code}
            display={session.code}
            id={`copy-code-sidebar-${session.id}`}
            mono
          />

          {/* Accreditation link — hidden once voting starts */}
          {!votingHasStarted && (
            <LinkRow
              icon={UserCheck}
              label="Accreditation"
              value={accredUrl}
              display="/join"
              id={`copy-accred-sidebar-${session.id}`}
            />
          )}

          {/* Voter login link */}
          <LinkRow
            icon={Link2}
            label="Voter login"
            value={voteUrl}
            display="/vote/login"
            id={`copy-vote-sidebar-${session.id}`}
          />
        </div>
      )}
    </div>
  )
}

/* A single copyable row */
function LinkRow({ icon: Icon, label, value, display, id, mono }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="slc-row">
      <div className="slc-row-left">
        <Icon size={11} className="slc-row-icon" />
        <div className="slc-row-info">
          <span className="slc-row-label">{label}</span>
          <span className={`slc-row-value ${mono ? 'mono' : ''}`}>{display}</span>
        </div>
      </div>
      <button
        className={`slc-copy-btn ${copied ? 'copied' : ''}`}
        onClick={copy}
        id={id}
        title={`Copy ${label}`}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </div>
  )
}
