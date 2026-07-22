import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import AdminLayout from '../../layouts/AdminLayout'
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Upload, X, Check,
  Copy, Share2, UserCircle2, MapPin, Clock, Eye
} from 'lucide-react'
import './SessionBuilder.css'

const STEPS = ['Session Info', 'Positions', 'Candidates', 'Voting Period', 'Review']

/* ─── helpers ─────────────────────────────────────────────── */
function uid() { return `id-${Math.random().toString(36).slice(2, 9)}` }
function blankPosition() { return { id: uid(), name: '', description: '', candidates: [] } }
function blankCandidate() { return { id: uid(), name: '', catchphrase: '', imageUrl: null } }

export default function SessionBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createSession, updateSession, getSession, isLoading } = useSession()

  const existing = id ? getSession(id) : null
  const isEdit = Boolean(existing)

  /* shared state */
  const [step, setStep] = useState(0)
  const [info, setInfo] = useState({
    name:        existing?.name        || '',
    description: existing?.description || '',
  })
  const [positions, setPositions] = useState(
    existing?.positions?.length
      ? existing.positions.map(p => ({
          ...p,
          candidates: p.candidates.map(c => ({ ...c, imageUrl: c.image || null })),
        }))
      : [blankPosition()]
  )
  const [period, setPeriod] = useState({
    startTime: existing?.startTime ? existing.startTime.slice(0,16) : '',
    endTime:   existing?.endTime   ? existing.endTime.slice(0,16)   : '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [createdSession, setCreatedSession] = useState(null)
  const [errors, setErrors] = useState({})

  /* ── Validation per step ── */
  function validateStep(s) {
    const e = {}
    if (s === 0) {
      if (!info.name.trim())        e.name = 'Session name is required.'
    }
    if (s === 1) {
      positions.forEach((p, i) => {
        if (!p.name.trim()) e[`pos_${i}_name`] = 'Position name is required.'
      })
    }
    if (s === 2) {
      positions.forEach((p, pi) => {
        if (p.candidates.length === 0) e[`pos_${pi}_cands`] = `"${p.name || 'This position'}" needs at least one candidate.`
        p.candidates.forEach((c, ci) => {
          if (!c.name.trim()) e[`cand_${pi}_${ci}_name`] = 'Candidate name is required.'
        })
      })
    }
    if (s === 3) {
      if (!period.startTime) e.startTime = 'Start time is required.'
      if (!period.endTime)   e.endTime   = 'End time is required.'
      if (period.startTime && period.endTime && period.endTime <= period.startTime)
        e.endTime = 'End time must be after start time.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1))
  }
  function back() { setStep(s => Math.max(s - 1, 0)); setErrors({}) }

  async function handleSubmit() {
    if (!validateStep(3)) return
    const data = {
      ...info,
      positions: positions.map(p => ({
        ...p,
        candidates: p.candidates.map(c => ({
          ...c,
          image: c.imageUrl,
          votes: c.votes || 0,
        })),
      })),
      ...period,
      orgId: 'org-1',
    }
    let result
    if (isEdit) result = await updateSession(id, data)
    else        result = await createSession(data)
    if (result.ok) {
      setCreatedSession(result.session)
      setSubmitted(true)
    }
  }

  if (submitted && createdSession) {
    return <SuccessScreen session={createdSession} onDashboard={() => navigate('/admin/dashboard')} />
  }

  return (
    <AdminLayout>
      <div className="builder-page">
        {/* Stepper */}
        <div className="builder-stepper">
          {STEPS.map((label, i) => (
            <div key={i} className={`step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="step-circle">
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span className="step-label">{label}</span>
              {i < STEPS.length - 1 && <div className="step-connector" />}
            </div>
          ))}
        </div>

        {/* Panel */}
        <div className="builder-panel">
          <div className="builder-panel-header">
            <h2 className="builder-title">
              {isEdit ? 'Edit Session' : 'Create Session'} — {STEPS[step]}
            </h2>
          </div>

          <div className="builder-body">
            {step === 0 && <StepInfo info={info} setInfo={setInfo} errors={errors} />}
            {step === 1 && <StepPositions positions={positions} setPositions={setPositions} errors={errors} />}
            {step === 2 && <StepCandidates positions={positions} setPositions={setPositions} errors={errors} />}
            {step === 3 && <StepPeriod period={period} setPeriod={setPeriod} errors={errors} />}
            {step === 4 && <StepReview info={info} positions={positions} period={period} />}
          </div>

          <div className="builder-footer">
            <button className="btn btn-secondary" onClick={back} disabled={step === 0}>
              <ChevronLeft size={16} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={next} id="builder-next">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading} id="builder-submit">
                {isLoading ? <span className="spinner spinner-sm" /> : <Check size={16} />}
                {isLoading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Session'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 0 – Session Info                                        */
/* ──────────────────────────────────────────────────────────── */
function StepInfo({ info, setInfo, errors }) {
  return (
    <div className="step-content">
      <div className="form-group">
        <label className="form-label" htmlFor="session-name">Session Name *</label>
        <input
          id="session-name"
          type="text"
          className={`form-input ${errors.name ? 'error' : ''}`}
          placeholder="e.g. 2025 Executive Elections"
          value={info.name}
          onChange={e => setInfo(i => ({ ...i, name: e.target.value }))}
        />
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="session-desc">Description</label>
        <textarea
          id="session-desc"
          className="form-textarea"
          placeholder="Brief description of what this vote is about…"
          value={info.description}
          onChange={e => setInfo(i => ({ ...i, description: e.target.value }))}
          rows={4}
        />
        <span className="form-hint">Voters will see this when they open the voting booth.</span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 1 – Positions                                           */
/* ──────────────────────────────────────────────────────────── */
function StepPositions({ positions, setPositions, errors }) {
  function add() { setPositions(p => [...p, blankPosition()]) }
  function remove(id) { setPositions(p => p.filter(pos => pos.id !== id)) }
  function update(id, field, value) {
    setPositions(p => p.map(pos => pos.id === id ? { ...pos, [field]: value } : pos))
  }

  return (
    <div className="step-content">
      <p className="step-hint">Define each role or topic that voters will decide on.</p>
      <div className="positions-list">
        {positions.map((pos, i) => (
          <div key={pos.id} className="position-row">
            <div className="position-index">{i + 1}</div>
            <div className="position-fields">
              <div className="form-group">
                <label className="form-label" htmlFor={`pos-name-${pos.id}`}>Position Name *</label>
                <input
                  id={`pos-name-${pos.id}`}
                  type="text"
                  className={`form-input ${errors[`pos_${i}_name`] ? 'error' : ''}`}
                  placeholder="e.g. President"
                  value={pos.name}
                  onChange={e => update(pos.id, 'name', e.target.value)}
                />
                {errors[`pos_${i}_name`] && <span className="form-error">{errors[`pos_${i}_name`]}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor={`pos-desc-${pos.id}`}>Short Description</label>
                <textarea
                  id={`pos-desc-${pos.id}`}
                  className="form-textarea"
                  placeholder="What does this position do?"
                  value={pos.description}
                  onChange={e => update(pos.id, 'description', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            {positions.length > 1 && (
              <button
                className="btn btn-ghost btn-icon position-remove"
                onClick={() => remove(pos.id)}
                title="Remove position"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={add} id="add-position">
        <Plus size={16} /> Add Position
      </button>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 2 – Candidates                                          */
/* ──────────────────────────────────────────────────────────── */
function StepCandidates({ positions, setPositions, errors }) {
  function addCandidate(posId) {
    setPositions(p => p.map(pos =>
      pos.id === posId ? { ...pos, candidates: [...pos.candidates, blankCandidate()] } : pos
    ))
  }
  function removeCandidate(posId, cId) {
    setPositions(p => p.map(pos =>
      pos.id === posId ? { ...pos, candidates: pos.candidates.filter(c => c.id !== cId) } : pos
    ))
  }
  function updateCandidate(posId, cId, field, value) {
    setPositions(p => p.map(pos =>
      pos.id === posId
        ? { ...pos, candidates: pos.candidates.map(c => c.id === cId ? { ...c, [field]: value } : c) }
        : pos
    ))
  }

  return (
    <div className="step-content">
      {positions.map((pos, pi) => (
        <div key={pos.id} className="candidates-block">
          <div className="candidates-block-header">
            <div className="position-tag">
              <MapPin size={13} />
              {pos.name || `Position ${pi + 1}`}
            </div>
            {errors[`pos_${pi}_cands`] && (
              <span className="form-error">{errors[`pos_${pi}_cands`]}</span>
            )}
          </div>

          <div className="candidates-grid">
            {pos.candidates.map((cand, ci) => (
              <CandidateForm
                key={cand.id}
                candidate={cand}
                index={ci}
                posIndex={pi}
                errors={errors}
                onChange={(field, val) => updateCandidate(pos.id, cand.id, field, val)}
                onRemove={() => removeCandidate(pos.id, cand.id)}
                canRemove={pos.candidates.length > 1}
              />
            ))}

            <button
              className="add-candidate-btn"
              onClick={() => addCandidate(pos.id)}
              id={`add-cand-${pos.id}`}
            >
              <Plus size={18} />
              <span>Add Candidate</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CandidateForm({ candidate, index, posIndex, errors, onChange, onRemove, canRemove }) {
  const fileRef = useRef()
  const nameKey = `cand_${posIndex}_${index}_name`

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onChange('imageUrl', ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="candidate-form-card">
      {canRemove && (
        <button className="btn btn-ghost btn-icon cand-remove" onClick={onRemove} title="Remove">
          <X size={14} />
        </button>
      )}

      {/* Photo */}
      <div className="cand-photo-area" onClick={() => fileRef.current?.click()}>
        {candidate.imageUrl
          ? <img src={candidate.imageUrl} alt="preview" className="cand-photo-preview" />
          : (
            <div className="cand-photo-placeholder">
              <Upload size={20} />
              <span className="text-xs text-muted">Upload photo</span>
            </div>
          )
        }
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImage}
          id={`photo-${candidate.id}`}
          style={{ display: 'none' }}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`cand-name-${candidate.id}`}>Name *</label>
        <input
          id={`cand-name-${candidate.id}`}
          type="text"
          className={`form-input ${errors[nameKey] ? 'error' : ''}`}
          placeholder="Full name"
          value={candidate.name}
          onChange={e => onChange('name', e.target.value)}
        />
        {errors[nameKey] && <span className="form-error">{errors[nameKey]}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`cand-phrase-${candidate.id}`}>Catchphrase</label>
        <input
          id={`cand-phrase-${candidate.id}`}
          type="text"
          className="form-input"
          placeholder="Their slogan or motto"
          value={candidate.catchphrase}
          onChange={e => onChange('catchphrase', e.target.value)}
        />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 3 – Voting Period                                       */
/* ──────────────────────────────────────────────────────────── */
function StepPeriod({ period, setPeriod, errors }) {
  const minStart = new Date().toISOString().slice(0, 16)
  return (
    <div className="step-content">
      <p className="step-hint">Set when voting opens and closes. Accreditation begins as soon as the session is created.</p>
      <div className="period-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="start-time">
            <Clock size={13} style={{display:'inline', marginRight:4}} />
            Voting Opens *
          </label>
          <input
            id="start-time"
            type="datetime-local"
            className={`form-input ${errors.startTime ? 'error' : ''}`}
            min={minStart}
            value={period.startTime}
            onChange={e => setPeriod(p => ({ ...p, startTime: e.target.value }))}
          />
          {errors.startTime && <span className="form-error">{errors.startTime}</span>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="end-time">
            <Clock size={13} style={{display:'inline', marginRight:4}} />
            Voting Closes *
          </label>
          <input
            id="end-time"
            type="datetime-local"
            className={`form-input ${errors.endTime ? 'error' : ''}`}
            min={period.startTime || minStart}
            value={period.endTime}
            onChange={e => setPeriod(p => ({ ...p, endTime: e.target.value }))}
          />
          {errors.endTime && <span className="form-error">{errors.endTime}</span>}
        </div>
      </div>
      <div className="period-note">
        <Clock size={14} />
        <span className="text-sm text-secondary">
          Voters will receive their one-time passwords by email when voting opens.
        </span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 4 – Review                                              */
/* ──────────────────────────────────────────────────────────── */
function StepReview({ info, positions, period }) {
  function fmt(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="step-content review-content">
      <div className="review-section">
        <h4 className="review-section-title">Session Info</h4>
        <div className="review-item"><span>Name</span><strong>{info.name}</strong></div>
        {info.description && <div className="review-item"><span>Description</span><span>{info.description}</span></div>}
      </div>

      <div className="review-section">
        <h4 className="review-section-title">Positions &amp; Candidates</h4>
        {positions.map((pos, i) => (
          <div key={pos.id} className="review-position">
            <div className="review-position-name">
              <span className="review-position-num">{i + 1}</span>
              {pos.name}
            </div>
            {pos.description && <p className="text-sm text-secondary" style={{marginBottom:8}}>{pos.description}</p>}
            <div className="review-candidates">
              {pos.candidates.map(c => (
                <div key={c.id} className="review-candidate">
                  <div className="review-cand-avatar">
                    {c.imageUrl
                      ? <img src={c.imageUrl} alt={c.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:6}} />
                      : <UserCircle2 size={20} />
                    }
                  </div>
                  <div>
                    <div className="fw-500 text-sm">{c.name}</div>
                    {c.catchphrase && <div className="text-xs text-muted">"{c.catchphrase}"</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="review-section">
        <h4 className="review-section-title">Voting Period</h4>
        <div className="review-item"><span>Opens</span><strong>{fmt(period.startTime)}</strong></div>
        <div className="review-item"><span>Closes</span><strong>{fmt(period.endTime)}</strong></div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Success Screen                                               */
/* ──────────────────────────────────────────────────────────── */
function SuccessScreen({ session, onDashboard }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(session.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <AdminLayout>
      <div className="success-screen">
        <div className="success-card">
          <div className="success-icon">
            <Check size={32} />
          </div>
          <h2 className="success-title">Session Created!</h2>
          <p className="text-secondary text-sm" style={{textAlign:'center',maxWidth:320}}>
            Share this code with your community. Voters use it to register for accreditation.
          </p>

          <div className="session-code-display">
            <span className="session-code-value mono">{session.code}</span>
            <button className="btn btn-secondary btn-sm" onClick={copy} id="copy-session-code">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <p className="text-xs text-muted">
            Accreditation link: <span className="mono text-brand">/join?code={session.code}</span>
          </p>

          <div className="success-actions">
            <button className="btn btn-secondary" onClick={onDashboard} id="go-dashboard">
              Back to Dashboard
            </button>
            <a href={`/admin/sessions/${session.id}/live`} className="btn btn-primary" id="view-live-btn">
              <Eye size={15} /> View Live Page
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
