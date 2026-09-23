import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, Plus, LogOut, ChevronRight,
  Hash, Link2, UserCheck, Copy, Check, ChevronDown, ChevronUp,
  Sun, Moon, AlertTriangle, X
} from 'lucide-react'
import './AdminLayout.css'

/* ── Logout Confirmation Dialog ───────────────────────────── */
function LogoutDialog({ onConfirm, onCancel }) {
  const panelRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="dialog-panel" ref={panelRef}>
        <div className="dialog-icon-wrap">
          <AlertTriangle size={22} />
        </div>
        <div className="dialog-content">
          <h3 id="logout-dialog-title" className="dialog-title">Sign out of Quorum?</h3>
          <p className="dialog-body">
            You will be returned to the organisation sign-in page. Any unsaved changes in progress will be lost.
          </p>
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            ref={cancelRef}
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
        <button
          type="button"
          className="dialog-close-btn"
          onClick={onCancel}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }) {
  const { org, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  function confirmLogout() {
    setShowLogoutDialog(false)
    logout()
    navigate('/', { replace: true })
  }

  const navItems = [
    { to: '/admin/dashboard', label: 'Governance Overview', icon: LayoutDashboard },
    { to: '/admin/sessions/new', label: 'Create Ballot Session', icon: Plus },
  ]

  return (
    <div className="admin-shell">
      {showLogoutDialog && (
        <LogoutDialog
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutDialog(false)}
        />
      )}

      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="Quorum" className="sidebar-logo" />
          <div className="brand-text-col">
            <span className="brand-name">Quorum</span>
            <span className="brand-badge">Institutional</span>
          </div>
        </div>

        {/* Security & Ledger Status Banner */}
        <div className="sidebar-ledger-status">
          <div className="ledger-indicator">
            <span className="ledger-dot" />
            <span className="ledger-text">Ledger Synced</span>
          </div>
          <span className="ledger-subtext">TLS 1.3 · E2E Audited</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Operations</div>
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || (to !== '/admin/dashboard' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} className="nav-icon" />
                <span>{label}</span>
                {isActive && <ChevronRight size={13} className="nav-chevron" />}
              </Link>
            )
          })}
        </nav>

        {/* Session Quick Links panel */}
        <SessionLinksPanel />

        <div className="sidebar-footer">
          <div className="org-pill">
            <div className="org-avatar">{org?.name?.[0] ?? 'O'}</div>
            <div className="org-info">
              <span className="org-name">{org?.name || 'Academic Senate'}</span>
              <span className="org-role">Certified Administrator</span>
            </div>
          </div>

          <div className="sidebar-footer-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              type="button"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button
              className="btn btn-ghost btn-icon logout-btn"
              onClick={() => setShowLogoutDialog(true)}
              title="Log out"
              type="button"
            >
              <LogOut size={15} />
            </button>
          </div>
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
  const activeSessions = sessions.filter(s => s.status !== 'ended')
  if (activeSessions.length === 0) return null

  return (
    <div className="sidebar-sessions">
      <div className="sidebar-section-label">Active Ballot Access</div>
      <div className="sidebar-sessions-list">
        {activeSessions.map(session => (
          <SessionLinkCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}

function SessionLinkCard({ session }) {
  const [open, setOpen] = useState(session.status === 'live')
  const origin = window.location.origin
  const accredUrl  = `${origin}/join?code=${session.code}`
  const voteUrl    = `${origin}/vote/${session.code}/login`
  const votingHasStarted = session.status === 'live' || session.status === 'ended'

  return (
    <div className={`session-link-card ${session.status === 'live' ? 'slc-live' : ''}`}>
      {/* Header row */}
      <button
        className="slc-header"
        onClick={() => setOpen(o => !o)}
        id={`slc-toggle-${session.id}`}
        type="button"
      >
        <div className="slc-name-row">
          {session.status === 'live' ? (
            <span className="live-dot" style={{ flexShrink: 0 }} />
          ) : (
            <span className="slc-status-indicator" />
          )}
          <span className="slc-name">{session.name}</span>
        </div>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="slc-body">
          <LinkRow
            icon={Hash}
            label="Session Code"
            value={session.code}
            display={session.code}
            id={`copy-code-sidebar-${session.id}`}
            mono
          />

          {!votingHasStarted && (
            <LinkRow
              icon={UserCheck}
              label="Accreditation Link"
              value={accredUrl}
              display="/join"
              id={`copy-accred-sidebar-${session.id}`}
            />
          )}

          <LinkRow
            icon={Link2}
            label="Ballot Login Link"
            value={voteUrl}
            display={`/vote/${session.code}`}
            id={`copy-vote-sidebar-${session.id}`}
          />
        </div>
      )}
    </div>
  )
}

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
        <Icon size={12} className="slc-row-icon" />
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
        type="button"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  )
}
