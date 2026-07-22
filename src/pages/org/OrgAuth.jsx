import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Mail, ArrowRight, ArrowLeft, Building2,
  ShieldCheck, RefreshCw, CheckCircle2
} from 'lucide-react'
import './OrgAuth.css'

export default function OrgAuth() {
  const [tab, setTab] = useState('signin') // 'signin' | 'signup'
  return (
    <div className="auth-shell">
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
      </div>

      <div className="auth-container">
        {/* Brand */}
        <div className="auth-brand">
          <img src="/logo.png" alt="Quorum" className="auth-brand-logo" />
          <h1 className="auth-brand-name">Quorum</h1>
          <p className="auth-brand-tagline">Democratic decisions, beautifully organized.</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => setTab('signin')}
            >Sign In</button>
            <button
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => setTab('signup')}
            >Create Account</button>
          </div>

          {tab === 'signin'
            ? <SignInFlow />
            : <SignUpFlow />
          }
        </div>

        {/* Voter link */}
        <div className="auth-voter-link">
          <span className="text-muted text-sm">Joining to vote?</span>
          <a href="/join" className="btn btn-ghost btn-sm">
            Voter Accreditation <ArrowRight size={14} />
          </a>
        </div>
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

  // Start resend countdown after OTP is sent
  useEffect(() => {
    if (step !== 'otp') return
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(c => { if (c <= 1) { clearInterval(interval); return 0 } return c - 1 })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setLocalError('')
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setLocalError('Enter a valid email address.')
      return
    }
    const result = await requestOtp(email)
    if (result.exists) {
      setStep('otp')
    } else {
      setLocalError('No organization account found for this email.')
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault()
    setLocalError('')
    const code = otp.join('')
    if (code.length < 6) { setLocalError('Enter the full 6-digit code.'); return }
    const result = await verifyOtp(email, code)
    if (result.ok) navigate('/admin/dashboard')
    else setLocalError(error || 'Incorrect code. Please try again.')
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setLocalError('')
    setOtp(['', '', '', '', '', ''])
    await requestOtp(email)
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(c => { if (c <= 1) { clearInterval(interval); return 0 } return c - 1 })
    }, 1000)
  }

  return (
    <div className="auth-flow">
      {/* Step indicator */}
      <div className="otp-step-track">
        <div className={`otp-step-dot ${step === 'email' || step === 'otp' ? 'done' : ''}`} />
        <div className="otp-step-line" />
        <div className={`otp-step-dot ${step === 'otp' ? 'active' : ''}`} />
      </div>

      {step === 'email' ? (
        <form className="auth-form" onSubmit={handleEmailSubmit}>
          <div className="auth-step-header">
            <Mail size={18} className="auth-step-icon" />
            <div>
              <h3 className="auth-step-title">Enter your email</h3>
              <p className="text-xs text-muted">We'll send a one-time code to sign in.</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signin-email">Organization Email</label>
            <input
              id="signin-email"
              type="email"
              className={`form-input ${localError ? 'error' : ''}`}
              placeholder="admin@yourorg.com"
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
            {isLoading ? 'Sending code…' : 'Send Code'}
          </button>

          <p className="auth-demo-hint text-xs text-muted">
            Demo: <span className="mono">admin@westfield.edu</span>
          </p>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleOtpSubmit}>
          <div className="auth-step-header">
            <ShieldCheck size={18} className="auth-step-icon" />
            <div>
              <h3 className="auth-step-title">Check your inbox</h3>
              <p className="text-xs text-muted">
                Code sent to <span className="mono text-brand">{email}</span>
              </p>
            </div>
          </div>

          <OtpInput value={otp} onChange={setOtp} hasError={Boolean(localError)} />

          {localError && <p className="form-error auth-error">{localError}</p>}

          <button
            type="submit"
            id="signin-verify-otp"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner spinner-sm" /> : <CheckCircle2 size={15} />}
            {isLoading ? 'Verifying…' : 'Verify & Sign In'}
          </button>

          <div className="otp-footer">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setStep('email'); setOtp(['','','','','','']); setLocalError('') }}
            >
              <ArrowLeft size={13} /> Change email
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${resendCooldown > 0 ? 'disabled-look' : ''}`}
              onClick={handleResend}
              disabled={resendCooldown > 0 || isLoading}
              id="resend-otp"
            >
              <RefreshCw size={13} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>

          <p className="auth-demo-hint text-xs text-muted">
            Demo code: <span className="mono">123456</span>
          </p>
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

  const [step, setStep] = useState('details') // 'details' | 'otp'
  const [form, setForm] = useState({ name: '', email: '', description: '' })
  const [otp, setOtp]   = useState(['', '', '', '', '', ''])
  const [errors, setErrors]   = useState({})
  const [localError, setLocalError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (step !== 'otp') return
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(c => { if (c <= 1) { clearInterval(interval); return 0 } return c - 1 })
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())        e.name        = 'Organization name is required.'
    if (!form.email.trim())       e.email       = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
    if (!form.description.trim()) e.description = 'A short description is required.'
    return e
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const result = await registerOrg(form.name, form.email, form.description)
    if (result.ok) setStep('otp')
  }

  async function handleOtpSubmit(e) {
    e.preventDefault()
    setLocalError('')
    const code = otp.join('')
    if (code.length < 6) { setLocalError('Enter the full 6-digit code.'); return }
    const result = await verifyRegistration(form.email, code)
    if (result.ok) navigate('/admin/dashboard')
    else setLocalError(error || 'Incorrect code. Please try again.')
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setLocalError('')
    setOtp(['', '', '', '', '', ''])
    await registerOrg(form.name, form.email, form.description)
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(c => { if (c <= 1) { clearInterval(interval); return 0 } return c - 1 })
    }, 1000)
  }

  return (
    <div className="auth-flow">
      <div className="otp-step-track">
        <div className={`otp-step-dot ${step === 'details' || step === 'otp' ? 'done' : ''}`} />
        <div className="otp-step-line" />
        <div className={`otp-step-dot ${step === 'otp' ? 'active' : ''}`} />
      </div>

      {step === 'details' ? (
        <form className="auth-form" onSubmit={handleDetailsSubmit}>
          <div className="auth-step-header">
            <Building2 size={18} className="auth-step-icon" />
            <div>
              <h3 className="auth-step-title">Organization details</h3>
              <p className="text-xs text-muted">We'll send a verification code to your email.</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="org-name">Organization Name *</label>
            <input
              id="org-name"
              type="text"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="e.g. Westfield Student Union"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              autoFocus
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="org-email">Admin Email *</label>
            <input
              id="org-email"
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="admin@yourorg.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="org-desc">Short Description *</label>
            <textarea
              id="org-desc"
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder="Describe your organization in a sentence or two…"
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
            {isLoading ? <span className="spinner spinner-sm" /> : <Mail size={15} />}
            {isLoading ? 'Sending code…' : 'Continue & Send Code'}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleOtpSubmit}>
          <div className="auth-step-header">
            <ShieldCheck size={18} className="auth-step-icon" />
            <div>
              <h3 className="auth-step-title">Verify your email</h3>
              <p className="text-xs text-muted">
                Code sent to <span className="mono text-brand">{form.email}</span>
              </p>
            </div>
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
            {isLoading ? 'Creating account…' : 'Verify & Create Account'}
          </button>

          <div className="otp-footer">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setStep('details'); setOtp(['','','','','','']); setLocalError('') }}
            >
              <ArrowLeft size={13} /> Back
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${resendCooldown > 0 ? 'disabled-look' : ''}`}
              onClick={handleResend}
              disabled={resendCooldown > 0 || isLoading}
              id="signup-resend-otp"
            >
              <RefreshCw size={13} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>

          <p className="auth-demo-hint text-xs text-muted">
            Demo code: <span className="mono">123456</span>
          </p>
        </form>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   OTP INPUT  —  6 individual boxes
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
