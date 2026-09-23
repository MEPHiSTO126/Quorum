import { useTheme } from '../context/ThemeContext'
import { Link } from 'react-router-dom'
import {
  Sun, Moon, ShieldCheck, Lock, ArrowRight,
  CheckCircle2, Radio
} from 'lucide-react'
import './LandingPage.css'

/* ── Topbar ─────────────────────────────────────────────────── */
function LandingTopbar() {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className="landing-topbar">
      <div className="landing-topbar-brand">
        <img src="/logo.png" alt="Quorum" className="landing-logo" />
        <span className="landing-brand-name">Quorum</span>
      </div>
      <nav className="landing-topbar-nav">
        <a href="#organisations" className="landing-nav-link">Organisations</a>
        <a href="#voters" className="landing-nav-link">Voter Portal</a>
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
          type="button"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <Link to="/admin" className="btn btn-primary btn-sm landing-cta-btn">
          Admin Console <ArrowRight size={13} />
        </Link>
      </nav>
    </header>
  )
}

/* ── Hero: Asymmetric Editorial Layout ──────────────────────── */
const HOW_STEPS = [
  {
    num: '01',
    icon: ShieldCheck,
    title: 'Accredit',
    desc: 'Confirm your email on the voter roster before polls open.',
  },
  {
    num: '02',
    icon: Lock,
    title: 'Cast in secret',
    desc: 'One single-use token grants one fully anonymous ballot.',
  },
  {
    num: '03',
    icon: CheckCircle2,
    title: 'Verify the count',
    desc: 'Keep your receipt hash and audit it against the public tally.',
  },
]

function Hero() {
  return (
    <section className="landing-hero">
      <div className="hero-container">
        {/* Left Column: Institutional Statement */}
        <div className="hero-editorial">
          <div className="civic-seal hero-seal">
            <ShieldCheck size={13} style={{ color: 'var(--brand-500)' }} />
            <span>Charter-Compliant Ballot Authority</span>
          </div>

          <h1 className="hero-title font-serif">
            Democratic decisions,<br />
            verified at every ballot.
          </h1>

          <p className="hero-subtitle text-secondary">
            Quorum provides tamper-evident digital voting for academic senates,
            labor unions, and governing boards. Cryptographically decoupled ballots
            guarantee irreversible voter anonymity while maintaining an open public tally.
          </p>

          <div className="hero-actions">
            <Link to="/admin" className="btn btn-primary btn-lg">
              Establish Session <ArrowRight size={15} />
            </Link>
            <Link to="/join" className="btn btn-secondary btn-lg">
              Accredit as Voter
            </Link>
          </div>

          {/* Mono Ledger Strip */}
          <div className="hero-ledger-strip font-mono">
            <div className="ledger-cell">
              <span className="ledger-dot" />
              <span>SHA-256 AUDIT TRAILS</span>
            </div>
            <div className="ledger-divider" />
            <div className="ledger-cell">
              <Lock size={11} />
              <span>ZERO-KNOWLEDGE DECOUPLING</span>
            </div>
            <div className="ledger-divider" />
            <div className="ledger-cell">
              <Radio size={11} style={{ color: 'var(--live)' }} />
              <span>REAL-TIME CANVASS</span>
            </div>
          </div>
        </div>

        {/* Right Column: How It Works (static explainer — no live data) */}
        <div className="hero-proof-panel">
          <div className="hero-how-card card">
            <div className="civic-seal" style={{ width: 'fit-content' }}>
              <ShieldCheck size={13} style={{ color: 'var(--brand-500)' }} />
              <span>How Quorum Works</span>
            </div>
            <ol className="hero-how-steps">
              {HOW_STEPS.map(({ num, icon: Icon, title, desc }) => (
                <li key={num} className="hero-how-step">
                  <span className="how-step-num font-mono">{num}</span>
                  <span className="how-step-icon">
                    <Icon size={16} />
                  </span>
                  <div>
                    <div className="how-step-title fw-700">{title}</div>
                    <p className="how-step-desc text-sm text-secondary">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link to="/join" className="btn btn-secondary">
              Accredit as a voter <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Organisation Section: Asymmetric Ledger & Single Featured Card */
const ORG_STEPS = [
  {
    num: '01',
    title: 'Charter Definition',
    desc: 'Configure office seats, constitutional motions, ballot choices, and voting windows from a structured governance builder.',
  },
  {
    num: '02',
    title: 'Roster Accreditation',
    desc: 'Electors register through institutional email domains. The voter roster permanently seals before voting commences to eliminate roster tampering.',
  },
  {
    num: '03',
    title: 'Single-Use Token Dispatch',
    desc: 'Each accredited elector receives an ephemeral ballot token that grants exactly one admission to the voting booth.',
  },
  {
    num: '04',
    title: 'Live Canvass Monitor',
    desc: 'Auditors and electors observe incoming ballot counts in real time with automatic quorum threshold verification.',
  },
  {
    num: '05',
    title: 'Certified Results Archive',
    desc: 'Upon polls closing, Quorum generates an immutable certified tally certificate with full turnout verification and audit hashes.',
  },
]

function OrganisationSection() {
  return (
    <section id="organisations" className="landing-section">
      <div className="section-container">
        <div className="section-preamble">
          <div className="section-index font-mono">01 // ORGANISATIONAL CONTROL</div>
          <h2 className="section-headline font-serif">
            Ballot formulation through final certification.
          </h2>
          <p className="section-dek text-secondary">
            Designed for institutional rigour. Maintain constitutional compliance with zero-trust
            ballot integrity, verifiable quorum thresholds, and immutable electoral receipts.
          </p>
        </div>

        <div className="org-editorial-grid">
          {/* Left Column: Dense Steps Ledger */}
          <div className="org-steps-rail">
            {ORG_STEPS.map(({ num, title, desc }) => (
              <div key={num} className="org-step-row row-ledger">
                <span className="org-step-num font-mono">{num}</span>
                <div className="org-step-content">
                  <div className="org-step-title fw-600">{title}</div>
                  <p className="org-step-desc text-secondary text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Exactly ONE Featured Audit Card */}
          <div className="org-featured-card card-elevated receipt-tape">
            <div className="featured-card-tag font-mono text-xs">
              <Lock size={12} style={{ color: 'var(--brand-500)' }} />
              <span>CORE ARCHITECTURAL GUARANTEE</span>
            </div>

            <h3 className="featured-card-title font-serif">
              Zero-Knowledge Ballot Decoupling
            </h3>

            <p className="featured-card-body text-secondary text-sm">
              In Quorum, voter authentication confirms eligibility, then permanently detaches
              from the cast ballot payload before commitment to the tally.
            </p>

            <div className="featured-card-spec font-mono">
              <div className="spec-line">
                <span className="spec-label">IDENTITY:</span>
                <span className="spec-val text-muted">elector@institution.edu</span>
              </div>
              <div className="spec-arrow">↓ [DECOUPLED VIA EPHEMERAL TOKEN]</div>
              <div className="spec-line">
                <span className="spec-label">BALLOT TX:</span>
                <span className="spec-val text-brand">#BALLOT-SEALED</span>
              </div>
              <div className="spec-line">
                <span className="spec-label">REVERSIBILITY:</span>
                <span className="spec-val text-danger fw-700">MATHEMATICALLY IMPOSSIBLE</span>
              </div>
            </div>

            <p className="featured-card-subtext text-xs text-muted">
              Even with direct administrative database access, neither the presiding officer
              nor Quorum can correlate a cast ballot with an elector's email address.
            </p>

            <div className="featured-card-cta">
              <Link to="/admin" className="btn btn-primary w-full">
                Register Your Organisation <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Voter Section: Full-Bleed Alternate with Numbered Timeline */
const VOTER_STEPS = [
  {
    num: '01',
    title: 'Receive Session Code',
    desc: 'Obtain the 8-character election identifier from your institution’s official notice.',
  },
  {
    num: '02',
    title: 'Confirm Accreditation',
    desc: 'Submit your institutional email before the voting window opens to secure roster inclusion.',
  },
  {
    num: '03',
    title: 'Authenticate with Token',
    desc: 'Enter your single-use ballot token delivered when polling commences.',
  },
  {
    num: '04',
    title: 'Cast Secret Ballot',
    desc: 'Mark candidates using physical ballot ovals. Review all offices before irreversible submission.',
  },
  {
    num: '05',
    title: 'Retain Audit Receipt',
    desc: 'Save your unique SHA-256 receipt hash to verify your vote is tabulated in the public ledger.',
  },
]

const VOTER_PILLARS = [
  {
    label: 'Irreversible Anonymity',
    detail: 'Your voter email is permanently purged from the ballot payload the microsecond it is cast.',
  },
  {
    label: 'Open Public Tally',
    detail: 'Anyone can verify quorum status and vote counts on the live canvas without credentials.',
  },
  {
    label: 'Single-Use Enforcement',
    detail: 'Once cast, your authentication token self-destructs to eliminate double-voting.',
  },
]

function VoterSection() {
  return (
    <section id="voters" className="landing-section landing-section--alt">
      <div className="section-container">
        <div className="section-preamble">
          <div className="section-index font-mono">02 // ELECTOR SOVEREIGNTY</div>
          <h2 className="section-headline font-serif">
            Your ballot is secret. Your count is verifiable.
          </h2>
          <p className="section-dek text-secondary">
            No app installations, no passwords to create, no biometric tracking.
            Five direct steps to an authenticated vote.
          </p>
        </div>

        {/* Horizontal / Linear Numbered Timeline (NO card-per-step) */}
        <div className="voter-timeline">
          {VOTER_STEPS.map(({ num, title, desc }) => (
            <div key={num} className="timeline-node">
              <div className="timeline-top">
                <span className="timeline-num font-mono">{num}</span>
                <span className="ballot-oval" aria-hidden="true">
                  <span className="ballot-oval-dot" />
                </span>
                <div className="timeline-connector" />
              </div>
              <div className="timeline-content">
                <h4 className="timeline-title fw-700">{title}</h4>
                <p className="timeline-desc text-secondary text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Elector Guarantees: High-density flat rule list */}
        <div className="voter-pillars-row">
          {VOTER_PILLARS.map(({ label, detail }) => (
            <div key={label} className="voter-pillar-item">
              <div className="pillar-header">
                <span className="pillar-bullet font-mono">■</span>
                <h4 className="pillar-title fw-700">{label}</h4>
              </div>
              <p className="pillar-desc text-sm text-secondary">{detail}</p>
            </div>
          ))}
        </div>

        <div className="voter-action-row">
          <Link to="/join" className="btn btn-primary btn-lg">
            Access Voter Accreditation <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── Footer ──────────────────────────────────────────────── */
function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-container">
        <div className="footer-meta">
          <div className="footer-brand">
            <img src="/logo.png" alt="Quorum" className="landing-logo" style={{ width: 22, height: 22 }} />
            <span className="fw-800 text-primary">Quorum</span>
            <span className="text-muted text-xs font-mono">GOVERNANCE OS</span>
          </div>
          <div className="footer-protocol font-mono text-xs text-muted">
            PROTOCOL STATUS: SECURE LEDGER ACTIVE · SHA-256 CANVASS
          </div>
        </div>

        <div className="footer-links">
          <Link to="/admin" className="footer-link">Administrator Console</Link>
          <span className="footer-sep">/</span>
          <Link to="/join" className="footer-link">Elector Accreditation</Link>
        </div>

        <p className="footer-copy text-muted text-xs font-mono">
          © {new Date().getFullYear()} Quorum Voting Systems. Cryptographically sealed. Open institutional governance.
        </p>
      </div>
    </footer>
  )
}

/* ── Main Component Export ───────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing-shell">
      <LandingTopbar />
      <Hero />
      <OrganisationSection />
      <VoterSection />
      <LandingFooter />
    </div>
  )
}
