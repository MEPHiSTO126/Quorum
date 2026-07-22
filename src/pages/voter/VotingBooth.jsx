import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import {
  ChevronLeft, ChevronRight, Check, SkipForward,
  UserCircle2, AlertCircle, CheckCircle2, Clock
} from 'lucide-react'
import './VotingBooth.css'

export default function VotingBooth() {
  const { sessionCode } = useParams()
  const { state: routeState } = useLocation()
  const navigate = useNavigate()
  const { getSessionByCode } = useSession()

  const session = getSessionByCode(sessionCode)
  const voterEmail = routeState?.email || 'voter@example.com'

  const [posIndex, setPosIndex]   = useState(0)
  const [votes, setVotes]         = useState({})   // { posId: candidateId | 'skip' }
  const [phase, setPhase]         = useState('voting') // 'voting' | 'review' | 'done'
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft]   = useState(null)

  // Redirect to login if accessed directly
  useEffect(() => {
    if (!routeState?.email) navigate(`/vote/${sessionCode}/login`, { replace: true })
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!session) return
    function tick() {
      const remaining = new Date(session.endTime) - Date.now()
      setTimeLeft(remaining > 0 ? remaining : 0)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session])

  if (!session) {
    return (
      <div className="booth-shell">
        <div className="booth-error">
          <AlertCircle size={32} />
          <h2>Session not found</h2>
        </div>
      </div>
    )
  }

  const positions = session.positions
  const currentPos = positions[posIndex]
  const totalPos   = positions.length

  function selectCandidate(candidateId) {
    setVotes(v => ({ ...v, [currentPos.id]: candidateId }))
  }

  function skipPosition() {
    setVotes(v => ({ ...v, [currentPos.id]: 'skip' }))
    if (posIndex < totalPos - 1) setPosIndex(i => i + 1)
    else setPhase('review')
  }

  function nextPosition() {
    if (posIndex < totalPos - 1) setPosIndex(i => i + 1)
    else setPhase('review')
  }

  function prevPosition() {
    if (posIndex > 0) setPosIndex(i => i - 1)
  }

  async function submitVotes() {
    setSubmitting(true)
    // Mock: send votes to backend
    await new Promise(r => setTimeout(r, 1500))
    setSubmitting(false)
    setPhase('done')
  }

  function fmtTime(ms) {
    if (ms === null) return '--:--:--'
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':')
  }

  if (phase === 'done') {
    return <DoneScreen session={session} sessionCode={sessionCode} votes={votes} positions={positions} />
  }

  if (phase === 'review') {
    return (
      <div className="booth-shell">
        <BoothHeader session={session} email={voterEmail} timeLeft={fmtTime(timeLeft)} />
        <div className="booth-content">
          <ReviewPane
            positions={positions}
            votes={votes}
            onEdit={i => { setPosIndex(i); setPhase('voting') }}
            onSubmit={submitVotes}
            submitting={submitting}
          />
        </div>
      </div>
    )
  }

  const selected = votes[currentPos?.id]
  const progress = ((posIndex) / totalPos) * 100

  return (
    <div className="booth-shell">
      <BoothHeader session={session} email={voterEmail} timeLeft={fmtTime(timeLeft)} />

      {/* Progress bar */}
      <div className="booth-progress-track">
        <div className="booth-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="booth-content">
        <div className="booth-step-label">
          Position {posIndex + 1} of {totalPos}
        </div>

        <div className="booth-position-card">
          <h2 className="booth-pos-name">{currentPos.name}</h2>
          {currentPos.description && (
            <p className="booth-pos-desc text-secondary text-sm">{currentPos.description}</p>
          )}
        </div>

        <div className="candidates-vote-grid">
          {currentPos.candidates.map(cand => (
            <button
              key={cand.id}
              id={`vote-${cand.id}`}
              className={`candidate-vote-card ${selected === cand.id ? 'selected' : ''}`}
              onClick={() => selectCandidate(cand.id)}
            >
              <div className="cand-vote-photo">
                {cand.image || cand.imageUrl
                  ? <img src={cand.image || cand.imageUrl} alt={cand.name} className="cand-vote-img" />
                  : <UserCircle2 size={40} />
                }
              </div>
              <div className="cand-vote-info">
                <span className="cand-vote-name">{cand.name}</span>
                {cand.catchphrase && (
                  <span className="cand-vote-phrase text-sm text-secondary">"{cand.catchphrase}"</span>
                )}
              </div>
              <div className="cand-vote-check">
                {selected === cand.id && <Check size={16} />}
              </div>
            </button>
          ))}
        </div>

        <div className="booth-nav">
          <button
            className="btn btn-secondary"
            onClick={prevPosition}
            disabled={posIndex === 0}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <button
            className="btn btn-ghost text-muted"
            onClick={skipPosition}
            id={`skip-${currentPos.id}`}
          >
            <SkipForward size={15} /> Skip
          </button>

          <button
            className="btn btn-primary"
            onClick={nextPosition}
            disabled={!selected}
            id="booth-next"
          >
            {posIndex === totalPos - 1 ? 'Review' : 'Next'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Header ── */
function BoothHeader({ session, email, timeLeft }) {
  return (
    <header className="booth-header">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Quorum" className="booth-brand-logo" />
        <div>
          <div className="fw-600 text-sm">{session.name}</div>
          <div className="text-xs text-muted mono">{email}</div>
        </div>
      </div>
      <div className="booth-timer">
        <Clock size={13} />
        <span className="mono text-sm">{timeLeft}</span>
      </div>
    </header>
  )
}

/* ── Review ── */
function ReviewPane({ positions, votes, onEdit, onSubmit, submitting }) {
  const skipped = positions.filter(p => !votes[p.id] || votes[p.id] === 'skip').length
  return (
    <div className="review-pane">
      <h2 className="review-pane-title">Review Your Votes</h2>
      <p className="text-secondary text-sm">
        {skipped > 0
          ? `${skipped} position${skipped > 1 ? 's' : ''} will be submitted as undecided.`
          : 'All positions have a selection. Ready to submit!'}
      </p>

      <div className="review-votes-list">
        {positions.map((pos, i) => {
          const vote = votes[pos.id]
          const cand = pos.candidates.find(c => c.id === vote)
          const isSkip = !vote || vote === 'skip'
          return (
            <div key={pos.id} className="review-vote-row">
              <div className="review-vote-position">
                <span className="text-xs text-muted">{pos.name}</span>
                {!isSkip ? (
                  <div className="review-vote-choice">
                    <div className="review-vote-avatar">
                      {cand?.image || cand?.imageUrl
                        ? <img src={cand.image || cand.imageUrl} alt={cand.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        : <UserCircle2 size={16} />
                      }
                    </div>
                    <span className="fw-500 text-sm">{cand?.name}</span>
                  </div>
                ) : (
                  <span className="review-undecided">Undecided</span>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(i)} id={`edit-vote-${pos.id}`}>
                Edit
              </button>
            </div>
          )
        })}
      </div>

      <button
        className="btn btn-primary w-full btn-lg"
        onClick={onSubmit}
        disabled={submitting}
        id="submit-votes"
      >
        {submitting ? <span className="spinner spinner-sm" /> : <Check size={16} />}
        {submitting ? 'Submitting…' : 'Submit My Votes'}
      </button>
    </div>
  )
}

/* ── Done ── */
function DoneScreen({ session, sessionCode, votes, positions }) {
  const voted = positions.filter(p => votes[p.id] && votes[p.id] !== 'skip').length
  return (
    <div className="booth-shell">
      <div className="done-screen">
        <div className="done-icon"><CheckCircle2 size={44} /></div>
        <img src="/logo.png" alt="Quorum" className="booth-brand-logo" style={{margin:'0 auto'}} />
        <h2 className="done-title">Vote Submitted!</h2>
        <p className="text-secondary text-sm" style={{textAlign:'center',maxWidth:280}}>
          You voted on <strong>{voted}</strong> out of {positions.length} positions.
          Thank you for participating.
        </p>
        <a href={`/live/${sessionCode}`} className="btn btn-secondary">
          Watch Live Results →
        </a>
      </div>
    </div>
  )
}
