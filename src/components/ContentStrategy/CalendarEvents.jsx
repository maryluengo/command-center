import { useState, useEffect, useRef, useMemo } from 'react'
import Modal from '../common/Modal'
import { DEFAULT_EVENTS } from '../../data/calendarEvents'

// ─────────────── Constants ────────────────────────────────────────────────────

const STATUSES = ['Not started', 'Planning', 'Filming', 'Done']

const STATUS_STYLES = {
  'Not started': { bg: 'var(--surface-2)',      color: 'var(--text-light)',  border: 'var(--border)'       },
  'Planning':    { bg: 'var(--lavender-light)',  color: '#6B4FBF',            border: '#C4AAED'              },
  'Filming':     { bg: 'var(--peach-light)',     color: '#B8632A',            border: '#FFCFA8'              },
  'Done':        { bg: 'var(--sage-light)',      color: '#3A7A3A',            border: '#AECBAE'              },
}

const CATEGORY_COLORS = {
  'Fashion':   '#F0AEC4',
  'Beauty':    '#FFCFA8',
  'Holiday':   '#FFE4A8',
  'Awareness': '#C4AAED',
  'Cultural':  '#9ED8C6',
  'Miami':     '#A8C8EC',
  'Shopping':  '#F4B8C8',
}

const PRIORITY_DOT = {
  high:   '#F0AEC4',
  medium: '#FFCFA8',
  low:    '#E8E0F8',
}

const PILLAR_COLORS = {
  'Fashion':    '#F0AEC4',
  'Beauty':     '#FFCFA8',
  'ADHD':       '#C4AAED',
  'María Swim': '#9ED8C6',
}

const PLATFORM_OPTIONS = ['Instagram Feed', 'Instagram Reel', 'Instagram Stories', 'TikTok', 'Pinterest', 'YouTube Shorts']

const SCHEDULE_PLATFORMS = [
  { key: 'instagramFeed',    label: 'Instagram Feed'    },
  { key: 'instagramReel',    label: 'Instagram Reel'    },
  { key: 'instagramStories', label: 'Instagram Stories' },
  { key: 'tiktok',           label: 'TikTok'            },
  { key: 'pinterest',        label: 'Pinterest'         },
  { key: 'youtubeShorts',    label: 'YouTube Shorts'    },
]
const SCHEDULE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const PILLAR_OPTIONS   = ['Fashion', 'Beauty', 'ADHD', 'María Swim']
const CATEGORY_OPTIONS = ['Fashion', 'Beauty', 'Holiday', 'Awareness', 'Cultural', 'Miami', 'Shopping']

// ─────────────── Helpers ─────────────────────────────────────────────────────

function dateFmtVal(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function genId() {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function getMonthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })
}

// Parse a YYYY-MM-DD string as local date (avoid UTC-shift issues)
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtEventDate(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString('default', { month: 'short', day: 'numeric' })
}

function getPrepDate(dateStr, leadTimeWeeks) {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() - leadTimeWeeks * 7)
  return d
}

function isThisWeek(date) {
  const today  = new Date()
  const monday = new Date(today)
  const day    = today.getDay()
  monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return date >= monday && date <= sunday
}

// ─────────────── Add / Edit Modal ────────────────────────────────────────────

function EventModal({ event, onSave, onClose }) {
  const isNew = !event

  const [name,       setName]       = useState(event?.name       ?? '')
  const [date,       setDate]       = useState(event?.date       ?? dateFmtVal(new Date()))
  const [category,   setCategory]   = useState(event?.category   ?? 'Fashion')
  const [priority,   setPriority]   = useState(event?.priority   ?? 'medium')
  const [leadTime,   setLeadTime]   = useState(String(event?.leadTimeWeeks ?? 2))
  const [desc,       setDesc]       = useState(event?.description ?? '')
  const [anglesText, setAnglesText] = useState((event?.suggestedAngles ?? []).join('\n'))
  const [platforms,  setPlatforms]  = useState(event?.suggestedPlatforms ?? [])
  const [pillars,    setPillars]    = useState(event?.suggestedPillars   ?? [])

  const toggleArr = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])

  const save = () => {
    if (!name.trim() || !date) return
    onSave({
      id: event?.id ?? genId(),
      name:               name.trim(),
      date,
      category,
      priority,
      leadTimeWeeks:      Math.max(0, parseInt(leadTime) || 0),
      description:        desc.trim(),
      suggestedAngles:    anglesText.split('\n').map(s => s.trim()).filter(Boolean),
      suggestedPlatforms: platforms,
      suggestedPillars:   pillars,
    })
  }

  const catColor = CATEGORY_COLORS[category] || '#E8E0F8'

  return (
    <Modal isOpen onClose={onClose} title={isNew ? '✦ Add Custom Event' : '✏️ Edit Event'} size="lg">
      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Event Name *</label>
          <input
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Valentine's Day"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && save()}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Lead Time (weeks)</label>
          <input
            type="number" className="form-input"
            value={leadTime} onChange={e => setLeadTime(e.target.value)}
            min={0} max={12} placeholder="2"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-input" rows={2}
          value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Why does this event matter for your content?"
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Content Angles (one per line)</label>
        <textarea
          className="form-input" rows={4}
          value={anglesText} onChange={e => setAnglesText(e.target.value)}
          placeholder={'Outfit idea or angle 1\nIdea 2\nIdea 3'}
          style={{ resize: 'vertical', fontSize: '0.83rem', lineHeight: 1.6 }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Suggested Platforms</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLATFORM_OPTIONS.map(p => {
            const on = platforms.includes(p)
            return (
              <button key={p} onClick={() => toggleArr(platforms, setPlatforms, p)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                border: `1.5px solid ${on ? 'var(--pink)' : 'var(--border)'}`,
                background: on ? 'var(--pink-light)' : 'transparent',
                color: on ? 'var(--text)' : 'var(--text-muted)', transition: 'all 0.15s',
              }}>{p}</button>
            )
          })}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Suggested Pillars</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PILLAR_OPTIONS.map(p => {
            const on = pillars.includes(p)
            const c  = PILLAR_COLORS[p]
            return (
              <button key={p} onClick={() => toggleArr(pillars, setPillars, p)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                border: `1.5px solid ${on ? c : 'var(--border)'}`,
                background: on ? c + '33' : 'transparent',
                color: on ? 'var(--text)' : 'var(--text-muted)', transition: 'all 0.15s',
              }}>{p}</button>
            )
          })}
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save}>
          {isNew ? 'Add Event' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────── Event Card ───────────────────────────────────────────────────

const AI_ANGLE_PHASES = [
  'Pulling your analytics…',
  'Matching event to your style…',
  'Writing personalized angles…',
]

// ─────────────── Add to Schedule Modal ──────────────────────────────────────

function AddToScheduleModal({ event, currentWeekData, onConfirm, onClose }) {
  const [selectedDay,  setSelectedDay]  = useState('monday')
  const [selectedPlat, setSelectedPlat] = useState('instagramFeed')
  const existing   = currentWeekData?.[selectedDay]?.[selectedPlat]
  const firstAngle = event.suggestedAngles?.[0] || event.name
  const DAY_COLORS = {
    monday: '#F0AEC4', tuesday: '#FFCFA8', wednesday: '#FFE4A8',
    thursday: '#C4AAED', friday: '#9ED8C6', saturday: '#A8C8EC', sunday: '#F4B8C8',
  }
  const doConfirm = () => {
    onConfirm({
      day: selectedDay,
      platformKey: selectedPlat,
      cellData: {
        title:    firstAngle,
        notes:    event.name + (event.description ? ` · ${event.description.slice(0, 100)}` : ''),
        pillar:   event.suggestedPillars?.[0] || '',
        postType: event.category === 'Fashion' ? 'Carousel' : event.category === 'Beauty' ? 'Reel' : 'Post',
        time: '', done: false,
      },
    })
  }
  return (
    <Modal isOpen onClose={onClose} title="📅 Add to Weekly Schedule">
      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 18 }}>
        Adding <strong>{event.name}</strong> — the first suggested angle will be used as the post idea.
      </p>
      <div className="form-group">
        <label className="form-label">Which day this week?</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SCHEDULE_DAYS.map(day => (
            <button key={day} onClick={() => setSelectedDay(day)} style={{
              padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
              fontWeight: selectedDay === day ? 700 : 400,
              background: selectedDay === day ? DAY_COLORS[day] + '66' : 'transparent',
              border: `2px solid ${selectedDay === day ? DAY_COLORS[day] : 'var(--border)'}`,
              color: 'var(--text)', transition: 'all 0.15s',
            }}>{day.charAt(0).toUpperCase() + day.slice(1, 3)}</button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Which platform?</label>
        <select className="form-select" value={selectedPlat} onChange={e => setSelectedPlat(e.target.value)}>
          {SCHEDULE_PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      {existing?.title && (
        <div style={{ background: '#FFF8E8', border: '1px solid #FFE4A8', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: '0.8rem', color: '#8A6000' }}>
          ⚠️ <strong>{existing.title}</strong> is already in that slot — confirming will replace it.
        </div>
      )}
      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', marginBottom: 4 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Will add:</div>
        <div style={{ fontSize: '0.83rem', color: 'var(--text)', fontWeight: 600 }}>{firstAngle}</div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={doConfirm}>
          Add to {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} ✨
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function EventCard({ event, status, notes, isExpanded, onToggle, onStatusCycle, onNotesSave, onEdit, onDelete, onAddToSchedule, currentWeekData }) {
  const [localNotes,        setLocalNotes]        = useState(notes ?? '')
  const [addScheduleModal,  setAddScheduleModal]  = useState(false)
  const [aiAngles,     setAiAngles]     = useState(null)    // null | angle[]
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiPhase,      setAiPhase]      = useState(0)
  const [aiError,      setAiError]      = useState(null)
  const phaseRef = useRef(null)

  useEffect(() => { setLocalNotes(notes ?? '') }, [notes])

  // Load cached angles from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`commandCenter_contentStrategy_eventAngles_${event.id}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) setAiAngles(parsed)
      }
    } catch {} // eslint-disable-line
  }, [event.id])

  // Phase cycling while loading
  useEffect(() => {
    if (!aiLoading) { clearInterval(phaseRef.current); setAiPhase(0); return }
    phaseRef.current = setInterval(() => setAiPhase(p => (p + 1) % AI_ANGLE_PHASES.length), 2200)
    return () => clearInterval(phaseRef.current)
  }, [aiLoading])

  const generateAngles = async () => {
    if (aiLoading) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:      'strategy',
          subMode:   'eventAngles',
          eventData: {
            name:               event.name,
            date:               event.date,
            category:           event.category,
            description:        event.description,
            suggestedAngles:    event.suggestedAngles,
            suggestedPlatforms: event.suggestedPlatforms,
            suggestedPillars:   event.suggestedPillars,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'AI request failed')

      const angles = json.data?.angles
      if (!Array.isArray(angles)) throw new Error('Unexpected response format')

      setAiAngles(angles)
      localStorage.setItem(
        `commandCenter_contentStrategy_eventAngles_${event.id}`,
        JSON.stringify(angles)
      )
    } catch (err) {
      setAiError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const catColor   = CATEGORY_COLORS[event.category] || '#E8E0F8'
  const dotColor   = PRIORITY_DOT[event.priority]    || '#E8E0F8'
  const statusSt   = STATUS_STYLES[status ?? 'Not started']
  const isHighPrio = event.priority === 'high'

  const prepDate   = getPrepDate(event.date, event.leadTimeWeeks ?? 2)
  const isPrepWeek = isThisWeek(prepDate)
  const prepLabel  = `Start prepping ${event.leadTimeWeeks ?? 2} week${(event.leadTimeWeeks ?? 2) !== 1 ? 's' : ''} before — start ${fmtEventDate(dateFmtVal(prepDate))}`

  return (
    <div style={{
      borderRadius: 12,
      border:       isHighPrio ? `2px solid ${catColor}` : '1.5px solid var(--border)',
      background:   isHighPrio ? catColor + '0C' : 'var(--surface)',
      marginBottom: 10,
      overflow:     'hidden',
      boxShadow:    isHighPrio ? `0 2px 14px ${catColor}55` : 'var(--shadow-xs)',
      transition:   'box-shadow 0.2s',
    }}>

      {/* ── Collapsed header row ── */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', cursor: 'pointer',
          flexWrap: 'nowrap', minWidth: 0,
        }}
      >
        {/* Priority dot */}
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: dotColor, flexShrink: 0,
          border: isHighPrio ? `2px solid ${catColor}` : 'none',
        }} />

        {/* Date pill */}
        <span style={{
          background: catColor + '33', color: 'var(--text)',
          borderRadius: 8, padding: '3px 8px',
          fontSize: '0.74rem', fontWeight: 700,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {fmtEventDate(event.date)}
        </span>

        {/* Name */}
        <span style={{
          fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)',
          flex: 1, minWidth: 0, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.name}
        </span>

        {/* Badges (hide on very small screens via flex shrink) */}
        <span style={{
          background: catColor + '44', color: 'var(--text-muted)',
          borderRadius: 20, padding: '2px 9px',
          fontSize: '0.68rem', fontWeight: 600,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {event.category}
        </span>

        {isPrepWeek && (
          <span style={{
            background: '#FFF0CC', color: '#9A7A00',
            border: '1px solid #FFE080',
            borderRadius: 20, padding: '2px 8px',
            fontSize: '0.66rem', fontWeight: 700,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            🔥 Prep this week!
          </span>
        )}

        {/* Status pill — click to cycle, stop propagation so card doesn't toggle */}
        <span
          onClick={e => { e.stopPropagation(); onStatusCycle() }}
          title="Click to change status"
          style={{
            background: statusSt.bg, color: statusSt.color,
            border: `1px solid ${statusSt.border}`,
            borderRadius: 20, padding: '3px 10px',
            fontSize: '0.68rem', fontWeight: 600,
            whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          {status ?? 'Not started'}
        </span>

        {/* Chevron */}
        <span style={{ color: 'var(--text-light)', fontSize: '0.7rem', flexShrink: 0, marginLeft: 2 }}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Prep line (visible when collapsed) */}
      {!isExpanded && (
        <div style={{ padding: '0 14px 10px 40px' }}>
          <span style={{
            fontSize: '0.69rem',
            color: isPrepWeek ? '#9A7A00' : 'var(--text-light)',
            fontWeight: isPrepWeek ? 600 : 400,
          }}>
            📋 {prepLabel}
          </span>
        </div>
      )}

      {/* ── Expanded body ── */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px 16px' }}>

          {/* Prep indicator */}
          <div style={{ marginBottom: 12 }}>
            <span style={{
              fontSize: '0.75rem',
              color: isPrepWeek ? '#9A7A00' : 'var(--text-muted)',
              fontWeight: isPrepWeek ? 700 : 400,
              background: isPrepWeek ? '#FFF0CC' : 'transparent',
              borderRadius: 8, padding: isPrepWeek ? '3px 8px' : 0,
            }}>
              📋 {prepLabel}
            </span>
          </div>

          {/* Description */}
          {event.description && (
            <p style={{
              fontSize: '0.84rem', color: 'var(--text-muted)',
              lineHeight: 1.55, marginBottom: 14,
            }}>
              {event.description}
            </p>
          )}

          {/* Content Angles — AI-powered */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 8, gap: 8, flexWrap: 'wrap',
            }}>
              <div style={{
                fontSize: '0.69rem', fontWeight: 700, color: 'var(--text)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                💡 Content Angles
              </div>
              <button
                onClick={generateAngles}
                disabled={aiLoading}
                style={{
                  fontSize: '0.73rem', fontWeight: 600, cursor: aiLoading ? 'default' : 'pointer',
                  background: 'var(--lavender-light)', color: '#6B4FBF',
                  border: '1px solid #C4AAED', borderRadius: 20,
                  padding: '3px 10px', opacity: aiLoading ? 0.65 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {aiLoading
                  ? AI_ANGLE_PHASES[aiPhase]
                  : aiAngles
                    ? '↺ Regenerate with AI'
                    : '✨ Generate with AI'}
              </button>
            </div>

            {/* Error */}
            {aiError && (
              <div style={{
                background: '#FFF0F0', border: '1px solid #FFCACA',
                borderRadius: 8, padding: '8px 12px', marginBottom: 8,
                fontSize: '0.78rem', color: '#B00',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ flex: 1 }}>{aiError}</span>
                <button
                  onClick={generateAngles}
                  style={{ fontSize: '0.73rem', background: 'none', border: '1px solid #B00', borderRadius: 12, padding: '2px 8px', cursor: 'pointer', color: '#B00' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {aiLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0.85, 0.7, 0.9, 0.75, 0.8].map((w, i) => (
                  <div key={i} style={{
                    height: 14, borderRadius: 6,
                    background: 'var(--border)',
                    width: `${w * 100}%`,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.12}s`,
                  }} />
                ))}
              </div>
            )}

            {/* AI angles */}
            {!aiLoading && aiAngles && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aiAngles.map((angle, i) => {
                  const pillarColor = PILLAR_COLORS[angle.pillar] || '#E8E0F8'
                  return (
                    <div key={i} style={{
                      borderLeft: `3px solid ${pillarColor}`,
                      background: pillarColor + '18',
                      borderRadius: '0 8px 8px 0',
                      padding: '8px 12px',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)', marginBottom: 3 }}>
                        {angle.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 5 }}>
                        {angle.description}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {angle.platform && (
                          <span style={{
                            background: 'var(--surface-2)', color: 'var(--text-muted)',
                            borderRadius: 20, padding: '1px 8px', fontSize: '0.68rem',
                            border: '1px solid var(--border)',
                          }}>
                            {angle.platform}
                          </span>
                        )}
                        {angle.postType && (
                          <span style={{
                            background: pillarColor + '44', color: 'var(--text-muted)',
                            borderRadius: 20, padding: '1px 8px', fontSize: '0.68rem',
                            border: `1px solid ${pillarColor}`,
                          }}>
                            {angle.postType}
                          </span>
                        )}
                        {angle.pillar && (
                          <span style={{
                            color: 'var(--text-light)', fontSize: '0.65rem', alignSelf: 'center',
                          }}>
                            ✦ {angle.pillar}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Fallback: static angles if no AI angles yet */}
            {!aiLoading && !aiAngles && !aiError && event.suggestedAngles?.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {event.suggestedAngles.map((angle, i) => (
                  <li key={i} style={{
                    fontSize: '0.82rem', color: 'var(--text-muted)',
                    marginBottom: 5, lineHeight: 1.45,
                  }}>
                    {angle}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Platforms + Pillars */}
          {(event.suggestedPlatforms?.length > 0 || event.suggestedPillars?.length > 0) && (
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 16 }}>
              {event.suggestedPlatforms?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.69rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    📱 Platforms
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {event.suggestedPlatforms.map(p => (
                      <span key={p} style={{
                        background: 'var(--surface-2)', color: 'var(--text-muted)',
                        borderRadius: 20, padding: '2px 9px',
                        fontSize: '0.72rem', border: '1px solid var(--border)',
                      }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {event.suggestedPillars?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.69rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    ✦ Pillars
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {event.suggestedPillars.map(p => {
                      const c = PILLAR_COLORS[p]
                      return (
                        <span key={p} style={{
                          background: c ? c + '22' : 'var(--surface-2)',
                          color: 'var(--text-muted)',
                          borderRadius: 20, padding: '2px 9px',
                          fontSize: '0.72rem',
                          border: `1px solid ${c || 'var(--border)'}`,
                        }}>{p}</span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes textarea */}
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block', marginBottom: 6,
              fontSize: '0.69rem', fontWeight: 700, color: 'var(--text)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              📝 My Notes
            </label>
            <textarea
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              onBlur={() => onNotesSave(localNotes)}
              placeholder="Add your ideas, captions, links, mood board notes…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 10px', borderRadius: 8, resize: 'vertical',
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                fontSize: '0.83rem', color: 'var(--text)', fontFamily: 'inherit',
                lineHeight: 1.5, outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--lavender)' }}
              onBlurCapture={e => { e.target.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️ Edit event</button>
            <button
              className="btn btn-sm"
              onClick={() => setAddScheduleModal(true)}
              style={{
                background: 'var(--lavender-light)', color: '#6B4FBF',
                border: '1px solid #C4AAED', borderRadius: 'var(--r-full)',
                padding: '6px 13px', fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              + Add to weekly schedule
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={onDelete}
              style={{
                background: '#FFEDEC', color: 'var(--priority-high)',
                border: '1px solid #F8CECE', borderRadius: 'var(--r-full)',
                padding: '5px 12px', fontSize: '0.78rem', cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>

          {/* Add to schedule modal */}
          {addScheduleModal && (
            <AddToScheduleModal
              event={event}
              currentWeekData={currentWeekData}
              onConfirm={payload => { onAddToSchedule(payload); setAddScheduleModal(false) }}
              onClose={() => setAddScheduleModal(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────── Main Section Component ──────────────────────────────────────

export default function CalendarEvents({ data, setData, weekKey, currentWeekData, highlightEventId, onAddToSchedule }) {
  const today = new Date()

  const [viewYear,   setViewYear]   = useState(today.getFullYear())
  const [viewMonth,  setViewMonth]  = useState(today.getMonth())
  const [expandedId, setExpandedId] = useState(null)
  const [addModal,   setAddModal]   = useState(null) // null | { event: null | eventObj }

  // Derived calendar sub-state
  const calData      = data.calendarEvents   ?? {}
  const customEvents = calData.customEvents  ?? []
  const deletedIds   = calData.deletedIds    ?? []
  const statuses     = calData.statuses      ?? {}
  const notes        = calData.notes         ?? {}

  // Jump to event from PrepThisWeek
  const didJump = useRef(false)
  useEffect(() => {
    if (!highlightEventId || didJump.current) return
    didJump.current = true
    // Find the event to navigate to the right month
    const all = [...DEFAULT_EVENTS.filter(e => !deletedIds.includes(e.id)), ...(calData.customEvents ?? [])]
    const ev  = all.find(e => e.id === highlightEventId)
    if (ev) {
      const [y, m] = ev.date.split('-').map(Number)
      setViewYear(y); setViewMonth(m - 1)
    }
    setExpandedId(highlightEventId)
    setTimeout(() => {
      document.getElementById(`cal-event-${highlightEventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      didJump.current = false
    }, 180)
  }, [highlightEventId]) // eslint-disable-line

  // Merged and sorted event list
  const allEvents = useMemo(() => {
    const defaults = DEFAULT_EVENTS.filter(e => !deletedIds.includes(e.id))
    return [...defaults, ...customEvents].sort((a, b) => a.date.localeCompare(b.date))
  }, [customEvents, deletedIds])

  // Filter to the selected month
  const monthPrefix  = `${String(viewYear).padStart(4,'0')}-${String(viewMonth+1).padStart(2,'0')}`
  const monthEvents  = allEvents.filter(e => e.date.startsWith(monthPrefix))
  const isCurrentMo  = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // ── Shared state updater ─────────────────────────────────────────────────────
  const updateCal = fn => {
    setData(prev => ({
      ...prev,
      lastUpdated:    new Date().toISOString(),
      calendarEvents: fn(prev.calendarEvents ?? {}),
    }))
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  const cycleStatus = id => {
    updateCal(cal => {
      const cur  = (cal.statuses ?? {})[id] ?? 'Not started'
      const next = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length]
      return { ...cal, statuses: { ...(cal.statuses ?? {}), [id]: next } }
    })
  }

  const saveNotes = (id, text) => {
    updateCal(cal => ({ ...cal, notes: { ...(cal.notes ?? {}), [id]: text } }))
  }

  const saveEvent = eventObj => {
    const isDefault = DEFAULT_EVENTS.some(e => e.id === eventObj.id)
    updateCal(cal => {
      const existing = (cal.customEvents ?? []).findIndex(e => e.id === eventObj.id)
      const custom   = [...(cal.customEvents ?? [])]
      if (existing >= 0) custom[existing] = eventObj
      else custom.push(eventObj)
      // If overriding a default, mark original as deleted so we use the custom version
      const deleted = isDefault
        ? [...new Set([...(cal.deletedIds ?? []), eventObj.id])]
        : (cal.deletedIds ?? [])
      return { ...cal, customEvents: custom, deletedIds: deleted }
    })
    setAddModal(null)
  }

  const deleteEvent = id => {
    if (!confirm('Delete this event?')) return
    const isDefault = DEFAULT_EVENTS.some(e => e.id === id)
    updateCal(cal => {
      const custom  = (cal.customEvents ?? []).filter(e => e.id !== id)
      const deleted = isDefault
        ? [...new Set([...(cal.deletedIds ?? []), id])]
        : (cal.deletedIds ?? [])
      return { ...cal, customEvents: custom, deletedIds: deleted }
    })
    if (expandedId === id) setExpandedId(null)
  }

  const resetToDefaults = () => {
    if (!confirm('Reset to default events? All custom events, deletions, and edits will be cleared.')) return
    updateCal(() => ({ customEvents: [], deletedIds: [], statuses: {}, notes: {} }))
    setExpandedId(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="card">
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        marginBottom: 20,
      }}>
        <div>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0,
          }}>
            🗓 Content Calendar Events
          </h2>
          <p style={{ fontSize: '0.79rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Moments worth making content around
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setAddModal({ event: null })}>
            + Add custom event
          </button>
          <button
            onClick={resetToDefaults}
            style={{
              fontSize: '0.7rem', color: 'var(--text-light)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', textDecoration: 'underline',
            }}
          >
            Reset to defaults
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={goToPrevMonth}>← Prev</button>
        {!isCurrentMo && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }}>
            This month
          </button>
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)',
          }}>
            {getMonthLabel(viewYear, viewMonth)}
          </span>
          <span style={{
            marginLeft: 10, fontSize: '0.76rem',
            color: 'var(--text-muted)',
          }}>
            {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''} this month
          </span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={goToNextMonth}>Next →</button>
      </div>

      {/* Category legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORY_OPTIONS.map(cat => (
          <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: CATEGORY_COLORS[cat], flexShrink: 0, display: 'inline-block' }} />
            {cat}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-light)' }}>
          Click status pill to cycle • Click card to expand
        </span>
      </div>

      {/* Events list */}
      {monthEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-light)' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: '0.875rem', marginBottom: 14 }}>No events this month</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setAddModal({ event: null })}>
            + Add a custom event
          </button>
        </div>
      ) : (
        <div>
          {monthEvents.map(event => (
            <div key={event.id} id={`cal-event-${event.id}`}>
              <EventCard
                event={event}
                status={statuses[event.id]}
                notes={notes[event.id]}
                isExpanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                onStatusCycle={() => cycleStatus(event.id)}
                onNotesSave={text => saveNotes(event.id, text)}
                onEdit={() => setAddModal({ event })}
                onDelete={() => deleteEvent(event.id)}
                currentWeekData={currentWeekData}
                onAddToSchedule={onAddToSchedule}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {addModal && (
        <EventModal
          event={addModal.event}
          onSave={saveEvent}
          onClose={() => setAddModal(null)}
        />
      )}
    </div>
  )
}
