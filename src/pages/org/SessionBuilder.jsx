import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { useAuth } from '../../context/AuthContext'
import { uploadService } from '../../services/uploadService.js'
import AdminLayout from '../../layouts/AdminLayout'
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Upload, X, Check,
  Copy, UserCircle2, MapPin, Clock, Eye, ShieldCheck, AlertCircle,
  Info
} from 'lucide-react'
import './SessionBuilder.css'

const STEPS = ['Session Details', 'Positions & Questions', 'Candidates & Options', 'Schedule', 'Review & Publish']

function uid() { return `id-${Math.random().toString(36).slice(2, 9)}` }
function blankPosition() { return { id: uid(), name: '', description: '', candidates: [] } }
function blankCandidate() { return { id: uid(), name: '', catchphrase: '', imageUrl: null } }

function toLocalDatetimeString(isoUtcString) {
  if (!isoUtcString) return ''
  const d = new Date(isoUtcString)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toUtcIsoString(localDatetimeString) {
  if (!localDatetimeString) return ''
  const d = new Date(localDatetimeString)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

export default function SessionBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createSession, updateSession, getSession, isLoading } = useSession()
  const { org } = useAuth()

  const existing = id ? getSession(id) : null
  const isEdit = Boolean(existing)

  const [step, setStep] = useState(0)
  const [info, setInfo] = useState({
    name:        existing?.name        || '',
    description: existing?.description || '',
  })

  // Load existing positions fully — name, description, and all candidates (with their votes preserved)
  const [positions, setPositions] = useState(() => {
    if (existing?.positions?.length) {
      return existing.positions.map(p => ({
        ...p,
        candidates: (p.candidates || []).map(c => ({
          id:         c.id         || uid(),
          name:       c.name       || '',
          catchphrase:c.catchphrase || '',
          votes:      c.votes      || 0,
          imageUrl:   c.imageUrl   || c.image || null,
        })),
      }))
    }
    return [blankPosition()]
  })

  const [period, setPeriod] = useState({
    startTime: existing?.startTime ? toLocalDatetimeString(existing.startTime) : '',
    endTime:   existing?.endTime   ? toLocalDatetimeString(existing.endTime)   : '',
  })
  const [quorumThreshold, setQuorumThreshold] = useState(existing?.quorumThreshold || 50)
  const [submitted, setSubmitted] = useState(false)
  const [createdSession, setCreatedSession] = useState(null)
  const [errors, setErrors] = useState({})

  function validateStep(s) {
    const e = {}
    if (s === 0) {
      if (!info.name.trim()) e.name = 'Session name is required.'
    }
    if (s === 1) {
      positions.forEach((p, i) => {
        if (!p.name.trim()) e[`pos_${i}_name`] = 'Position or question title is required.'
      })
    }
    if (s === 2) {
      positions.forEach((p, pi) => {
        if (p.candidates.length === 0) e[`pos_${pi}_cands`] = `"${p.name || 'This position'}" needs at least one candidate or option.`
        p.candidates.forEach((c, ci) => {
          if (!c.name.trim()) e[`cand_${pi}_${ci}_name`] = 'Candidate name is required.'
        })
      })
    }
    if (s === 3) {
      if (!period.startTime) e.startTime = 'Start date & time is required.'
      if (!period.endTime)   e.endTime   = 'End date & time is required.'
      if (period.startTime && period.endTime && period.endTime <= period.startTime)
        e.endTime = 'End time must be after start time.'
      if (quorumThreshold < 25 || quorumThreshold > 75)
        e.quorumThreshold = 'Quorum must be between 25% and 75%.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1))
  }
  function back() { setStep(s => Math.max(s - 1, 0)); setErrors({}) }

  async function handleSubmit() {
    if (!validateStep(3)) { setStep(3); return }
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
      startTime: toUtcIsoString(period.startTime),
      endTime: toUtcIsoString(period.endTime),
      quorumThreshold,
      orgId: org?.id || existing?.orgId || 'org-1',
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
    return <SuccessScreen session={createdSession} isEdit={isEdit} onDashboard={() => navigate('/admin/dashboard')} />
  }

  return (
    <AdminLayout>
      <div className="builder-page">
        {/* Header */}
        <div className="builder-page-header">
          <div className="civic-seal">
            <ShieldCheck size={13} style={{ color: 'var(--brand-500)' }} />
            <span>Session Builder</span>
          </div>
          <h1 className="builder-header-title font-serif">
            {isEdit ? `Editing: ${existing.name}` : 'Create a New Voting Session'}
          </h1>
          <p className="builder-header-desc text-secondary text-sm">
            {isEdit
              ? 'Update the session details below. Changes are saved when you click "Save Changes" at the end.'
              : 'Set up positions, candidates, and a voting window. Voters can be accredited once you publish.'}
          </p>
        </div>

        {/* Stepper Navigation */}
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

        {/* Step Panel Card */}
        <div className="builder-panel card">
          <div className="builder-panel-header">
            <div>
              <span className="text-xs text-muted font-mono uppercase">Step {step + 1} of {STEPS.length}</span>
              <h2 className="builder-title font-serif">{STEPS[step]}</h2>
            </div>
            {isEdit && (
              <span className="builder-autosave-badge" style={{ color: 'var(--warning)', borderColor: 'rgba(180,83,9,0.3)', background: 'var(--warning-subtle)' }}>
                <Info size={12} /> Editing existing session
              </span>
            )}
            {!isEdit && (
              <span className="builder-autosave-badge">
                <span className="live-dot" style={{ width: 6, height: 6 }} /> Draft ready
              </span>
            )}
          </div>

          <div className="builder-body">
            {step === 0 && <StepInfo info={info} setInfo={setInfo} errors={errors} />}
            {step === 1 && <StepPositions positions={positions} setPositions={setPositions} errors={errors} />}
            {step === 2 && <StepCandidates positions={positions} setPositions={setPositions} errors={errors} />}
            {step === 3 && <StepPeriod period={period} setPeriod={setPeriod} errors={errors} quorumThreshold={quorumThreshold} setQuorumThreshold={setQuorumThreshold} />}
            {step === 4 && <StepReview info={info} positions={positions} period={period} quorumThreshold={quorumThreshold} isEdit={isEdit} />}
          </div>

          <div className="builder-footer">
            <button className="btn btn-secondary" onClick={back} disabled={step === 0} type="button">
              <ChevronLeft size={15} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={next} id="builder-next" type="button">
                Continue <ChevronRight size={15} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading} id="builder-submit" type="button">
                {isLoading ? <span className="spinner spinner-sm" /> : <ShieldCheck size={16} />}
                {isLoading ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Session'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 0 – Session Details                                     */
/* ──────────────────────────────────────────────────────────── */
function StepInfo({ info, setInfo, errors }) {
  return (
    <div className="step-content">
      <div className="form-group">
        <label className="form-label" htmlFor="session-name">
          Session / Election Name *
        </label>
        <input
          id="session-name"
          type="text"
          className={`form-input ${errors.name ? 'error' : ''}`}
          placeholder="e.g. 2026 Student Union Elections"
          value={info.name}
          onChange={e => setInfo(i => ({ ...i, name: e.target.value }))}
        />
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="session-desc">
          Description / Instructions <span className="form-label-hint">(optional)</span>
        </label>
        <textarea
          id="session-desc"
          className="form-textarea"
          placeholder="Describe this session — who can vote, what it's about, or any rules voters should know…"
          value={info.description}
          onChange={e => setInfo(i => ({ ...i, description: e.target.value }))}
          rows={4}
        />
        <span className="form-hint">This description appears at the top of the voter's ballot.</span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 1 – Positions & Questions                               */
/* ──────────────────────────────────────────────────────────── */
function StepPositions({ positions, setPositions, errors }) {
  function add() { setPositions(p => [...p, blankPosition()]) }
  function remove(posId) { setPositions(p => p.filter(pos => pos.id !== posId)) }
  function update(posId, field, value) {
    setPositions(p => p.map(pos => pos.id === posId ? { ...pos, [field]: value } : pos))
  }

  return (
    <div className="step-content">
      <p className="step-hint">
        Add every role, question, or motion that voters will choose on. You can edit or remove any of them.
      </p>
      <div className="positions-list">
        {positions.map((pos, i) => (
          <div key={pos.id} className="position-row">
            <div className="position-index-badge">{i + 1}</div>
            <div className="position-fields">
              <div className="form-group">
                <label className="form-label" htmlFor={`pos-name-${pos.id}`}>Position / Question Title *</label>
                <input
                  id={`pos-name-${pos.id}`}
                  type="text"
                  className={`form-input ${errors[`pos_${i}_name`] ? 'error' : ''}`}
                  placeholder="e.g. President / Should we approve the new constitution?"
                  value={pos.name}
                  onChange={e => update(pos.id, 'name', e.target.value)}
                />
                {errors[`pos_${i}_name`] && <span className="form-error">{errors[`pos_${i}_name`]}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor={`pos-desc-${pos.id}`}>
                  Description <span className="form-label-hint">(optional)</span>
                </label>
                <textarea
                  id={`pos-desc-${pos.id}`}
                  className="form-textarea"
                  placeholder="What does this role involve? What is this question about?"
                  value={pos.description}
                  onChange={e => update(pos.id, 'description', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            {/* Allow removal as long as there will still be at least 1 position remaining */}
            {positions.length > 1 && (
              <button
                className="btn btn-ghost btn-icon position-remove"
                onClick={() => remove(pos.id)}
                title="Remove this position"
                type="button"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={add} id="add-position" type="button">
        <Plus size={15} /> Add Position / Question
      </button>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 2 – Candidates & Options                                */
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
              <span>{pos.name || `Position ${pi + 1}`}</span>
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
                // Can always remove — user shouldn't be blocked from removing; validation step will catch if 0 remain
                canRemove={true}
              />
            ))}

            <button
              className="add-candidate-btn"
              onClick={() => addCandidate(pos.id)}
              id={`add-cand-${pos.id}`}
              type="button"
            >
              <Plus size={16} />
              <span>Add Candidate / Option</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CandidateForm({ candidate, index, posIndex, errors, onChange, onRemove, canRemove }) {
  const fileRef = useRef()
  const revokeRef = useRef(null)
  const nameKey = `cand_${posIndex}_${index}_name`
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  async function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      if (revokeRef.current) { try { revokeRef.current() } catch { /* previous preview already revoked */ } revokeRef.current = null }
      const result = await uploadService.uploadCandidatePhoto(file)
      revokeRef.current = result.revoke || null
      onChange('imageUrl', result.url)
    } catch (err) {
      setUploadError(err.message || 'Photo upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="candidate-form-card">
      {canRemove && (
        <button className="btn btn-ghost btn-icon cand-remove" onClick={onRemove} title="Remove candidate" type="button">
          <X size={14} />
        </button>
      )}

      <div className="cand-photo-area" onClick={() => !uploading && fileRef.current?.click()}>
        {candidate.imageUrl
          ? <img src={candidate.imageUrl} alt="preview" className="cand-photo-preview" />
          : (
            <div className="cand-photo-placeholder">
              <Upload size={18} />
              <span className="text-xs text-muted">{uploading ? 'Uploading…' : 'Upload Photo'}</span>
            </div>
          )
        }
        {uploadError && <span className="form-error">{uploadError}</span>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImage}
          id={`photo-${candidate.id}`}
          style={{ display: 'none' }}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`cand-name-${candidate.id}`}>Name / Option *</label>
        <input
          id={`cand-name-${candidate.id}`}
          type="text"
          className={`form-input ${errors[nameKey] ? 'error' : ''}`}
          placeholder="e.g. Amara Osei / Yes / In Favour"
          value={candidate.name}
          onChange={e => onChange('name', e.target.value)}
        />
        {errors[nameKey] && <span className="form-error">{errors[nameKey]}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`cand-phrase-${candidate.id}`}>
          Tagline / Statement <span className="form-label-hint">(optional)</span>
        </label>
        <input
          id={`cand-phrase-${candidate.id}`}
          type="text"
          className="form-input"
          placeholder="A short slogan or summary"
          value={candidate.catchphrase}
          onChange={e => onChange('catchphrase', e.target.value)}
        />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 3 – Schedule                                            */
/* ──────────────────────────────────────────────────────────── */
function StepPeriod({ period, setPeriod, errors, quorumThreshold, setQuorumThreshold }) {
  const minStart = toLocalDatetimeString(new Date().toISOString())
  return (
    <div className="step-content">
      <p className="step-hint">
        Set when voting opens and closes. Voters can be accredited before polls open, but can only cast ballots during the active window.
      </p>
      <div className="period-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="start-time">
            <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
            Voting Starts *
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
            <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
            Voting Ends *
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
      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label" htmlFor="quorum-threshold">
          Quorum Threshold (%) *
        </label>
        <input
          id="quorum-threshold"
          type="number"
          min={25}
          max={75}
          step={1}
          className={`form-input ${errors.quorumThreshold ? 'error' : ''}`}
          value={quorumThreshold}
          onChange={e => setQuorumThreshold(Number(e.target.value))}
        />
        {errors.quorumThreshold && <span className="form-error">{errors.quorumThreshold}</span>}
        <span className="form-hint">Minimum turnout required for results to be binding (25–75%, default 50%).</span>
      </div>
      <div className="period-note">
        <ShieldCheck size={16} style={{ color: 'var(--brand-500)' }} />
        <span className="text-sm text-secondary">
          Voters will receive their voting codes when polls open. Accreditation closes automatically when voting starts.
        </span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Step 4 – Review & Publish                                    */
/* ──────────────────────────────────────────────────────────── */
function StepReview({ info, positions, period, quorumThreshold, isEdit }) {
  function fmt(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="step-content review-content">
      <div className="proof-notice-box">
        <AlertCircle size={16} style={{ color: 'var(--brand-500)' }} />
        <span className="text-sm">
          {isEdit
            ? 'Review your changes below. Click "Save Changes" to apply them.'
            : 'Check everything looks right before publishing. You can go back and edit any step.'}
        </span>
      </div>

      <div className="review-section">
        <h3 className="review-section-title">Session Details</h3>
        <div className="review-item"><span>Name</span><strong>{info.name}</strong></div>
        {info.description && <div className="review-item"><span>Description</span><span>{info.description}</span></div>}
      </div>

      <div className="review-section">
        <h3 className="review-section-title">Positions & Candidates ({positions.length})</h3>
        {positions.map((pos, i) => (
          <div key={pos.id} className="review-position">
            <div className="review-position-name">
              <span className="review-position-num">{i + 1}</span>
              <strong>{pos.name || '(Untitled)'}</strong>
            </div>
            {pos.description && <p className="text-sm text-secondary" style={{ margin: '4px 0 8px' }}>{pos.description}</p>}
            <div className="review-candidates">
              {pos.candidates.length === 0 ? (
                <span className="text-xs text-muted" style={{ fontStyle: 'italic' }}>No candidates added</span>
              ) : pos.candidates.map(c => (
                <div key={c.id} className="review-candidate">
                  <div className="review-cand-avatar">
                    {c.imageUrl
                      ? <img src={c.imageUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                      : <UserCircle2 size={18} />
                    }
                  </div>
                  <div>
                    <div className="fw-600 text-sm">{c.name}</div>
                    {c.catchphrase && <div className="text-xs text-muted">"{c.catchphrase}"</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="review-section">
        <h3 className="review-section-title">Voting Window</h3>
        <div className="review-item"><span>Opens</span><strong>{fmt(period.startTime)}</strong></div>
        <div className="review-item"><span>Closes</span><strong>{fmt(period.endTime)}</strong></div>
        <div className="review-item"><span>Quorum threshold</span><strong>{quorumThreshold}%</strong></div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── */
/* Success Screen                                               */
/* ──────────────────────────────────────────────────────────── */
function SuccessScreen({ session, isEdit, onDashboard }) {
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
        <div className="success-card card">
          <div className="success-icon">
            <Check size={28} />
          </div>
          <h2 className="success-title font-serif">
            {isEdit ? 'Changes Saved' : 'Session Published'}
          </h2>
          <p className="text-secondary text-sm" style={{ textAlign: 'center', maxWidth: 360 }}>
            {isEdit
              ? 'Your session has been updated. Voters can now see the changes.'
              : 'Your session is live. Share the session code below so voters can accredit themselves and join when polling opens.'}
          </p>

          <div className="session-code-display">
            <div className="code-meta-col">
              <span className="code-label text-xs text-muted">Session Code</span>
              <span className="session-code-value mono">{session.code}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={copy} id="copy-session-code" type="button">
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <p className="text-xs text-muted">
            Voter sign-up link: <span className="mono text-brand">/join?code={session.code}</span>
          </p>

          <div className="success-actions">
            <button className="btn btn-secondary" onClick={onDashboard} id="go-dashboard" type="button">
              Back to Dashboard
            </button>
            <a href={`/admin/sessions/${session.id}/live`} className="btn btn-primary" id="view-live-btn">
              <Eye size={15} /> View Live Tally
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
