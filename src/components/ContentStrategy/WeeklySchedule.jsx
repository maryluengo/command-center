import { useState, useEffect, useRef, useMemo } from 'react'
import Modal from '../common/Modal'

// ─────────────── Constants ────────────────────────────────────────────────────

const PLATFORMS = [
  { key: 'instagramFeed',    label: 'Instagram Feed',    icon: '📷', shortLabel: 'IG FEED',    tagColor: '#F0AEC4', defaultType: 'Carousel'  },
  { key: 'instagramReel',    label: 'Instagram Reel',    icon: '🎬', shortLabel: 'IG REEL',    tagColor: '#FFCFA8', defaultType: 'Reel'      },
  { key: 'instagramStories', label: 'Instagram Stories', icon: '⭕', shortLabel: 'IG STORIES', tagColor: '#C4AAED', defaultType: '5 frames'  },
  { key: 'tiktok',           label: 'TikTok',            icon: '🎵', shortLabel: 'TIKTOK',     tagColor: '#FFB5A7', defaultType: 'Video'     },
  { key: 'pinterest',        label: 'Pinterest',         icon: '📌', shortLabel: 'PINTEREST',  tagColor: '#A8C8EC', defaultType: 'Pin batch' },
  { key: 'youtubeShorts',    label: 'YouTube Shorts',    icon: '▶️', shortLabel: 'YT SHORTS',  tagColor: '#9ED8C6', defaultType: 'Short'     },
]

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_MOODS = {
  monday:    'fresh start energy',
  tuesday:   'edit + post day',
  wednesday: 'midweek momentum',
  thursday:  'connection day',
  friday:    'amplify + repurpose',
  saturday:  'flex day',
  sunday:    'plan + reset',
}

const PILLARS = ['Fashion', 'Beauty', 'ADHD', 'María Swim']
const PILLAR_COLORS = {
  Fashion: '#F0AEC4', Beauty: '#FFCFA8', ADHD: '#C4AAED', 'María Swim': '#9ED8C6',
}

const BADGE_STYLES = {
  'FILM DAY': { bg: '#FFB5A7', color: '#7A2A1A' },
  'POST DAY': { bg: '#FFCFA8', color: '#7A4A1A' },
  'FULL DAY': { bg: '#D5E8FF', color: '#1A3A7A' },
  'LIGHT':    { bg: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
  'REST':     { bg: 'var(--surface-2)', color: 'var(--text-light)', border: '1px solid var(--border)' },
  'PLAN':     { bg: '#D5F0E8', color: '#1A6A4A' },
}

const AI_PHASES = ['Pulling your analytics…', 'Balancing pillars across the week…', 'Writing post ideas…']

// ─────────────── Helpers ─────────────────────────────────────────────────────

function getWeekMonday(date) {
  const d = new Date(date), day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0, 0, 0, 0); return d
}
function dateFmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function addDays(dateStr, n) { const d = new Date(dateStr); d.setDate(d.getDate()+n); return d }
function fmtMonthDay(d) { return d.toLocaleDateString('default', { month: 'short', day: 'numeric' }) }

function getDayBadge(day, dayData) {
  const cells = PLATFORMS.map(p => dayData?.[p.key]).filter(c => c?.title)
  const hasFilm = cells.some(c =>
    (c.postType || '').toLowerCase().includes('film') ||
    (c.title    || '').toLowerCase().includes('film day')
  )
  if (day === 'sunday') return 'PLAN'
  if (hasFilm)          return 'FILM DAY'
  if (cells.length === 0) return 'REST'
  if (cells.length === 1) return 'LIGHT'
  if (cells.length >= 4)  return 'FULL DAY'
  return 'POST DAY'
}

// ─────────────── Starter Week ────────────────────────────────────────────────

export function makeStarterWeek() {
  return {
    monday: {
      tiktok:           { postType: 'Film Day',    title: '🎬 Film Day #1 — batch 3–4 videos',           notes: 'One session, multiple videos filmed back-to-back', time: '10:00 AM', done: false, pillar: 'Fashion'    },
      instagramStories: { postType: '2 frames',    title: 'Morning outfit poll + book rec tonight',        notes: '',                                                 time: '9:00 AM',  done: false, pillar: 'Fashion'    },
    },
    tuesday: {
      tiktok:           { postType: 'Post',        title: 'Drop best video from Film Day #1',              notes: '',                                                 time: '9:00 AM',  done: false, pillar: 'Fashion'    },
      instagramReel:    { postType: 'Reel',        title: 'Cross-post TikTok as Instagram Reel',           notes: 'Adjust caption for IG audience',                   time: '10:00 AM', done: false, pillar: 'Fashion'    },
      instagramStories: { postType: '3 frames',    title: 'Wellness morning vibe',                         notes: 'BTS, morning routine, mood board',                 time: '8:30 AM',  done: false, pillar: 'Beauty'     },
    },
    wednesday: {
      tiktok:           { postType: 'Post',        title: 'Second video from Film Day #1',                 notes: '',                                                 time: '9:00 AM',  done: false, pillar: 'ADHD'       },
      instagramFeed:    { postType: 'Carousel',    title: 'Style carousel — 5–7 slides',                  notes: 'Outfit breakdowns or trend roundup',               time: '11:00 AM', done: false, pillar: 'Fashion'    },
      instagramStories: { postType: '3 frames',    title: 'ShopMy link drop — new product picks',         notes: 'Tag products, add link sticker',                   time: '12:00 PM', done: false, pillar: 'Beauty'     },
    },
    thursday: {
      tiktok:           { postType: 'Film Day',    title: '🎬 Film Day #2 — batch 3–4 videos',           notes: 'Second batch of the week',                         time: '10:00 AM', done: false, pillar: 'María Swim' },
      instagramStories: { postType: '2 frames',    title: 'Question sticker — ask me anything',            notes: '',                                                 time: '3:00 PM',  done: false, pillar: 'ADHD'       },
    },
    friday: {
      tiktok:           { postType: 'Post',        title: 'Drop best video from Film Day #2',              notes: '',                                                 time: '9:00 AM',  done: false, pillar: 'Fashion'    },
      instagramReel:    { postType: 'Reel',        title: 'Cross-post or original reel',                  notes: 'Hook in first 2 seconds',                          time: '10:00 AM', done: false, pillar: 'Fashion'    },
      instagramFeed:    { postType: 'Carousel',    title: 'Friday inspo — fashion or beauty',             notes: 'High-save, shareable content',                     time: '12:00 PM', done: false, pillar: 'Beauty'     },
      pinterest:        { postType: 'Pin batch',   title: '5–10 pins: fashion, beauty, swim',             notes: 'Schedule via Tailwind or batch manually',          time: '2:00 PM',  done: false, pillar: 'Fashion'    },
      youtubeShorts:    { postType: 'Batch upload',title: '2–3 Shorts from the week\'s videos',           notes: 'Add title, description, #shorts',                  time: '4:00 PM',  done: false, pillar: 'Fashion'    },
    },
    saturday: {
      instagramStories: { postType: '3–5 frames',  title: 'Window shopping diaries 🛍️',                  notes: 'Casual, real, no-pressure content',                time: '11:00 AM', done: false, pillar: 'Fashion'    },
      tiktok:           { postType: 'Optional',    title: 'Casual / fun TikTok if feeling it',            notes: 'No pressure — rest if needed',                     time: '2:00 PM',  done: false, pillar: 'ADHD'       },
    },
    sunday: {
      instagramStories: { postType: '2–3 frames',  title: 'Sunday planning + outfit poll for next week',  notes: 'Preview coming content',                           time: '6:00 PM',  done: false, pillar: 'Fashion'    },
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
  const isNew = !cell

  const save = () => onSave({ pillar, postType, title: title.trim(), time: time.trim(), notes: notes.trim(), done, manuallyEdited: true })

  return (
    <Modal isOpen onClose={onClose} title={`${platform.icon} ${platform.label} · ${day.charAt(0).toUpperCase() + day.slice(1)}`}>
      <div className="form-group">
        <label className="form-label">Content Pillar</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setPillar('')} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
            border: '2px solid var(--border)',
            background: pillar === '' ? 'var(--surface-2)' : 'transparent',
            fontWeight: pillar === '' ? 700 : 400, color: 'var(--text-muted)', transition: 'all 0.15s',
          }}>None</button>
          {PILLARS.map(p => (
            <button key={p} onClick={() => setPillar(p)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
              border: `2px solid ${PILLAR_COLORS[p]}`,
              background: pillar === p ? PILLAR_COLORS[p] + '44' : 'transparent',
              fontWeight: pillar === p ? 700 : 400, color: 'var(--text)', transition: 'all 0.15s',
            }}>{p}</button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Post Type</label>
          <input className="form-input" value={postType} onChange={e => setPostType(e.target.value)} placeholder={`e.g. ${platform.defaultType}`} />
        </div>
        <div className="form-group">
          <label className="form-label">Time of Day</label>
          <input className="form-input" value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 9:00 AM" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Idea / Title</label>
        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What's the post about?" autoFocus={isNew} onKeyDown={e => e.key === 'Enter' && save()} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Hashtags, reminders, captions, links…" rows={3} style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input type="checkbox" id="ws-done-check" checked={done} onChange={e => setDone(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--sage)' }} />
        <label htmlFor="ws-done-check" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer', margin: 0 }}>
          Mark as done ✓
        </label>
      </div>
      <div className="modal-footer">
        {!isNew && <button className="btn btn-danger btn-sm" onClick={onClear}>Clear Post</button>}
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save}>Save Post</button>
      </div>
    </Modal>
  )
}

// ─────────────── Post Row (editorial style) ───────────────────────────────────

function PostRow({ platform, cell, isHighlighted, onClick }) {
  const [hovered, setHovered] = useState(false)
  const hasContent  = !!(cell?.title)
  const pillarColor = cell?.pillar ? PILLAR_COLORS[cell.pillar] : null

  return (
    <div
      id={`ws-row-${platform.key}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '9px 12px', borderRadius: 10, margin: '3px 0', cursor: 'pointer',
        background: isHighlighted
          ? (pillarColor ? pillarColor + '55' : 'var(--pink-light)')
          : hovered ? 'var(--surface-2)' : 'transparent',
        border: isHighlighted
          ? `1.5px solid ${pillarColor || 'var(--pink)'}88`
          : '1.5px solid transparent',
        transition: 'background 0.15s, border-color 0.15s',
        animation: isHighlighted ? 'highlightPulse 0.8s ease-in-out 3' : 'none',
      }}
    >
      {/* Platform tag pill */}
      <span style={{
        flexShrink: 0, display: 'inline-block',
        background: platform.tagColor + '55',
        borderRadius: 6, padding: '3px 7px',
        fontSize: '0.59rem', fontWeight: 700, letterSpacing: '0.04em',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
        color: 'var(--text)', marginTop: 2,
        minWidth: 76, textAlign: 'center',
      }}>
        {platform.shortLabel}
      </span>

      {hasContent ? (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              {pillarColor && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: pillarColor, flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {cell.title}
              </span>
              {cell.aiGenerated && !cell.manuallyEdited && (
                <span title="AI generated" style={{ fontSize: '0.62rem', opacity: 0.5, flexShrink: 0 }}>✨</span>
              )}
              {cell.done && (
                <span style={{ fontSize: '0.7rem', color: 'var(--sage)', fontWeight: 700, flexShrink: 0 }}>✓</span>
              )}
            </div>
            {/* Notes / idea line */}
            {cell.notes && (
              <div style={{
                fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                borderLeft: `2px solid ${pillarColor || 'var(--border)'}66`,
                paddingLeft: 7, marginBottom: 3,
              }}>
                {cell.notes}
              </div>
            )}
            {/* Meta row */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {cell.postType && (
                <span style={{
                  fontSize: '0.62rem', color: 'var(--text-light)', background: 'var(--surface-2)',
                  borderRadius: 10, padding: '1px 7px', border: '1px solid var(--border)',
                }}>
                  {cell.postType}
                </span>
              )}
              {cell.time && (
                <span style={{ fontSize: '0.62rem', color: 'var(--text-light)' }}>
                  🕐 {cell.time}
                </span>
              )}
            </div>
          </div>
          {hovered && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', flexShrink: 0, marginTop: 2 }}>✏️</span>
          )}
        </>
      ) : (
        <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-light)', fontStyle: 'italic', marginTop: 2 }}>
          + add a {platform.label} post…
        </span>
      )}
    </div>
  )
}

// ─────────────── Day Card (editorial style) ───────────────────────────────────

function DayCard({ day, dayDate, dayData, onEditCell, highlightCell }) {
  const badge     = getDayBadge(day, dayData)
  const badgeSt   = BADGE_STYLES[badge] || BADGE_STYLES['REST']
  const postCount = PLATFORMS.filter(p => dayData?.[p.key]?.title).length
  const isToday   = dateFmt(dayDate) === dateFmt(new Date())

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      border: isToday ? '2px solid var(--pink)' : '1.5px solid var(--border)',
      boxShadow: isToday ? '0 4px 20px var(--pink-light)' : 'var(--shadow-xs)',
      marginBottom: 12,
    }}>
      {/* Day header */}
      <div style={{
        background: isToday ? 'var(--pink-light)' : 'var(--surface-2)',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.65rem', fontWeight: 700, fontStyle: 'italic',
            color: 'var(--text)', lineHeight: 1,
          }}>
            {day.charAt(0).toUpperCase() + day.slice(1)}
          </div>
          <div style={{
            fontSize: '0.72rem', fontStyle: 'italic',
            color: isToday ? 'var(--pink)' : 'var(--text-muted)',
            marginTop: 3,
          }}>
            {DAY_MOODS[day]} · {fmtMonthDay(dayDate)}
            {isToday && <span style={{ fontWeight: 700 }}> · Today</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{
            background: badgeSt.bg, color: badgeSt.color,
            border: badgeSt.border || 'none',
            borderRadius: 20, padding: '4px 10px',
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap',
          }}>
            {badge}
          </span>
          <span style={{
            background: postCount > 0 ? 'var(--text)' : 'var(--border)',
            color:      postCount > 0 ? 'var(--surface)' : 'var(--text-light)',
            borderRadius: 20, padding: '4px 10px',
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap',
          }}>
            {postCount} {postCount === 1 ? 'POST' : 'POSTS'}
          </span>
        </div>
      </div>

      {/* Platform rows */}
      <div style={{ background: 'var(--surface)', padding: '6px 6px 8px' }}>
        {PLATFORMS.map(platform => {
          const isHighlighted = highlightCell?.day === day && highlightCell?.platformKey === platform.key
          return (
            <PostRow
              key={platform.key}
              platform={platform}
              cell={dayData?.[platform.key]}
              isHighlighted={isHighlighted}
              onClick={() => onEditCell(day, platform.key)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─────────────── Main Component ──────────────────────────────────────────────

export default function WeeklySchedule({
  data, setData,
  weekKey, setWeekKey,
  highlightCell,
  sectionRef,
}) {
  const [editModal, setEditModal] = useState(null) // { day, platformKey }
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPhase,   setAiPhase]   = useState(0)
  const [aiError,   setAiError]   = useState(null)
  const [aiToast,   setAiToast]   = useState(null)
  const phaseTimerRef = useRef(null)

  const todayMonday = dateFmt(getWeekMonday(new Date()))

  // Inject starter week on first load
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

  // Auto-generate on Mondays
  useEffect(() => {
    if (new Date().getDay() !== 1) return
    if (data.aiAutoGenerated?.[todayMonday]) return
    const t = setTimeout(() => generateWeekWithAI(true), 3000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line

  // Toast auto-dismiss
  useEffect(() => {
    if (!aiToast) return
    const t = setTimeout(() => setAiToast(null), 4000)
    return () => clearTimeout(t)
  }, [aiToast])

  // Phase cycling
  useEffect(() => {
    if (!aiLoading) { clearInterval(phaseTimerRef.current); setAiPhase(0); return }
    phaseTimerRef.current = setInterval(() => setAiPhase(p => (p + 1) % AI_PHASES.length), 2200)
    return () => clearInterval(phaseTimerRef.current)
  }, [aiLoading]) // eslint-disable-line

  // Scroll to highlighted cell
  useEffect(() => {
    if (!highlightCell) return
    // Scroll week to current if on a different week
    const el = document.getElementById(`ws-day-${highlightCell.day}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightCell])

  // ── Computed values ─────────────────────────────────────────────────────

  const weekDays = useMemo(() => DAYS.map((_, i) => addDays(weekKey, i)), [weekKey])
  const weekData      = data.weeks?.[weekKey] || {}
  const isCurrentWeek = weekKey === todayMonday

  const weekLabel = (() => {
    const y0 = weekDays[0].getFullYear(), y6 = weekDays[6].getFullYear()
    return `${fmtMonthDay(weekDays[0])} – ${fmtMonthDay(weekDays[6])}, ${y0 === y6 ? y0 : `${y0}/${y6}`}`
  })()

  // ── AI generation ────────────────────────────────────────────────────────

  const generateWeekWithAI = async (isAuto = false) => {
    if (aiLoading) return
    setAiLoading(true); setAiError(null)
    const existingCells = {}
    for (const day of DAYS) {
      for (const plat of PLATFORMS) {
        const cell = weekData?.[day]?.[plat.key]
        if (cell?.manuallyEdited) {
          if (!existingCells[day]) existingCells[day] = {}
          existingCells[day][plat.key] = cell
        }
      }
    }
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'strategy', subMode: 'weeklySchedule',
          weekContext: {
            weekStartDate: weekKey,
            existingCells: Object.keys(existingCells).length > 0 ? existingCells : undefined,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'AI request failed')
      const schedule = json.data
      setData(prev => {
        const merged = { ...(prev.weeks?.[weekKey] || {}) }
        for (const day of DAYS) {
          if (!schedule[day]) continue
          merged[day] = { ...(merged[day] || {}) }
          for (const plat of PLATFORMS) {
            const aiCell = schedule[day][plat.key]
            if (merged[day][plat.key]?.manuallyEdited) continue
            if (aiCell) merged[day][plat.key] = { ...aiCell, aiGenerated: true }
          }
        }
        return {
          ...prev,
          lastUpdated: new Date().toISOString(),
          aiAutoGenerated: isAuto ? { ...(prev.aiAutoGenerated || {}), [todayMonday]: true } : prev.aiAutoGenerated,
          weeks: { ...prev.weeks, [weekKey]: merged },
        }
      })
      setAiToast(isAuto ? '✨ AI filled in your week!' : '✨ Fresh ideas generated!')
    } catch (err) {
      console.error('[WeeklySchedule] AI error:', err.message)
      setAiError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  const updateCell = (day, platformKey, cellData) => {
    setData(prev => ({
      ...prev, lastUpdated: new Date().toISOString(),
      weeks: {
        ...prev.weeks,
        [weekKey]: {
          ...(prev.weeks?.[weekKey] || {}),
          [day]: { ...(prev.weeks?.[weekKey]?.[day] || {}), [platformKey]: cellData },
        },
      },
    }))
  }

  const clearCell = (day, platformKey) => {
    setData(prev => {
      const dayData = { ...(prev.weeks?.[weekKey]?.[day] || {}) }
      delete dayData[platformKey]
      return {
        ...prev, lastUpdated: new Date().toISOString(),
        weeks: { ...prev.weeks, [weekKey]: { ...(prev.weeks?.[weekKey] || {}), [day]: dayData } },
      }
    })
  }

  const markAllDone = () => {
    setData(prev => {
      const week = { ...(prev.weeks?.[weekKey] || {}) }
      for (const day of DAYS) {
        if (week[day]) {
          week[day] = Object.fromEntries(Object.entries(week[day]).map(([k, v]) => [k, { ...v, done: true }]))
        }
      }
      return { ...prev, lastUpdated: new Date().toISOString(), weeks: { ...prev.weeks, [weekKey]: week } }
    })
  }

  const clearWeek = () => {
    if (!confirm('Clear all posts for this week? This cannot be undone.')) return
    setData(prev => ({ ...prev, lastUpdated: new Date().toISOString(), weeks: { ...prev.weeks, [weekKey]: {} } }))
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div ref={sectionRef} className="card" style={{ marginBottom: 24 }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            📅 This Week's Posting Schedule
          </h2>
          <p style={{ fontSize: '0.79rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Click any row to add or edit a post · Color dots = content pillar
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => generateWeekWithAI(false)}
            disabled={aiLoading}
            style={{ opacity: aiLoading ? 0.65 : 1 }}
          >
            {aiLoading ? AI_PHASES[aiPhase] : '✨ Generate fresh ideas with AI'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={markAllDone}>✓ All done</button>
          <button className="btn btn-ghost btn-sm" onClick={clearWeek} style={{ color: 'var(--priority-high)' }}>🗑 Clear</button>
        </div>
      </div>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(weekKey); d.setDate(d.getDate()-7); setWeekKey(dateFmt(d)) }}>← Prev</button>
        {!isCurrentWeek && (
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekKey(todayMonday)}>This Week</button>
        )}
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
          {weekLabel}
          {isCurrentWeek && (
            <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 500, color: 'var(--pink)', background: 'var(--pink-light)', borderRadius: 10, padding: '1px 8px' }}>
              Current week
            </span>
          )}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(weekKey); d.setDate(d.getDate()+7); setWeekKey(dateFmt(d)) }}>Next →</button>
      </div>

      {/* AI error */}
      {aiError && (
        <div style={{
          background: '#FFF0F0', border: '1px solid #FFCACA', borderRadius: 8,
          padding: '10px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: '#B00',
        }}>
          <span style={{ flex: 1 }}>{aiError}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => generateWeekWithAI(false)} style={{ fontSize: '0.75rem', padding: '3px 10px' }}>Retry</button>
          <button onClick={() => setAiError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B00', fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Pillar legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {PILLARS.map(p => (
          <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: PILLAR_COLORS[p], flexShrink: 0 }} />
            {p}
          </span>
        ))}
      </div>

      {/* Day cards */}
      {DAYS.map((day, i) => (
        <div key={day} id={`ws-day-${day}`}>
          <DayCard
            day={day}
            dayDate={weekDays[i]}
            dayData={weekData?.[day]}
            onEditCell={(d, pk) => setEditModal({ day: d, platformKey: pk })}
            highlightCell={highlightCell}
          />
        </div>
      ))}

      {/* Toast */}
      {aiToast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--surface)',
          borderRadius: 24, padding: '10px 22px',
          fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          zIndex: 9999, pointerEvents: 'none', animation: 'fadeInUp 0.25s ease',
        }}>
          {aiToast}
        </div>
      )}

      {/* Edit modal */}
      {editModal && (() => {
        const platform = PLATFORMS.find(p => p.key === editModal.platformKey)
        const cell     = weekData?.[editModal.day]?.[editModal.platformKey]
        return (
          <PostEditModal
            day={editModal.day}
            platform={platform}
            cell={cell}
            onSave={cellData => { updateCell(editModal.day, editModal.platformKey, cellData); setEditModal(null) }}
            onClear={() => { clearCell(editModal.day, editModal.platformKey); setEditModal(null) }}
            onClose={() => setEditModal(null)}
          />
        )
      })()}
    </div>
  )
}
