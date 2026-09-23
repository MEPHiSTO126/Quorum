import { useState } from 'react'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { voterService } from '../../services/voterService.js'
import { useTheme } from '../../context/ThemeContext'
import {
  Mail, Key, ArrowRight, AlertCircle, Clock,
  Lock, Sun, Moon, CheckCircle2, BarChart2
} from 'lucide-react'
import './VoterLogin.css'

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ message, type = 'error' }) {
  return (
    <div className={`voter-toast voter-toast--${type}`} role="alert" style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
      {type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      <span>{message}</span>
    </div>
  )
}

/* ── Topbar ─────────────────────────────────────────────────── */
function VoterTopbar({ subtitle }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className="voter-topbar">
      <div className="voter-topbar-brand">
        <img src="/logo.png" alt="Quorum" className="voter-logo" />
        <span className="voter-brand-title">
          Quorum <span className="text-muted text-xs font-mono">{subtitle}</span>
        </span>
      </div>
      <button
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
        type="button"
      >
        {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
      </button>
    </header>
  )
}

export default function VoterLogin() {
  const { sessionCode } = useParams()
  const navigate        = useNavigate()
  const location        = useLocation()
  const { getSessionByCode, isVoterAccredited } = useSession()

  const session = getSessionByCode(sessionCode)

  // Pre-fill email from "Join to Vote" redirect
  const [email, setEmail]       = useState(location.state?.email || '')
  const [password, setPassword] = useState('')
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [toast, setToast]       = useState(null)

  // ── Session not found ──────────────────────────────────────
  if (!session) {
    return (
      <div className="vlogin-shell">
        <VoterTopbar subtitle="Ballot Login" />
        <main className="vlogin-container">
          <div className="vlogin-card card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <AlertCircle size={36} style={{ color: 'var(--danger)' }} />
            <h2 className="font-serif text-xl">Session Not Found</h2>
            <p className="text-secondary text-sm">The session code <span className="mono fw-600">#{sessionCode}</span> does not match any registered election.</p>
            <Link to="/join" className="btn btn-primary" style={{ marginTop: 8 }}>Try Accreditation</Link>
          </div>
        </main>
      </div>
    )
  }

  // ── Session scheduled (polls not yet open) ─────────────────
  if (session.status === 'scheduled') {
    const opens = new Date(session.startTime).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
    return (
      <div className="vlogin-shell">
        <VoterTopbar subtitle="Ballot Access" />
        <main className="vlogin-container">
          <div className="vlogin-card card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="scheduled-clock-icon">
              <Clock size={32} style={{ color: 'var(--warning)' }} />
            </div>
            <span className="badge badge-scheduled">Polls Not Yet Open</span>
            <h2 className="font-serif text-xl">{session.name}</h2>
            <p className="text-secondary text-sm" style={{ maxWidth: 360 }}>
              Voting has not commenced. Accredited electors will receive single-use authentication codes when polls open on <strong>{opens}</strong>.
            </p>
            <Link to={`/join?code=${sessionCode}`} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
              Verify Your Accreditation
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // ── Session ended — redirect to results ────────────────────
  if (session.status === 'ended') {
    return (
      <div className="vlogin-shell">
        <VoterTopbar subtitle="Archive" />
        <main className="vlogin-container">
          <div className="vlogin-card card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <BarChart2 size={36} style={{ color: 'var(--text-muted)' }} />
            <h2 className="font-serif text-xl">Balloting Has Concluded</h2>
            <p className="text-secondary text-sm">
              This session closed on {new Date(session.endTime).toLocaleDateString()}. Ballots are sealed.
            </p>
            <Link to={`/results/${sessionCode}`} className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
              View Official Results <ArrowRight size={14} />
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // ── Sign-in logic ──────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const err = {}
    if (!email.trim())    err.email    = 'Elector email is required.'
    if (!password.trim()) err.password = 'Authentication token is required.'
    if (Object.keys(err).length) { setErrors(err); return }

    setLoading(true)
    try {
      // Step 1 — check accreditation
      const accredited = await isVoterAccredited(session.id, email)
      if (!accredited) {
        setLoading(false)
        setToast({ message: 'You need to be accredited before voting. Redirecting you to accreditation…', type: 'error' })
        setTimeout(() => {
          navigate(`/join?code=${sessionCode}&tab=accreditation`)
        }, 2800)
        return
      }

      // Step 2 — validate token via service (issues a single-use voterToken)
      let voterToken
      try {
        const login = await voterService.loginVoter(sessionCode, email.trim(), password.trim())
        voterToken = login.voterToken
      } catch (loginErr) {
        setLoading(false)
        setErrors({ password: loginErr.message || 'Authentication token not recognised. (Demo token: vote123)' })
        return
      }

      setLoading(false)

      // Step 3 — persist voter session to sessionStorage
      const storageKey = `quorum_voter_session_${sessionCode}`
      sessionStorage.setItem(storageKey, JSON.stringify({
        email: email.toLowerCase().trim(),
        voterToken,
        posIndex: 0,
        votes: {},
        phase: 'voting',
      }))

      // Step 4 — route to voting booth
      navigate(`/vote/${sessionCode}`, { state: { email }, replace: true })
    } catch (err) {
      setLoading(false)
      setErrors({ password: err.message || 'Login failed. Please try again.' })
    }
  }

  return (
    <div className="vlogin-shell">
      <VoterTopbar subtitle="Elector Access" />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <main className="vlogin-container">
        <div className="vlogin-card card">
          <div className="vlogin-header">
            <div className="session-live-pill">
              <span className="live-dot" />
              <span className="text-xs fw-600 font-mono">POLLS OPEN · #{sessionCode}</span>
            </div>
            <h1 className="vlogin-title font-serif">{session.name}</h1>
            <p className="text-secondary text-sm">
              Enter your accredited email and the single-use token dispatched to your inbox.
            </p>
          </div>

          <div className="privacy-guarantee-box">
            <Lock size={14} className="privacy-icon" />
            <span className="text-xs text-secondary">
              Single-use authorisation token ensures that once your ballot is cast, it is permanently detached from your identity and cannot be amended.
            </span>
          </div>

          <form className="vlogin-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="v-email">
                <Mail size={13} style={{ display: 'inline', marginRight: 4 }} />
                Accredited Email Address
              </label>
              <input
                id="v-email"
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="e.g. elector@institution.ac.uk"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: '' })) }}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="v-password">
                <Key size={13} style={{ display: 'inline', marginRight: 4 }} />
                Single-Use Ballot Token
              </label>
              <input
                id="v-password"
                type="password"
                className={`form-input mono ${errors.password ? 'error' : ''}`}
                placeholder="Single-use token"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: '' })) }}
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              id="voter-login-submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
            >
              {loading ? <span className="spinner spinner-sm" /> : null}
              {loading ? 'Validating Token…' : 'Enter Secret Voting Booth'}
              {!loading && <ArrowRight size={15} />}
            </button>

            <div className="vlogin-demo-helper">
              <span className="text-xs text-muted">Demo — Token:</span>
              <code className="mono text-xs fw-600 text-brand">vote123</code>
              <span className="text-xs text-muted">· Pre-accredited email:</span>
              <code className="mono text-xs fw-600 text-brand">voter@demo.com</code>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}