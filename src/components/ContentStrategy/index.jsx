import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import Modal from '../common/Modal'
import CalendarEvents from './CalendarEvents'

// ─────────────── Constants ───────────────────────────────────────────────────

const PLATFORMS = [
  { key: 'instagramFeed',    label: 'Instagram Feed',    icon: '📷', defaultType: 'Carousel'  },
  { key: 'instagramReel',    label: 'Instagram Reel',    icon: '🎬', defaultType: 'Reel'      },
  { key: 'instagramStories', label: 'Instagram Stories', icon: '⭕', defaultType: '5 frames'  },
  { key: 'tiktok',           label: 'TikTok',            icon: '🎵', defaultType: 'Video'     },
  { key: 'pinterest',        label: 'Pinterest',         icon: '📌', defaultType: 'Pin batch' },
  { key: 'youtubeShorts',    label: 'YouTube Shorts',    icon: '▶️', defaultType: 'Short'     },
]

const DAYS      = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PILLARS = ['Fashion', 'Beauty', 'ADHD', 'María Swim']
const PILLAR_COLORS = {
  'Fashion':    '#F0AEC4',
  'Beauty':     '#FFCFA8',
  'ADHD':       '#C4AAED',
  'María Swim': '#9ED8C6',
}

// ─────────────── Helpers ─────────────────────────────────────────────────────

function getWeekMonday(date) {
  const d   = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function dateFmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d
}

function fmtMonthDay(d) {
  return d.toLocaleDateString('default', { month: 'short', day: 'numeric' })
}

function fmtLastUpdated(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─────────────── Starter content (injected into current week on first load) ──

function makeStarterWeek() {
  return {
    monday: {
      tiktok:           { postType: 'Film Day',   title: '🎬 Film Day #1 — batch 3–4 videos',          notes: 'One session, multiple videos filmed back-to-back', time: '10:00 AM', done: false, pillar: 'Fashion'    },
      instagramStories: { postType: '2 frames',   title: 'Morning outfit poll + book rec tonight',       notes: '',                                                  time: '9:00 AM',  done: false, pillar: 'Fashion'    },
    },
    tuesday: {
      tiktok:           { postType: 'Post',       title: 'Drop best video from Film Day #1',             notes: '',                                                  time: '9:00 AM',  done: false, pillar: 'Fashion'    },
      instagramReel:    { postType: 'Reel',       title: 'Cross-post TikTok as Instagram Reel',          notes: 'Adjust caption for IG audience',                    time: '10:00 AM', done: false, pillar: 'Fashion'    },
      instagramStories: { postType: '3 frames',   title: 'Wellness morning vibe',                        notes: 'BTS, morning routine, mood board',                  time: '8:30 AM',  done: false, pillar: 'Beauty'     },
    },
    wednesday: {
      tiktok:           { postType: 'Post',       title: 'Second video from Film Day #1',                notes: '',                                                  time: '9:00 AM',  done: false, pillar: 'ADHD'       },
      instagramFeed:    { postType: 'Carousel',   title: 'Style carousel — 5–7 slides',                 notes: 'Outfit breakdowns or trend roundup',                time: '11:00 AM', done: false, pillar: 'Fashion'    },
      instagramStories: { postType: '3 frames',   title: 'ShopMy link drop — new product picks',        notes: 'Tag products, add link sticker',                    time: '12:00 PM', done: false, pillar: 'Beauty'     },
    },
    thursday: {
      tiktok:           { postType: 'Film Day',   title: '🎬 Film Day #2 — batch 3–4 videos',          notes: 'Second batch of the week',                          time: '10:00 AM', done: false, pillar: 'María Swim' },
      instagramStories: { postType: '2 frames',   title: 'Question sticker — ask me anything',           notes: '',                                                  time: '3:00 PM',  done: false, pillar: 'ADHD'       },
    },
    friday: {
      tiktok:           { postType: 'Post',         title: 'Drop best video from Film Day #2',           notes: '',                                                  time: '9:00 AM',  done: false, pillar: 'Fashion'    },
      instagramReel:    { postType: 'Reel',         title: 'Cross-post or original reel',               notes: 'Hook in first 2 seconds',                           time: '10:00 AM', done: false, pillar: 'Fashion'    },
      instagramFeed:    { postType: 'Carousel',     title: 'Friday inspo — fashion or beauty',          notes: 'High-save, shareable content',                      time: '12:00 PM', done: false, pillar: 'Beauty'     },
      pinterest:        { postType: 'Pin batch',    title: '5–10 pins: fashion, beauty, swim',          notes: 'Schedule via Tailwind or batch manually',           time: '2:00 PM',  done: false, pillar: 'Fashion'    },
      youtubeShorts:    { postType: 'Batch upload', title: '2–3 Shorts from the week\'s videos',        notes: 'Add title, description, #shorts',                   time: '4:00 PM',  done: false, pillar: 'Fashion'    },
    },
    saturday: {
      instagramStories: { postType: '3–5 frames',  title: 'Window shopping diaries 🛍️',               notes: 'Casual, real, no-pressure content',                 time: '11:00 AM', done: false, pillar: 'Fashion'    },
      tiktok:           { postType: 'Optional',     title: 'Casual / fun TikTok if feeling it',         notes: 'No pressure — rest if needed',                      time: '2:00 PM',  done: false, pillar: 'ADHD'       },
    },
    sunday: {
      instagramStories: { postType: '2–3 frames',  title: 'Sunday planning + outfit poll for next week', notes: 'Preview coming content',                           time: '6:00 PM',  done: false, pillar: 'Fashion'    },
    },
  }
}

// ─────────────── Post Edit Modal ─────────────────────────────────────────────

function PostEditModal({ day, platform, cell, onSave, onClear, onClose }) {
  const [pillar,   setPillar]   = useState(cell?.pillar   ?? '')
  const [postType, setPostType] = useState(cell?.postType ?? platform.defaultType)
  const [title,    setTitle]    = useState(cell?.title    ?? '')
  const [time,     setTime]     = useState(cell?.time     ?? '')
  const [notes,    setNotes]    = useState(cell?.notes    ?? '')
  const [done,     setDone]     = useState(cell?.done     ?? false)

  const isNew   = !cell
  const color   = PILLAR_COLORS[pillar] || null
  const dayName = day.charAt(0).toUpperCase() + day.slice(1)

  const save = () => onSave({ pillar, postType, title: title.trim(), time: time.trim(), notes: notes.trim(), done, manuallyEdited: true })

  return (
    <Modal isOpen onClose={onClose} title={`${platform.icon} ${platform.label} · ${dayName}`}>
      {/* Pillar selector */}
      <div className="form-group">
        <label className="form-label">Content Pillar</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setPillar('')}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
              border: `2px solid var(--border)`,
              background: pillar === '' ? 'var(--surface-2)' : 'transparent',
              fontWeight: pillar === '' ? 700 : 400, color: 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            None
          </button>
          {PILLARS.map(p => (
            <button
              key={p}
              onClick={() => setPillar(p)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
                border: `2px solid ${PILLAR_COLORS[p]}`,
                background: pillar === p ? PILLAR_COLORS[p] + '44' : 'transparent',
                fontWeight: pillar === p ? 700 : 400, color: 'var(--text)',
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Post Type</label>
          <input
            className="form-input"
            value={postType}
            onChange={e => setPostType(e.target.value)}
            placeholder={`e.g. ${platform.defaultType}`}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Time of Day</label>
          <input
            className="form-input"
            value={time}
            onChange={e => setTime(e.target.value)}
            placeholder="e.g. 9:00 AM"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Idea / Title</label>
        <input
          className="form-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What's the post about?"
          autoFocus={isNew}
          onKeyDown={e => e.key === 'Enter' && save()}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-input"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Hashtags, reminders, captions, links…"
          rows={3}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input
          type="checkbox"
          id="cs-done-check"
          checked={done}
          onChange={e => setDone(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--sage)' }}
        />
        <label htmlFor="cs-done-check" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer', margin: 0 }}>
          Mark as done ✓
        </label>
      </div>

      <div className="modal-footer">
        {!isNew && (
          <button className="btn btn-danger btn-sm" onClick={onClear}>Clear Post</button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save}>Save Post</button>
      </div>
    </Modal>
  )
}

// ─────────────── Individual Post Cell ────────────────────────────────────────

function PostCell({ cell, platform, onClick }) {
  const color   = cell?.pillar ? PILLAR_COLORS[cell.pillar] : null
  const isEmpty = !cell || !cell.title

  if (isEmpty) {
    return (
      <div
        onClick={onClick}
        title={`Add ${platform.label} post`}
        style={{
          minHeight: 62,
          border: '1.5px dashed var(--border)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--pink)'
          e.currentTarget.style.background  = 'var(--pink-light)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.background  = 'transparent'
        }}
      >
        <span style={{ fontSize: '1.1rem', color: 'var(--text-light)', lineHeight: 1, userSelect: 'none' }}>+</span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      style={{
        minHeight: 62,
        borderRadius: 8,
        borderLeft: `3px solid ${color || 'var(--border)'}`,
        background: color ? color + '1A' : 'var(--surface-2)',
        padding: '6px 8px',
        cursor: 'pointer',
        transition: 'opacity 0.15s',
        opacity: cell.done ? 0.55 : 1,
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = cell.done ? '0.75' : '0.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = cell.done ? '0.55' : '1'}
    >
      {/* Done checkmark */}
      {cell.done && (
        <span style={{ position: 'absolute', top: 4, right: 6, fontSize: '0.68rem', color: 'var(--sage)', fontWeight: 700 }}>✓</span>
      )}
      {cell.aiGenerated && !cell.manuallyEdited && (
        <span title="AI generated" style={{ position: 'absolute', top: 4, left: 6, fontSize: '0.6rem', opacity: 0.65 }}>✨</span>
      )}

      {/* Post type pill */}
      {cell.postType && (
        <div style={{
          display: 'inline-block',
          background: color ? color + '55' : 'var(--border)',
          color: 'var(--text-muted)',
          borderRadius: 10,
          padding: '1px 6px',
          fontSize: '0.6rem',
          fontWeight: 600,
          marginBottom: 3,
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {cell.postType}
        </div>
      )}

      {/* Title */}
      <div style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        color: 'var(--text)',
        lineHeight: 1.3,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        marginBottom: cell.time ? 3 : 0,
      }}>
        {cell.title}
      </div>

      {/* Time */}
      {cell.time && (
        <div style={{ fontSize: '0.6rem', color: 'var(--text-light)' }}>
          🕐 {cell.time}
        </div>
      )}
    </div>
  )
}

// ─────────────── Main Component ──────────────────────────────────────────────

export default function ContentStrategy() {
  const [data, setData]     = useLocalStorage('commandCenter_contentStrategy', { weeks: {} })
  const [weekKey, setWeekKey] = useState(() => dateFmt(getWeekMonday(new Date())))
  const [editModal, setEditModal] = useState(null) // { day, platformKey } | null

  const [aiLoading, setAiLoading] = useState(false)
  const [aiPhase,   setAiPhase]   = useState(0)
  const [aiError,   setAiError]   = useState(null)
  const [aiToast,   setAiToast]   = useState(null) // string | null
  const phaseTimerRef = useRef(null)

  const AI_PHASES = [
    'Pulling your analytics…',
    'Balancing pillars across the week…',
    'Writing post ideas…',
  ]

  const todayMonday = dateFmt(getWeekMonday(new Date()))

  // Inject starter data for the current week on first load
  useEffect(() => {
    setData(prev => {
      const existing = prev.weeks?.[todayMonday]
      if (existing && Object.keys(existing).length > 0) return prev
      return {
        ...prev,
        lastUpdated: prev.lastUpdated || new Date().toISOString(),
        weeks: { ...prev.weeks, [todayMonday]: makeStarterWeek() },
      }
    })
  }, []) // eslint-disable-line

  // Auto-generate on Mondays (once per Monday, 3s after load)
  useEffect(() => {
    const today = new Date()
    if (today.getDay() !== 1) return // 1 = Monday
    const alreadyDone = data.aiAutoGenerated?.[todayMonday]
    if (alreadyDone) return
    const t = setTimeout(() => generateWeekWithAI(true), 3000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!aiToast) return
    const t = setTimeout(() => setAiToast(null), 4000)
    return () => clearTimeout(t)
  }, [aiToast])

  // Phase cycling animation while loading
  useEffect(() => {
    if (!aiLoading) {
      clearInterval(phaseTimerRef.current)
      setAiPhase(0)
      return
    }
    phaseTimerRef.current = setInterval(() => {
      setAiPhase(p => (p + 1) % AI_PHASES.length)
    }, 2200)
    return () => clearInterval(phaseTimerRef.current)
  }, [aiLoading]) // eslint-disable-line

  // ── AI generation ────────────────────────────────────────────────────────

  const generateWeekWithAI = async (isAuto = false) => {
    if (aiLoading) return
    setAiLoading(true)
    setAiError(null)

    // Collect manually-edited cells so AI skips them
    const currentWeekData = data.weeks?.[weekKey] || {}
    const existingCells   = {}
    for (const day of DAYS) {
      for (const plat of PLATFORMS) {
        const cell = currentWeekData?.[day]?.[plat.key]
        if (cell?.manuallyEdited) {
          if (!existingCells[day]) existingCells[day] = {}
          existingCells[day][plat.key] = cell
        }
      }
    }

    try {
      const res = await fetch('/api/ai/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:    'strategy',
          subMode: 'weeklySchedule',
          weekContext: {
            weekStartDate: weekKey,
            existingCells: Object.keys(existingCells).length > 0 ? existingCells : undefined,
          },
        }),
      })

      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'AI request failed')

      const schedule = json.data // { monday: { instagramFeed: {...}, ... }, ... }

      setData(prev => {
        const merged = { ...(prev.weeks?.[weekKey] || {}) }
        for (const day of DAYS) {
          if (!schedule[day]) continue
          merged[day] = { ...(merged[day] || {}) }
          for (const plat of PLATFORMS) {
            const aiCell = schedule[day][plat.key]
            const existing = merged[day][plat.key]
            // Don't overwrite manually edited cells
            if (existing?.manuallyEdited) continue
            if (aiCell) {
              merged[day][plat.key] = { ...aiCell, aiGenerated: true }
            }
          }
        }

        const autoRecord = isAuto
          ? { ...(prev.aiAutoGenerated || {}), [todayMonday]: true }
          : prev.aiAutoGenerated

        return {
          ...prev,
          lastUpdated: new Date().toISOString(),
          aiAutoGenerated: autoRecord,
          weeks: { ...prev.weeks, [weekKey]: merged },
        }
      })

      setAiToast(isAuto ? '✨ AI filled in your week!' : '✨ Fresh ideas generated!')
    } catch (err) {
      console.error('[ContentStrategy] AI error:', err.message)
      setAiError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  // Compute the 7 day dates for the displayed week
  const weekDays = useMemo(
    () => DAYS.map((_, i) => addDays(weekKey, i)),
    [weekKey]
  )

  const weekData      = data.weeks?.[weekKey] || {}
  const isCurrentWeek = weekKey === todayMonday
  const lastUpdated   = fmtLastUpdated(data.lastUpdated)

  const weekLabel = (() => {
    const y0 = weekDays[0].getFullYear()
    const y6 = weekDays[6].getFullYear()
    return `${fmtMonthDay(weekDays[0])} – ${fmtMonthDay(weekDays[6])}, ${y0 === y6 ? y0 : `${y0}/${y6}`}`
  })()

  // ── Mutations ────────────────────────────────────────────────────────────

  const updateCell = (day, platformKey, cellData) => {
    setData(prev => ({
      ...prev,
      lastUpdated: new Date().toISOString(),
      weeks: {
        ...prev.weeks,
        [weekKey]: {
          ...(prev.weeks?.[weekKey] || {}),
          [day]: {
            ...(prev.weeks?.[weekKey]?.[day] || {}),
            [platformKey]: cellData,
          },
        },
      },
    }))
  }

  const clearCell = (day, platformKey) => {
    setData(prev => {
      const dayData = { ...(prev.weeks?.[weekKey]?.[day] || {}) }
      delete dayData[platformKey]
      return {
        ...prev,
        lastUpdated: new Date().toISOString(),
        weeks: {
          ...prev.weeks,
          [weekKey]: { ...(prev.weeks?.[weekKey] || {}), [day]: dayData },
        },
      }
    })
  }

  const markAllDone = () => {
    setData(prev => {
      const week = { ...(prev.weeks?.[weekKey] || {}) }
      for (const day of DAYS) {
        if (week[day]) {
          week[day] = Object.fromEntries(
            Object.entries(week[day]).map(([k, v]) => [k, { ...v, done: true }])
          )
        }
      }
      return { ...prev, lastUpdated: new Date().toISOString(), weeks: { ...prev.weeks, [weekKey]: week } }
    })
  }

  const clearWeek = () => {
    if (!confirm('Clear all posts for this week? This cannot be undone.')) return
    setData(prev => ({
      ...prev,
      lastUpdated: new Date().toISOString(),
      weeks: { ...prev.weeks, [weekKey]: {} },
    }))
  }

  const goToPrevWeek = () => {
    const d = new Date(weekKey); d.setDate(d.getDate() - 7); setWeekKey(dateFmt(d))
  }
  const goToNextWeek = () => {
    const d = new Date(weekKey); d.setDate(d.getDate() + 7); setWeekKey(dateFmt(d))
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 className="section-title">Content Strategy</h1>
          <p className="section-subtitle">Your weekly plan and content calendar</p>
        </div>
        {lastUpdated && (
          <span style={{ fontSize: '0.74rem', color: 'var(--text-light)', paddingBottom: 4 }}>
            Last updated: {lastUpdated}
          </span>
        )}
      </div>

      {/* ── Weekly Posting Schedule ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        {/* Card header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              📅 This Week's Posting Schedule
            </h2>
            <p style={{ fontSize: '0.79rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Click any cell to add or edit a post · Color = content pillar
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => generateWeekWithAI(false)}
              disabled={aiLoading}
              style={{ opacity: aiLoading ? 0.6 : 1 }}
            >
              {aiLoading ? AI_PHASES[aiPhase] : '✨ Generate fresh ideas with AI'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={markAllDone}>✓ Mark all done</button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearWeek}
              style={{ color: 'var(--priority-high)' }}
            >
              🗑 Clear week
            </button>
          </div>
        </div>

        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={goToPrevWeek}>← Prev</button>
          {!isCurrentWeek && (
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekKey(todayMonday)}>This Week</button>
          )}
          <span style={{
            flex: 1, textAlign: 'center',
            fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)',
          }}>
            {weekLabel}
            {isCurrentWeek && (
              <span style={{
                marginLeft: 8, fontSize: '0.7rem', fontWeight: 500,
                color: 'var(--pink)', background: 'var(--pink-light)',
                borderRadius: 10, padding: '1px 8px',
              }}>
                Current week
              </span>
            )}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={goToNextWeek}>Next →</button>
        </div>

        {/* AI error banner */}
        {aiError && (
          <div style={{
            background: '#FFF0F0', border: '1px solid #FFCACA', borderRadius: 8,
            padding: '10px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: '0.8rem', color: '#B00',
          }}>
            <span style={{ flex: 1 }}>{aiError}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => generateWeekWithAI(false)}
              style={{ fontSize: '0.75rem', padding: '3px 10px' }}
            >
              Retry
            </button>
            <button
              onClick={() => setAiError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B00', fontSize: '1rem', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Pillar legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {PILLARS.map(p => (
            <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: PILLAR_COLORS[p], flexShrink: 0, display: 'inline-block' }} />
              {p}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
          <table style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            minWidth: 860,
            width: '100%',
          }}>
            <colgroup>
              <col style={{ width: 136 }} />
              {DAYS.map(d => <col key={d} />)}
            </colgroup>
            <thead>
              <tr>
                {/* Corner cell */}
                <th style={{
                  position: 'sticky', left: 0, zIndex: 3,
                  background: 'var(--surface-2)',
                  padding: '10px 10px',
                  borderBottom: '1px solid var(--border)',
                  borderRight: '1px solid var(--border)',
                  fontSize: '0.68rem', color: 'var(--text-light)',
                  textAlign: 'left', fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}>
                  Platform
                </th>
                {DAYS.map((day, i) => {
                  const d       = weekDays[i]
                  const isToday = dateFmt(d) === dateFmt(new Date())
                  return (
                    <th key={day} style={{
                      padding: '10px 6px',
                      borderBottom: '1px solid var(--border)',
                      borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                      background: isToday ? 'var(--pink-light)' : 'var(--surface-2)',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'var(--text)' : 'var(--text-muted)',
                      minWidth: 118,
                    }}>
                      <div>{DAY_SHORT[i]}</div>
                      <div style={{
                        fontSize: '0.67rem', fontWeight: 400, marginTop: 1,
                        color: isToday ? 'var(--pink)' : 'var(--text-light)',
                      }}>
                        {fmtMonthDay(d)}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {PLATFORMS.map((platform, pi) => (
                <tr key={platform.key}>
                  {/* Platform label — sticky left */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    background: 'var(--surface)',
                    padding: '8px 10px',
                    borderBottom: pi < PLATFORMS.length - 1 ? '1px solid var(--border)' : 'none',
                    borderRight: '1px solid var(--border)',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>{platform.icon}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{platform.label}</span>
                    </div>
                  </td>

                  {/* Day cells */}
                  {DAYS.map((day, di) => {
                    const cell = weekData?.[day]?.[platform.key]
                    return (
                      <td key={day} style={{
                        padding: 5,
                        verticalAlign: 'top',
                        background: 'var(--surface)',
                        borderBottom: pi < PLATFORMS.length - 1 ? '1px solid var(--border)' : 'none',
                        borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                      }}>
                        <PostCell
                          cell={cell}
                          platform={platform}
                          onClick={() => setEditModal({ day, platformKey: platform.key })}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 10, textAlign: 'right' }}>
          Click any cell to edit · Empty cells show + to add
        </p>
      </div>

      {/* ── Content Calendar Events ── */}
      <CalendarEvents data={data} setData={setData} />

      {/* ── Toast notification ── */}
      {aiToast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--surface)',
          borderRadius: 24, padding: '10px 22px',
          fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          zIndex: 9999, pointerEvents: 'none',
          animation: 'fadeInUp 0.25s ease',
        }}>
          {aiToast}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (() => {
        const platform = PLATFORMS.find(p => p.key === editModal.platformKey)
        const cell     = weekData?.[editModal.day]?.[editModal.platformKey]
        return (
          <PostEditModal
            day={editModal.day}
            platform={platform}
            cell={cell}
            onSave={cellData => {
              updateCell(editModal.day, editModal.platformKey, cellData)
              setEditModal(null)
            }}
            onClear={() => {
              clearCell(editModal.day, editModal.platformKey)
              setEditModal(null)
            }}
            onClose={() => setEditModal(null)}
          />
        )
      })()}
    </div>
  )
}
