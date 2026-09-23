import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { voterService } from '../services/voterService.js'
import {
  Sun, Moon, CheckCircle2, AlertCircle,
  ArrowLeft, Copy, FileText, Check
} from 'lucide-react'
import './VerifyReceipt.css'

export default function VerifyReceipt() {
  const { receiptId } = useParams()
  const { theme, toggleTheme } = useTheme()
  const { verifyReceipt } = voterService

  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const result = await verifyReceipt(receiptId)
        if (result.ok && result.receipt) {
          setReceipt(result.receipt)
        } else {
          setError(result.error || 'Receipt not found')
        }
      } catch (err) {
        setError(err.message || 'Failed to verify receipt')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [receiptId, verifyReceipt])

  function copyHash() {
    if (!receipt) return
    navigator.clipboard.writeText(receipt.hash).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="verify-shell">
        <header className="verify-header">
          <img src="/logo.png" alt="Quorum" className="verify-brand-logo" />
          <button className="theme-toggle-btn" onClick={toggleTheme} type="button">
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </header>
        <main className="verify-content">
          <div className="verify-loading card">
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px', borderWidth: 3 }} />
            <p className="text-secondary text-sm font-mono">Verifying receipt on ledger…</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="verify-shell">
        <header className="verify-header">
          <img src="/logo.png" alt="Quorum" className="verify-brand-logo" />
          <button className="theme-toggle-btn" onClick={toggleTheme} type="button">
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </header>
        <main className="verify-content">
          <div className="verify-error card">
            <AlertCircle size={36} style={{ color: 'var(--danger)' }} />
            <h2 className="font-serif text-xl">Verification Failed</h2>
            <p className="text-secondary text-sm">{error}</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 8 }}>
              <ArrowLeft size={14} /> Return Home
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="verify-shell">
      <header className="verify-header">
        <img src="/logo.png" alt="Quorum" className="verify-brand-logo" />
        <button className="theme-toggle-btn" onClick={toggleTheme} type="button">
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </header>

      <main className="verify-content">
        <div className="verify-card card">
          <div className="verify-seal-badge">
            <CheckCircle2 size={32} />
          </div>

          <h1 className="verify-title font-serif">Receipt Verified</h1>
          <p className="text-secondary text-sm" style={{ textAlign: 'center', maxWidth: 420 }}>
            This cryptographic receipt has been confirmed on the official session ledger.
          </p>

          <div className="ballot-receipt-tape">
            <div className="receipt-header">
              <span className="receipt-org-title">Quorum Civic Voting Platform</span>
              <span className="receipt-sub text-xs text-muted">Official Ballot Verification Record</span>
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
                <span className="text-muted">Session:</span>
                <span className="mono fw-600">#{receipt.sessionCode}</span>
              </div>
              <div className="receipt-item">
                <span className="text-muted">Positions Voted:</span>
                <span>{receipt.votedCandidateIds?.length || 0}</span>
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
              This receipt confirms that a ballot was included in the final certified canvass for session <strong className="mono">#{receipt.sessionCode}</strong>.
              The hash reveals nothing about how the voter voted — only that their ballot was counted.
            </p>
          </div>

          <div className="verify-actions">
            <button className="btn btn-secondary" onClick={handlePrint} type="button">
              <FileText size={15} /> Print / Save Verification
            </button>
            <Link to={`/results/${receipt.sessionCode}`} className="btn btn-primary">
              View Certified Results <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}