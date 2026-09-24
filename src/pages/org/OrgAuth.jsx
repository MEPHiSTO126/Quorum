import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  Mail, ArrowRight, ArrowLeft, Building2,
  ShieldCheck, RefreshCw, CheckCircle2, Lock, Sun, Moon, Check
} from 'lucide-react'
import './OrgAuth.css'

export default function OrgAuth() {
  const [tab, setTab] = useState('signin') // 'signin' | 'signup'
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="auth-shell">
      {/* Top utility bar */}
      <header className="auth-topbar">
        <div className="auth-topbar-brand">
          <img src="/logo.png" alt="Quorum" className="auth-logo" />
          <span className="auth-platform-title">Quorum</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/join" className="btn btn-secondary btn-sm">
            Voter Accreditation <ArrowRight size={13} />
          </a>
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

      <div className="auth-main-grid">
        {/* Left Column: Institutional Credentials & Security Statement */}
        <aside className="auth-showcase">
          <div className="auth-showcase-content">
            <div className="civic-seal">
              <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
              <span>Certified Democratic Governance</span>
            </div>

            <h1 className="auth-headline font-serif">
              Democratic decision-making with verifiable integrity.
            </h1>

            <p className="auth-summary text-secondary">
              Quorum provides institutional-grade balloting for universities, labor unions, corporate boards, and civic bodies. Powered by cryptographic ballot decoupling to guarantee absolute voter anonymity.
            </p>

            <div className="auth-pillars">
              <div className="pillar-item">
                <div className="pillar-check"><Check size={13} /></div>
                <div>
                  <span className="pillar-title">Zero-Knowledge Voter Decoupling</span>
                  <p className="pillar-desc text-muted text-xs">Voter identity confirms eligibility, then disconnects permanently from the ballot token.</p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-check"><Check size={13} /></div>
                <div>
                  <span className="pillar-title">Auditable Cryptographic Receipts</span>
                  <p className="pillar-desc text-muted text-xs">Each elector receives a verifiable SHA-256 ballot receipt to audit tally inclusion.</p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-check"><Check size={13} /></div>
                <div>
                  <span className="pillar-title">Parliamentary & Roberts Rules Alignment</span>
                  <p className="pillar-desc text-muted text-xs">Built-in support for required quorum thresholds, abstentions, and runoff certifications.</p>
                </div>
              </div>
            </div>

            <div className="auth-compliance-footer">
              <span className="compliance-tag">TLS 1.3 AES-GCM</span>
              <span className="compliance-dot">·</span>
              <span className="compliance-tag">Immutable Audit Log</span>
              <span className="compliance-dot">·</span>
              <span className="compliance-tag">Independent Scrutineer Ready</span>
            </div>
          </div>
        </aside>

        {/* Right Column: Portal Terminal */}
        <main className="auth-card-wrapper">
          <div className="auth-card card">
            <div className="auth-card-header">
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
                  onClick={() => setTab('signin')}
                >
                  Administrator Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                  onClick={() => setTab('signup')}
                >
                  Register Organization
                </button>
              </div>
            </div>

            {tab === 'signin' ? <SignInFlow /> : <SignUpFlow />}
          </div>

          <div className="auth-terminal-footer">
            <Lock size={12} className="text-muted" />
            <span className="text-xs text-muted">
              Official Session Administrator Portal · 2FA Required
            </span>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   SIGN IN  —  Email → OTP
════════════════════════════════════════════════════════════ */
function SignInFlow() {
  const { requestOtp, verifyOtp, isLoading, error } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]   = useState('email') // 'email' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp]     = useState(['', '', '', '', '', ''])
  const [localError, setLocalError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const interval = setInterval(() => {
      setResendCooldown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCooldown])

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setLocalError('')
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setLocalError('Please provide a valid institutional email address.')
      return
    }
    const result = await requestOtp(email)
    if (result.exists) {
      setStep('otp')
      setResendCooldown(60)
    } else {
      setLocalError('No registered organization account corresponds to this email.')
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault()
    setLocalError('')
    const code = otp.join('')
    if (code.length < 6) { setLocalError('Enter the complete 6-digit authentication token.'); return }
    const result = await verifyOtp(email, code)
    if (result.ok) navigate('/admin/dashboard')
    else setLocalError(error || 'Authentication failed. Please verify your token.')
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setLocalError('')
    setOtp(['', '', '', '', '', ''])
    await requestOtp(email)
    // The ticker useEffect above owns the countdown — no second timer here.
    setResendCooldown(60)
  }

  return (
    <div className="auth-flow">
      {/* Stepper Breadcrumb */}
      <div className="auth-step-indicator">
        <span className={`step-pill ${step === 'email' ? 'active' : 'done'}`}>1. Organization Email</span>
        <span className="step-arrow">→</span>
        <span className={`step-pill ${step === 'otp' ? 'active' : ''}`}>2. One-Time Passcode</span>
      </div>

      {step === 'email' ? (
        <form className="auth-form" onSubmit={handleEmailSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="signin-email">
              Organization Administrator Email
            </label>
            <input
              id="signin-email"
              type="email"
              className={`form-input ${localError ? 'error' : ''}`}
              placeholder="e.g. governance@senate.ac.uk"
              value={email}
              onChange={e => { setEmail(e.target.value); setLocalError('') }}
              autoComplete="email"
              autoFocus
            />
            {localError && <span className="form-error">{localError}</span>}
          </div>

          <button
            type="submit"
            id="signin-send-otp"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner spinner-sm" /> : <Mail size={15} />}
            {isLoading ? 'Issuing Passcode…' : 'Authenticate with Passcode'}
          </button>

          <div className="auth-demo-callout">
            <span className="demo-label">Pre-seeded Institutional Demo:</span>
            <button
              type="button"
              className="demo-badge-btn"
              onClick={() => setEmail('admin@westfield.edu')}
            >
              admin@westfield.edu
            </button>
          </div>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleOtpSubmit}>
          <div className="auth-otp-meta">
            <span className="text-sm text-secondary">
              A 6-digit authentication token has been dispatched to:
            </span>
            <span className="mono text-brand text-sm fw-600">{email}</span>
          </div>

          <OtpInput value={otp} onChange={setOtp} hasError={Boolean(localError)} />

          {localError && <p className="form-error auth-error">{localError}</p>}

          <button
            type="submit"
            id="signin-verify-otp"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner spinner-sm" /> : <ShieldCheck size={15} />}
            {isLoading ? 'Verifying Credentials…' : 'Access Admin Dashboard'}
          </button>

          <div className="otp-footer">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setStep('email'); setOtp(['','','','','','']); setLocalError('') }}
            >
              <ArrowLeft size={13} /> Edit Email
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${resendCooldown > 0 ? 'disabled-look' : ''}`}
              onClick={handleResend}
              disabled={resendCooldown > 0 || isLoading}
              id="resend-otp"
            >
              <RefreshCw size={13} />
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
            </button>
          </div>

          <div className="auth-demo-callout">
            <span className="demo-label">Demo One-Time Code:</span>
            <code className="mono fw-600 text-brand">123456</code>
          </div>
        </form>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   SIGN UP  —  Org Details → OTP verify
════════════════════════════════════════════════════════════ */
function SignUpFlow() {
  const { registerOrg, verifyRegistration, isLoading, error } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('details')
  const [form, setForm] = useState({ name: '', email: '', description: '' })
  const [otp, setOtp]   = useState(['', '', '', '', '', ''])
  const [errors, setErrors]   = useState({})
  const [localError, setLocalError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const interval = setInterval(() => {
      setResendCooldown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [resendCooldown])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())        e.name        = 'Formal organization or institutional name is required.'
    if (!form.email.trim())       e.email       = 'A valid administrator contact email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid institutional email.'
    if (!form.description.trim()) e.description = 'Provide a brief summary of governance scope.'
    return e
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const result = await registerOrg(form.name, form.email, form.description)
    if (result.ok) {
      setStep('otp')
      setResendCooldown(60)
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault()
    setLocalError('')
    const code = otp.join('')
    if (code.length < 6) { setLocalError('Enter the complete 6-digit code.'); return }
    const result = await verifyRegistration(form.email, code)
    if (result.ok) navigate('/admin/dashboard')
    else setLocalError(error || 'Verification failed. Please check the code.')
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setLocalError('')
    setOtp(['', '', '', '', '', ''])
    await registerOrg(form.name, form.email, form.description)
    // The ticker useEffect above owns the countdown — no second timer here.
    setResendCooldown(60)
  }

  return (
    <div className="auth-flow">
      {step === 'details' ? (
        <form className="auth-form" onSubmit={handleDetailsSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="org-name">
              Organization or Body Name
            </label>
            <input
              id="org-name"
              type="text"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="e.g. Faculty Senate of Engineering"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              autoFocus
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="org-email">
              Chief Scrutineer / Administrator Email
            </label>
            <input
              id="org-email"
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="scrutineer@body.org"
              value={form.email}
              onChange={e => update('email', e.target.value)}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="org-desc">
              Governance Scope / Jurisdiction
            </label>
            <textarea
              id="org-desc"
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder="Specify voting membership scope (e.g. 450 tenured faculty members)…"
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={2}
            />
            {errors.description && <span className="form-error">{errors.description}</span>}
          </div>

          <button
            type="submit"
            id="signup-send-otp"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner spinner-sm" /> : <Building2 size={15} />}
            {isLoading ? 'Generating Charter…' : 'Establish Organization Workspace'}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleOtpSubmit}>
          <div className="auth-otp-meta">
            <span className="text-sm text-secondary">
              Verification token transmitted to:
            </span>
            <span className="mono text-brand text-sm fw-600">{form.email}</span>
          </div>

          <OtpInput value={otp} onChange={setOtp} hasError={Boolean(localError)} />

          {localError && <p className="form-error auth-error">{localError}</p>}

          <button
            type="submit"
            id="signup-verify-otp"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner spinner-sm" /> : <CheckCircle2 size={15} />}
            {isLoading ? 'Chartering Body…' : 'Certify & Enter Console'}
          </button>

          <div className="otp-footer">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setStep('details'); setOtp(['','','','','','']); setLocalError('') }}
            >
              <ArrowLeft size={13} /> Back to Details
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${resendCooldown > 0 ? 'disabled-look' : ''}`}
              onClick={handleResend}
              disabled={resendCooldown > 0 || isLoading}
              id="signup-resend-otp"
            >
              <RefreshCw size={13} />
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
            </button>
          </div>

          <div className="auth-demo-callout">
            <span className="demo-label">Demo Verification Token:</span>
            <code className="mono fw-600 text-brand">123456</code>
          </div>
        </form>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   OTP INPUT  —  6 individual tactile boxes
════════════════════════════════════════════════════════════ */
function OtpInput({ value, onChange, hasError }) {
  const refs = useRef([])

  function handleChange(i, e) {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[i] = char
    onChange(next)
    if (char && i < 5) refs.current[i + 1]?.focus()
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace') {
      if (!value[i] && i > 0) {
        const next = [...value]
        next[i - 1] = ''
        onChange(next)
        refs.current[i - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...value]
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    onChange(next)
    const lastFilled = Math.min(pasted.length, 5)
    refs.current[lastFilled]?.focus()
  }

  return (
    <div className="otp-input-row" onPaste={handlePaste}>
      {value.map((digit, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className={`otp-box ${hasError ? 'error' : ''} ${digit ? 'filled' : ''}`}
          value={digit}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          autoFocus={i === 0}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  )
}
