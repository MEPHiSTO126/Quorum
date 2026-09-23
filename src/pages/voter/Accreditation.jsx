import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { useTheme } from '../../context/ThemeContext'
import {
  Mail, Hash, ArrowRight, CheckCircle2, AlertCircle,
  ShieldCheck, Lock, Sun, Moon, UserCheck, LogIn,
  Search
} from 'lucide-react'
import './Accreditation.css'

/* ── Simple Toast ──────────────────────────────────────────── */
function Toast({ message, type = 'error', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className={`voter-toast voter-toast--${type}`} role="alert">
      {type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      <span>{message}</span>
    </div>
  )
}

/* ── Topbar (shared between views) ────────────────────────── */
function VoterTopbar({ subtitle = 'Elector Portal' }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className="voter-topbar">
      <div className="voter-topbar-brand">
        <img src="/logo.png" alt="Quorum" className="voter-logo" />
        <span className="voter-brand-title">
          Quorum <span className="text-muted text-xs font-mono">{subtitle}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
          type="button"
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>
    </header>
  )
}

/* ── Tab selector ──────────────────────────────────────────── */
const TABS = [
  { id: 'accreditation', label: 'Accreditation', icon: UserCheck },
  { id: 'join',          label: 'Join to Vote',  icon: LogIn },
]

export default function Accreditation() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const { getSessionByCode, accreditVoter } = useSession()

  const [activeTab, setActiveTab] = useState(params.get('tab') === 'join' ? 'join' : 'accreditation')
  const [toast, setToast]         = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submittedData, setSubmittedData] = useState(null)

  // Accreditation tab state
  const [code, setCode]   = useState(params.get('code') || '')
  const [email, setEmail] = useState('')
  const [aErrors, setAErrors] = useState({})
  const [aLoading, setALoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Resolve session preview as code is typed (derived, no side effects)
  const sessionPreview = useMemo(() => {
    if (code.trim().length >= 4) {
      return getSessionByCode(code.trim().toUpperCase()) || null
    }
    return null
  }, [code, getSessionByCode])

  // Join to Vote tab state
  const [joinCode, setJoinCode]   = useState(params.get('code') || '')
  const [joinEmail, setJoinEmail] = useState('')
  const [jErrors, setJErrors]     = useState({})
  const [jLoading, setJLoading]   = useState(false)

  function validateAccred() {
    const e = {}
    if (!code.trim())  e.code  = 'Official session code is required.'
    if (!email.trim()) e.email = 'Elector email address is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Please provide a valid email format.'
    return e
  }

  async function handleAccredSubmit(ev) {
    ev.preventDefault()
    const e = validateAccred()
    if (Object.keys(e).length) { setAErrors(e); return }

    setALoading(true)
    setNotFound(false)

    const session = getSessionByCode(code.trim().toUpperCase())
    if (!session) {
      setALoading(false)
      setNotFound(true)
      return
    }

    // Block accreditation if voting has started
    if (session.status === 'live') {
      setALoading(false)
      setToast({ message: 'Accreditation is closed — this session is currently live. Contact your administrator.', type: 'error' })
      return
    }
    if (session.status === 'ended') {
      setALoading(false)
      setAErrors({ code: 'This electoral session has concluded. Accreditation is closed.' })
      return
    }

    const result = await accreditVoter(session.id, email)
    setALoading(false)

    if (!result.ok) {
      setToast({ message: result.error, type: 'error' })
      return
    }

    setSubmittedData({ email, code: code.trim().toUpperCase(), session })
    setSubmitted(true)
  }

  function validateJoin() {
    const e = {}
    if (!joinCode.trim())  e.code  = 'Please enter the session code.'
    if (!joinEmail.trim()) e.email = 'Please enter your accredited email.'
    else if (!/\S+@\S+\.\S+/.test(joinEmail)) e.email = 'Please provide a valid email format.'
    return e
  }

  async function handleJoinSubmit(ev) {
    ev.preventDefault()
    const e = validateJoin()
    if (Object.keys(e).length) { setJErrors(e); return }

    setJLoading(true)
    await new Promise(r => setTimeout(r, 600))
    setJLoading(false)

    navigate(`/vote/${joinCode.trim().toUpperCase()}/login`, { state: { email: joinEmail } })
  }

  if (submitted && submittedData) {
    return <SuccessView email={submittedData.email} code={submittedData.code} session={submittedData.session} />
  }

  return (
    <div className="accred-shell">
      <VoterTopbar subtitle="Elector Portal" />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <main className="accred-container">
        <div className="accred-card card">

          {/* Tab Switcher */}
          <div className="voter-tab-bar">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`voter-tab-btn ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Accreditation Tab ── */}
          {activeTab === 'accreditation' && (
            <>
              <div className="accred-card-header">
                <div className="civic-seal" style={{ marginBottom: 6 }}>
                  <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
                  <span>Voter Accreditation System</span>
                </div>
                <h1 className="accred-title font-serif">Accreditation of Eligible Electors</h1>
                <p className="text-secondary text-sm">
                  Enter your session code and email to certify voter eligibility on the official roster.
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="privacy-guarantee-box">
                <Lock size={15} className="privacy-icon" />
                <div className="privacy-text">
                  <strong className="privacy-title">Secret Ballot Guarantee: </strong>
                  Your email verifies eligibility only. Once authenticated, your ballot is cryptographically randomised — your vote is never linked to your identity.
                </div>
              </div>

              <form className="accred-form" onSubmit={handleAccredSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="session-code">
                    <Hash size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Official Session Code
                  </label>
                  <div className="code-input-wrapper">
                    <input
                      id="session-code"
                      type="text"
                      className={`form-input mono ${aErrors.code ? 'error' : ''}`}
                      placeholder="e.g. ABC-1234"
                      value={code}
                      onChange={e => {
                        setCode(e.target.value.toUpperCase())
                        setAErrors(er => ({ ...er, code: '' }))
                        setNotFound(false)
                      }}
                      style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 15 }}
                    />
                    {sessionPreview && (
                      <div className="session-preview-pill">
                        <Search size={11} />
                        <span>{sessionPreview.name}</span>
                        <span className={`badge-inline badge-${sessionPreview.status}`}>{sessionPreview.status}</span>
                      </div>
                    )}
                  </div>
                  {aErrors.code && <span className="form-error">{aErrors.code}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="voter-email">
                    <Mail size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Elector Email Address
                  </label>
                  <input
                    id="voter-email"
                    type="email"
                    className={`form-input ${aErrors.email ? 'error' : ''}`}
                    placeholder="e.g. elector@institution.ac.uk"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setAErrors(er => ({ ...er, email: '' })) }}
                  />
                  {aErrors.email && <span className="form-error">{aErrors.email}</span>}
                </div>

                {notFound && (
                  <div className="accred-error-banner">
                    <AlertCircle size={15} />
                    <span>No registered session found with code <strong>{code}</strong>. Verify with your organisation.</span>
                  </div>
                )}

                <button
                  type="submit"
                  id="accred-submit"
                  className="btn btn-primary w-full btn-lg"
                  disabled={aLoading}
                >
                  {aLoading ? <span className="spinner spinner-sm" /> : null}
                  {aLoading ? 'Validating Roster…' : 'Accredit Elector'}
                  {!aLoading && <ArrowRight size={15} />}
                </button>
              </form>
            </>
          )}

          {/* ── Join to Vote Tab ── */}
          {activeTab === 'join' && (
            <>
              <div className="accred-card-header">
                <div className="civic-seal" style={{ marginBottom: 6 }}>
                  <LogIn size={14} style={{ color: 'var(--brand-500)' }} />
                  <span>Ballot Access Portal</span>
                </div>
                <h1 className="accred-title font-serif">Join an Active Voting Session</h1>
                <p className="text-secondary text-sm">
                  Already accredited? Enter your session code to proceed directly to the ballot login.
                </p>
              </div>

              <form className="accred-form" onSubmit={handleJoinSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="join-code">
                    <Hash size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Session Code
                  </label>
                  <input
                    id="join-code"
                    type="text"
                    className={`form-input mono ${jErrors.code ? 'error' : ''}`}
                    placeholder="e.g. ABC-1234"
                    value={joinCode}
                    onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJErrors(er => ({ ...er, code: '' })) }}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 15 }}
                  />
                  {jErrors.code && <span className="form-error">{jErrors.code}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="join-email">
                    <Mail size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Accredited Email Address
                  </label>
                  <input
                    id="join-email"
                    type="email"
                    className={`form-input ${jErrors.email ? 'error' : ''}`}
                    placeholder="e.g. elector@institution.ac.uk"
                    value={joinEmail}
                    onChange={e => { setJoinEmail(e.target.value); setJErrors(er => ({ ...er, email: '' })) }}
                  />
                  {jErrors.email && <span className="form-error">{jErrors.email}</span>}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full btn-lg"
                  disabled={jLoading}
                >
                  {jLoading ? <span className="spinner spinner-sm" /> : null}
                  {jLoading ? 'Looking up session…' : 'Proceed to Ballot Login'}
                  {!jLoading && <ArrowRight size={15} />}
                </button>
              </form>

              <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
                Not yet accredited?{' '}
                <button
                  type="button"
                  className="text-brand fw-600"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}
                  onClick={() => setActiveTab('accreditation')}
                >
                  Register your email →
                </button>
              </p>
            </>
          )}

          <div className="accred-card-footer text-xs text-muted">
            <span>Official session administrator?</span>
            <Link to="/" className="text-brand fw-600"> Organisation Console →</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── Success Screen ────────────────────────────────────────── */
function SuccessView({ email, code, session }) {
  return (
    <div className="accred-shell">
      <VoterTopbar subtitle="Elector Portal" />
      <main className="accred-container">
        <div className="accred-card card accred-success">
          <div className="accred-success-icon">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="accred-success-title font-serif">Elector Successfully Accredited</h2>
          <p className="text-secondary text-sm" style={{ textAlign: 'center', maxWidth: 360 }}>
            Your credentials have been certified for{' '}
            <strong>{session?.name}</strong>{' '}
            <span className="mono fw-600 text-brand">(#{code})</span>.
          </p>

          <div className="accred-email-pill">
            <Mail size={14} className="text-muted" />
            <span className="mono text-sm fw-600">{email}</span>
          </div>

          <div className="accred-instructions-box">
            <p className="text-xs text-secondary">
              When polls open, an encrypted single-use voting passcode will be dispatched to your inbox. Return with that token to cast your ballot.
            </p>
          </div>

          <div className="flex gap-3 w-full" style={{ marginTop: 8 }}>
            <Link to={`/vote/${code}/login`} className="btn btn-primary w-full">
              Proceed to Ballot Login <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
