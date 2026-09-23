import { useParams, Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useTheme } from '../context/ThemeContext'
import {
  ShieldCheck, Sun, Moon, Award, BarChart2,
  ExternalLink, ArrowLeft, Vote, Printer
} from 'lucide-react'
import './ResultsPage.css'

/* ── Topbar ─────────────────────────────────────────────────── */
function ResultsTopbar({ session }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className="results-header">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Quorum" className="results-brand-logo" />
        <span className="results-brand-title">
          Quorum <span className="text-muted text-xs font-mono">Official Results</span>
        </span>
      </div>
      <div className="flex items-center gap-3 no-print">
        {session && (
          <>
            <span className="results-certified-badge">
              <ShieldCheck size={12} />
              Certified Final Results
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => window.print()}
            >
              <Printer size={13} /> Print / Export Certificate
            </button>
          </>
        )}
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

export default function ResultsPage() {
  const { sessionCode } = useParams()
  const { getSessionByCode } = useSession()

  const session = getSessionByCode(sessionCode)

  if (!session) {
    return (
      <div className="results-shell">
        <ResultsTopbar session={null} />
        <div className="results-content">
          <div className="results-not-found card">
            <Vote size={36} style={{ color: 'var(--text-muted)' }} />
            <h2 className="font-serif text-xl">Results Not Found</h2>
            <p className="text-secondary text-sm">No certified results exist for this session code.</p>
            <Link to="/" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
              <ArrowLeft size={14} /> Return Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (session.status !== 'ended') {
    return (
      <div className="results-shell">
        <ResultsTopbar session={null} />
        <div className="results-content">
          <div className="results-not-found card">
            <BarChart2 size={36} style={{ color: 'var(--warning)' }} />
            <h2 className="font-serif text-xl">Results Pending</h2>
            <p className="text-secondary text-sm">
              This session is currently <strong>{session.status}</strong>. Final certified results will be published once voting concludes.
            </p>
            <Link to={`/live/${sessionCode}`} className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
              View Live Tally <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalVotes = session.totalVoted || 0
  const totalAccredited = session.totalAccredited || 0
  const turnoutPct = totalAccredited ? Math.round((totalVotes / totalAccredited) * 100) : 0
  const quorumThreshold = session.quorumThreshold || 50
  const quorumMet = turnoutPct >= quorumThreshold

  const endedAt = new Date(session.endTime).toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="results-shell">
      <ResultsTopbar session={session} />

      <div className="results-content">
        {/* Session Identity */}
        <div className="results-identity">
          <div className="results-org-seal">
            <ShieldCheck size={16} />
            <span>Official Certified Results</span>
          </div>
          <h1 className="results-session-name font-serif">{session.name}</h1>
          {session.description && (
            <p className="text-secondary text-sm results-desc">{session.description}</p>
          )}
          <p className="text-muted text-xs font-mono results-timestamp">
            Polls closed · {endedAt} · Session #{session.code}
          </p>
        </div>

        {/* Summary Stats — Flat Tabular Density */}
        <div className="results-stats-row">
          <div className="results-stat-card card-flat">
            <div className="results-stat-meta font-mono text-xs text-muted">
              <span>01 // ELECTORS</span>
            </div>
            <div className="results-stat-value font-mono">{totalAccredited.toLocaleString()}</div>
            <div className="results-stat-label text-xs text-secondary">Accredited on Roster</div>
          </div>
          <div className="results-stat-card card-flat">
            <div className="results-stat-meta font-mono text-xs text-muted">
              <span>02 // COMMITTED</span>
            </div>
            <div className="results-stat-value font-mono text-success">{totalVotes.toLocaleString()}</div>
            <div className="results-stat-label text-xs text-secondary">Verified Ballots Cast</div>
          </div>
          <div className="results-stat-card card-flat">
            <div className="results-stat-meta font-mono text-xs text-muted">
              <span>03 // TURNOUT</span>
            </div>
            <div className="results-stat-value font-mono">{turnoutPct}%</div>
            <div className="results-stat-label text-xs text-secondary">
              {quorumMet ? `Quorum Met (≥${quorumThreshold}%)` : `Quorum Pending (<${quorumThreshold}%)`}
            </div>
          </div>
        </div>

        {/* Quorum Status */}
        <div className={`results-quorum-banner ${quorumMet ? 'quorum-met' : 'quorum-not-met'}`}>
          <ShieldCheck size={15} />
          <span>
            {quorumMet
              ? `Quorum Achieved — ${turnoutPct}% turnout exceeds the ${quorumThreshold}% democratic threshold. Results are binding.`
              : `Quorum Not Met — ${turnoutPct}% turnout is below the ${quorumThreshold}% democratic threshold. Consult your governing rules.`
            }
          </span>
        </div>

        {/* Position Results */}
        {session.positions && session.positions.length > 0 ? (
          <div className="results-positions">
            {session.positions.map(position => {
              const totalPositionVotes = position.candidates.reduce((sum, c) => sum + (c.votes || 0), 0)
              const sorted = [...position.candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0))
              const winner = sorted[0]

              return (
                <div key={position.id} className="results-position-card card receipt-tape">
                  <div className="results-position-header">
                    <h2 className="results-position-name font-serif">{position.name}</h2>
                    {position.description && (
                      <p className="text-secondary text-sm">{position.description}</p>
                    )}
                  </div>

                  {/* Winner Banner */}
                  <div className="results-winner-banner">
                    <Award size={15} />
                    <span className="results-winner-label">Elected:</span>
                    <span className="results-winner-name fw-700">{winner.name}</span>
                    <span className="text-muted text-xs">
                      ({winner.votes || 0} votes · {totalPositionVotes ? Math.round(((winner.votes || 0) / totalPositionVotes) * 100) : 0}%)
                    </span>
                  </div>

                  {/* Candidate Tally */}
                  <div className="results-candidate-list">
                    {sorted.map((candidate, idx) => {
                      const pct = totalPositionVotes
                        ? Math.round(((candidate.votes || 0) / totalPositionVotes) * 100)
                        : 0
                      const isWinner = idx === 0

                      return (
                        <div key={candidate.id} className={`results-candidate-row ${isWinner ? 'winner' : ''}`}>
                          <div className="results-cand-rank">{idx + 1}</div>
                          <div className="results-cand-info">
                            <div className="results-cand-name-row">
                              <span className="results-cand-name fw-600">{candidate.name}</span>
                              {isWinner && <span className="results-winner-chip"><Award size={10} /> Elected</span>}
                            </div>
                            {candidate.catchphrase && (
                              <span className="results-cand-catchphrase text-xs text-muted">{candidate.catchphrase}</span>
                            )}
                          </div>
                          <div className="results-cand-right">
                            <div className="results-bar-wrap">
                              <div
                                className={`results-bar-fill ${isWinner ? 'bar-winner' : ''}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="results-cand-numbers">
                              <span className="results-cand-pct fw-700">{pct}%</span>
                              <span className="results-cand-count text-xs text-muted">{(candidate.votes || 0).toLocaleString()} votes</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="results-empty card" style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
            <BarChart2 size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <p className="text-muted text-sm">No position results available for this session.</p>
          </div>
        )}

        {/* Footer */}
        <div className="results-footer text-xs text-muted">
          <ShieldCheck size={12} />
          <span>
            These results are cryptographically sealed and certified under session{' '}
            <span className="mono fw-600">#{session.code}</span>.
            Results are final and cannot be altered.
          </span>
        </div>
      </div>
    </div>
  )
}
