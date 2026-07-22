import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { Mail, Hash, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import './Accreditation.css'

export default function Accreditation() {
  const [params] = useSearchParams()
  const { getSessionByCode } = useSession()

  const [code, setCode]     = useState(params.get('code') || '')
  const [email, setEmail]   = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [notFound, setNotFound]   = useState(false)

  function validate() {
    const e = {}
    if (!code.trim())          e.code  = 'Session code is required.'
    if (!email.trim())         e.email = 'Email address is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address.'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setLoading(true)
    setNotFound(false)

    // Mock: check session exists
    await new Promise(r => setTimeout(r, 1000))
    const session = getSessionByCode(code.trim().toUpperCase())
    setLoading(false)

    if (!session) { setNotFound(true); return }
    if (session.status === 'ended') { setErrors({ code: 'This voting session has already ended.' }); return }

    setSubmitted(true)
  }

  if (submitted) {
    return <SuccessView email={email} code={code.toUpperCase()} />
  }

  return (
    <div className="accred-shell">
      <div className="accred-bg">
        <div className="accred-bg-orb orb-a" />
        <div className="accred-bg-orb orb-b" />
      </div>

      <div className="accred-container">
        {/* Brand */}
        <div className="accred-brand">
          <img src="/logo.png" alt="Quorum" className="accred-brand-logo" />
          <span className="accred-brand-name">Quorum</span>
        </div>

        <div className="accred-card">
          <div className="accred-card-header">
            <h1 className="accred-title">Voter Accreditation</h1>
            <p className="text-secondary text-sm">
              Enter your session code and email to register for this vote.
              You'll receive a one-time password by email when voting opens.
            </p>
          </div>

          <form className="accred-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="session-code">
                <Hash size={13} style={{display:'inline',marginRight:4}} />
                Session Code
              </label>
              <input
                id="session-code"
                type="text"
                className={`form-input mono ${errors.code ? 'error' : ''}`}
                placeholder="e.g. WSU-2025"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setErrors(er => ({ ...er, code: '' })); setNotFound(false) }}
                style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 16 }}
              />
              {errors.code  && <span className="form-error">{errors.code}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="voter-email">
                <Mail size={13} style={{display:'inline',marginRight:4}} />
                Your Email Address
              </label>
              <input
                id="voter-email"
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: '' })) }}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            {notFound && (
              <div className="accred-error-banner">
                <AlertCircle size={15} />
                <span>No session found with that code. Double-check and try again.</span>
              </div>
            )}

            <button
              type="submit"
              id="accred-submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
            >
              {loading ? <span className="spinner spinner-sm" /> : null}
              {loading ? 'Registering…' : 'Register to Vote'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="accred-card-footer text-xs text-muted">
            <span>Are you an organization admin?</span>
            <a href="/" className="text-brand"> Sign in here →</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function SuccessView({ email, code }) {
  return (
    <div className="accred-shell">
      <div className="accred-bg">
        <div className="accred-bg-orb orb-a" />
        <div className="accred-bg-orb orb-b" />
      </div>
      <div className="accred-container">
        <div className="accred-brand">
          <img src="/logo.png" alt="Quorum" className="accred-brand-logo" />
          <span className="accred-brand-name">Quorum</span>
        </div>
        <div className="accred-card accred-success">
          <div className="accred-success-icon">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="accred-success-title">You're registered!</h2>
          <p className="text-secondary text-sm" style={{textAlign:'center'}}>
            We've received your registration for session{' '}
            <span className="mono text-brand">{code}</span>.
          </p>
          <div className="accred-email-pill">
            <Mail size={14} />
            <span className="mono text-sm">{email}</span>
          </div>
          <p className="text-xs text-muted" style={{textAlign:'center',maxWidth:300}}>
            When voting opens, a one-time password will be sent to your email. Keep an eye on your inbox.
          </p>
        </div>
      </div>
    </div>
  )
}
