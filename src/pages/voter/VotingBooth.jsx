import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { useTheme } from '../../context/ThemeContext'
import {
  ChevronLeft, ChevronRight, Check, SkipForward,
  UserCircle2, AlertCircle, CheckCircle2, Clock,
  ShieldCheck, Printer, Copy, Lock, Sun, Moon
} from 'lucide-react'
import './VotingBooth.css'

const STORAGE_KEY = (sessionCode) => `quorum_voter_session_${sessionCode}`

export default function VotingBooth() {
  const { sessionCode } = useParams()
  const { state: routeState } = useLocation()
  const navigate = useNavigate()
  const { getSessionByCode, castBallot } = useSession()
  const { theme, toggleTheme } = useTheme()

  const session = getSessionByCode(sessionCode)

  function readStored() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY(sessionCode))
      if (stored) return JSON.parse(stored)
    } catch { /* corrupted voter session — start fresh */ }
    return null
  }

  const storedSnapshot = readStored()
  const voterEmail = routeState?.email || storedSnapshot?.email || null

  // Session storage persistence (restores across F5 even when routeState is lost)
  const [posIndex, setPosIndex]   = useState(() => {
    if (storedSnapshot && (!routeState?.email || storedSnapshot.email === routeState.email)) {
      return storedSnapshot.posIndex || 0
    }
    return 0
  })
  const [votes, setVotes]         = useState(() => {
    if (storedSnapshot && (!routeState?.email || storedSnapshot.email === routeState.email)) {
      return storedSnapshot.votes || {}
    }
    return {}
  })
  const [phase, setPhase]         = useState(() => {
    if (storedSnapshot && (!routeState?.email || storedSnapshot.email === routeState.email)) {
      return storedSnapshot.phase || 'voting'
    }
    return 'voting'
  })
  const [voterToken] = useState(() => {
    if (storedSnapshot && (!routeState?.email || storedSnapshot.email === routeState.email)) {
      return storedSnapshot.voterToken || null
    }
    return null
  })
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft]   = useState(null)
  const [receipt, setReceipt]     = useState(null)

  // Persist state to sessionStorage
  const persistState = useCallback(() => {
    if (!voterEmail) return
    const state = { email: voterEmail, posIndex, votes, phase, voterToken }
    sessionStorage.setItem(STORAGE_KEY(sessionCode), JSON.stringify(state))
  }, [sessionCode, voterEmail, posIndex, votes, phase, voterToken])

  useEffect(() => { persistState() }, [persistState])

  // Validate session and redirect if needed
  useEffect(() => {
    if (!voterEmail && phase === 'voting') {
      navigate(`/vote/${sessionCode}/login`, { replace: true })
    }
  }, [navigate, voterEmail, phase, sessionCode])

  // Timer countdown
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

  const positions = session?.positions || []
  const currentPos = positions[posIndex]
  const totalPos   = positions.length

  function selectCandidate(candidateId) {
    if (!currentPos) return
    setVotes(v => ({ ...v, [currentPos.id]: candidateId }))
  }

  function skipPosition() {
    if (!currentPos) return
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

  // Keyboard accessibility
  useEffect(() => {
    if (phase !== 'voting' || !currentPos) return

    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      const num = parseInt(e.key, 10)
      if (!isNaN(num) && num >= 1 && num <= currentPos.candidates.length) {
        selectCandidate(currentPos.candidates[num - 1].id)
      } else if (e.key === 'Enter' && votes[currentPos.id]) {
        nextPosition()
      } else if (e.key === 'ArrowLeft' && posIndex > 0) {
        prevPosition()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyboard shortcuts intentionally track render-scoped handlers
  }, [phase, currentPos, votes, posIndex])

  if (!session) {
    return (
      <div className="booth-shell">
        <div className="booth-error card">
          <AlertCircle size={32} style={{ color: 'var(--danger)' }} />
          <h2 className="font-serif text-xl">Ballot Session Not Found</h2>
          <p className="text-secondary text-sm">This voting session does not exist or has been removed.</p>
        </div>
      </div>
    )
  }

  const effectiveEmail = voterEmail || ''

  async function submitVotes() {
    if (!voterToken) {
      alert('Missing voter session token. Please log in again.')
      navigate(`/vote/${sessionCode}/login`, { replace: true })
      return
    }

    setSubmitting(true)
    try {
      const result = await castBallot(sessionCode, votes, voterToken)
      if (result.ok && result.receipt) {
        setReceipt(result.receipt)
        setPhase('done')
        // Clear sessionStorage on successful submission to prevent double-vote
        sessionStorage.removeItem(STORAGE_KEY(sessionCode))
      } else {
        throw new Error(result.error || 'Failed to cast ballot')
      }
    } catch (err) {
      alert(err.message || 'Failed to cast ballot. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function fmtTime(ms) {
    if (ms === null) return '--:--:--'
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':')
  }

  if (phase === 'done' && receipt) {
    return (
      <DoneScreen
        session={session}
        sessionCode={sessionCode}
        votes={votes}
        positions={positions}
        receipt={receipt}
      />
    )
  }

  if (phase === 'review') {
    return (
      <div className="booth-shell">
        <BoothHeader
          session={session}
          email={effectiveEmail}
          timeLeft={fmtTime(timeLeft)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
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
  const progress = totalPos > 0 ? ((posIndex + 1) / totalPos) * 100 : 0

  return (
    <div className="booth-shell">
      <BoothHeader
        session={session}
        email={effectiveEmail}
        timeLeft={fmtTime(timeLeft)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Progress Track */}
      <div className="booth-progress-bar-container">
        <div className="booth-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="booth-content">
        <div className="booth-meta-row">
          <span className="booth-step-label font-mono">
            Measure {posIndex + 1} of {totalPos}
          </span>
          <span className="booth-keyboard-hint text-xs text-muted">
            Press [1-{currentPos?.candidates.length || 0}] to select · [Enter] to continue
          </span>
        </div>

        <div className="booth-position-card card">
          <div className="civic-seal" style={{ marginBottom: 6 }}>
            <ShieldCheck size={13} style={{ color: 'var(--brand-500)' }} />
            <span>Official Ballot Question</span>
          </div>
          <h1 className="booth-pos-name font-serif">{currentPos?.name}</h1>
          {currentPos?.description && (
            <p className="booth-pos-desc text-secondary text-sm">{currentPos.description}</p>
          )}
        </div>

        {/* Candidate / Options Slate */}
        <div className="candidates-vote-grid" role="radiogroup" aria-label={currentPos?.name}>
          {currentPos?.candidates.map((cand, idx) => {
            const isSelected = selected === cand.id
            return (
              <div
                key={cand.id}
                id={`vote-${cand.id}`}
                className={`candidate-ballot-item ${isSelected ? 'selected' : ''}`}
                onClick={() => selectCandidate(cand.id)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') selectCandidate(cand.id) }}
              >
                {/* Ballot Oval */}
                <div className="ballot-oval">
                  {isSelected && <div className="ballot-oval-fill" />}
                </div>

                <span className="cand-key-shortcut font-mono text-xs text-muted">[{idx + 1}]</span>

                <div className="cand-vote-photo">
                  {cand.image || cand.imageUrl
                    ? <img src={cand.image || cand.imageUrl} alt={cand.name} className="cand-vote-img" />
                    : <UserCircle2 size={24} className="text-muted" />
                  }
                </div>

                <div className="cand-vote-info">
                  <span className="cand-vote-name fw-600">{cand.name}</span>
                  {cand.catchphrase && (
                    <span className="cand-vote-phrase text-xs text-secondary">"{cand.catchphrase}"</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Navigation & Controls */}
        <div className="booth-nav">
          <button
            className="btn btn-secondary"
            onClick={prevPosition}
            disabled={posIndex === 0}
            type="button"
          >
            <ChevronLeft size={15} /> Previous
          </button>

          <button
            className="btn btn-ghost text-muted"
            onClick={skipPosition}
            id={`skip-${currentPos?.id}`}
            type="button"
          >
            <SkipForward size={14} /> Abstain / Skip
          </button>

          <button
            className="btn btn-primary"
            onClick={nextPosition}
            disabled={!selected}
            id="booth-next"
            type="button"
          >
            {posIndex === totalPos - 1 ? 'Review Official Ballot' : 'Next Measure'}
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Header ── */
function BoothHeader({ session, email, timeLeft, theme, toggleTheme }) {
  return (
    <header className="booth-header">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Quorum" className="booth-brand-logo" />
        <div>
          <div className="fw-700 text-sm">{session.name}</div>
          <div className="text-xs text-muted font-mono flex items-center gap-2">
            <span>{email}</span>
            <span>·</span>
            <span>#{session.code}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="booth-timer" title="Poll closing countdown">
          <Clock size={13} style={{ color: 'var(--brand-500)' }} />
          <span className="mono text-xs fw-600">{timeLeft} remaining</span>
        </div>

        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
          type="button"
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
      </div>
    </header>
  )
}

/* ── Review Official Ballot ── */
function ReviewPane({ positions, votes, onEdit, onSubmit, submitting }) {
  const skipped = positions.filter(p => !votes[p.id] || votes[p.id] === 'skip').length

  return (
    <div className="review-pane card">
      <div className="civic-seal" style={{ marginBottom: 6 }}>
        <ShieldCheck size={14} style={{ color: 'var(--brand-500)' }} />
        <span>Official Ballot Verification</span>
      </div>

      <h1 className="review-pane-title font-serif">Review Your Ballot Selections</h1>
      <p className="text-secondary text-sm">
        {skipped > 0
          ? `${skipped} question${skipped > 1 ? 's are' : ' is'} recorded as Abstain / Undecided.`
          : 'All ballot questions have confirmed choices. Verify below before sealing your vote.'}
      </p>

      <div className="review-votes-list">
        {positions.map((pos, i) => {
          const vote = votes[pos.id]
          const cand = pos.candidates.find(c => c.id === vote)
          const isSkip = !vote || vote === 'skip'
          return (
            <div key={pos.id} className="review-vote-row">
              <div className="review-vote-position">
                <span className="text-xs text-muted font-mono uppercase">Measure {i + 1}: {pos.name}</span>
                {!isSkip ? (
                  <div className="review-vote-choice">
                    <div className="ballot-oval filled-small" />
                    <span className="fw-600 text-sm">{cand?.name}</span>
                  </div>
                ) : (
                  <span className="review-undecided text-muted text-sm font-mono">[Formal Abstention]</span>
                )}
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onEdit(i)}
                id={`edit-vote-${pos.id}`}
                type="button"
              >
                Amend
              </button>
            </div>
          )
        })}
      </div>

      <div className="review-lock-notice">
        <Lock size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
        <span className="text-xs text-secondary">
          Submitting permanently records your choices to the cryptographic ledger. Once sealed, ballots cannot be amended or retracted.
        </span>
      </div>

      <button
        className="btn btn-primary w-full btn-lg"
        onClick={onSubmit}
        disabled={submitting}
        id="submit-votes"
        type="button"
      >
        {submitting ? <span className="spinner spinner-sm" /> : <Check size={16} />}
        {submitting ? 'Encrypting & Sealing Ballot…' : 'Confirm & Cast Official Ballot'}
      </button>
    </div>
  )
}

/* ── Cryptographic Ballot Receipt Screen ── */
function DoneScreen({ session, sessionCode, votes, positions, receipt }) {
  const [copied, setCopied] = useState(false)
  const votedCount = positions.filter(p => votes[p.id] && votes[p.id] !== 'skip').length

  function copyHash() {
    navigator.clipboard.writeText(receipt.hash).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="booth-shell">
      <div className="done-container">
        <div className="done-card card">
          <div className="done-seal-badge">
            <CheckCircle2 size={32} />
          </div>

          <h1 className="done-title font-serif">Ballot Cast & Verified</h1>
          <p className="text-secondary text-sm" style={{ textAlign: 'center', maxWidth: 420 }}>
            Your ballot has been decoupled from your elector identity, encrypted with AES-256, and sealed onto the session ledger.
          </p>

          {/* Physical Receipt Tape Metaphor */}
          <div className="ballot-receipt-tape">
            <div className="receipt-header">
              <span className="receipt-org-title">{session.name}</span>
              <span className="receipt-sub text-xs text-muted">Official Cryptographic Vote Record</span>
            </div>

            <div className="receipt-meta-grid font-mono text-xs">
              <div className="receipt-item">
                <span className="text-muted">Receipt ID:</span>
                <span className="fw-600">{receipt.receiptId}</span>
              </div>
              <div className="receipt-item">
                <span className="text-muted">Ledger Block:</span>
                <span>#{receipt.blockNumber}</span>
              </div>
              <div className="receipt-item">
                <span className="text-muted">Timestamp:</span>
                <span>{new Date(receipt.timestamp).toUTCString()}</span>
              </div>
              <div className="receipt-item">
                <span className="text-muted">Measures Voted:</span>
                <span>{votedCount} of {positions.length}</span>
              </div>
            </div>

            <div className="receipt-hash-block">
              <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                <span className="text-xs text-muted font-mono uppercase">SHA-256 Verification Hash</span>
                <button
                  type="button"
                  className="copy-hash-btn"
                  onClick={copyHash}
                  title="Copy verification hash"
                >
                  {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                  <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="receipt-hash-value mono">{receipt.hash}</code>
            </div>

            <p className="receipt-audit-note text-xs text-muted">
              Retain this hash code. It allows you to verify your ballot was included in the final certified canvass without revealing how you voted.
            </p>
          </div>

          <div className="done-actions">
            <button className="btn btn-secondary" onClick={handlePrint} type="button">
              <Printer size={15} /> Print / Save Receipt
            </button>
            <Link to={`/live/${sessionCode}`} className="btn btn-primary">
              View Live Results Tally →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}