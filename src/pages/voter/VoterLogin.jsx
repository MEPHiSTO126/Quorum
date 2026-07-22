import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { Mail, Key, ArrowRight, AlertCircle, Clock } from 'lucide-react'
import './VoterLogin.css'

export default function VoterLogin() {
  const { sessionCode } = useParams()
  const navigate = useNavigate()
  const { getSessionByCode } = useSession()

  const session = getSessionByCode(sessionCode)

  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  if (!session) {
    return (
      <div className="vlogin-shell">
        <div className="vlogin-card">
          <AlertCircle size={32} style={{color:'var(--danger)'}} />
          <h2>Session not found</h2>
          <p className="text-secondary text-sm">The session code <span className="mono">{sessionCode}</span> doesn't exist.</p>
          <a href="/join" className="btn btn-primary">Try Accreditation</a>
        </div>
      </div>
    )
  }

  if (session.status === 'scheduled') {
    const opens = new Date(session.startTime).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
    return (
      <div className="vlogin-shell">
        <div className="vlogin-card">
          <div className="vlogin-brand">
            <img src="/logo.png" alt="Quorum" className="vlogin-brand-logo" />
            <span className="vlogin-brand-name">Quorum</span>
          </div>
          <div className="vlogin-waiting">
            <Clock size={36} style={{color:'var(--warning)'}} />
            <h2>{session.name}</h2>
            <p className="text-secondary text-sm" style={{textAlign:'center'}}>
              Voting hasn't started yet. Come back on <strong>{opens}</strong>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (session.status === 'ended') {
    return (
      <div className="vlogin-shell">
        <div className="vlogin-card">
          <AlertCircle size={32} style={{color:'var(--text-muted)'}} />
          <h2>Voting has ended</h2>
          <p className="text-secondary text-sm">This session closed on {new Date(session.endTime).toLocaleDateString()}.</p>
          <a href={`/live/${sessionCode}`} className="btn btn-secondary">View Results</a>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = {}
    if (!email.trim()) err.email = 'Email is required.'
    if (!password.trim()) err.password = 'Password is required.'
    if (Object.keys(err).length) { setErrors(err); return }

    setLoading(true)
    // Mock: any valid email + password "vote123" works
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)

    if (password === 'vote123') {
      navigate(`/vote/${sessionCode}`, { state: { email } })
    } else {
      setErrors({ password: 'Invalid password. Check your email. (Demo: vote123)' })
    }
  }

  return (
    <div className="vlogin-shell">
      <div className="vlogin-bg-orb" />
      <div className="vlogin-card">
        <div className="vlogin-brand">
          <img src="/logo.png" alt="Quorum" className="vlogin-brand-logo" />
          <span className="vlogin-brand-name">quorum</span>
        </div>

        <div className="vlogin-session-info">
          <div className="live-dot" />
          <span className="fw-600 text-sm">{session.name}</span>
        </div>

        <div className="vlogin-header">
          <h1 className="vlogin-title">Voter Sign In</h1>
          <p className="text-secondary text-sm">
            Use the one-time password sent to your email.
          </p>
        </div>

        <form className="vlogin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="v-email">
              <Mail size={13} style={{display:'inline',marginRight:4}} />
              Email Address
            </label>
            <input
              id="v-email"
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="The email you registered with"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(er => ({...er,email:''})) }}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="v-password">
              <Key size={13} style={{display:'inline',marginRight:4}} />
              One-Time Password
            </label>
            <input
              id="v-password"
              type="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="From your email"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(er => ({...er,password:''})) }}
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
            {loading ? 'Verifying…' : 'Enter Voting Booth'}
            {!loading && <ArrowRight size={16} />}
          </button>

          <p className="text-xs text-muted" style={{textAlign:'center'}}>
            Demo password: <span className="mono">vote123</span>
          </p>
        </form>
      </div>
    </div>
  )
}
