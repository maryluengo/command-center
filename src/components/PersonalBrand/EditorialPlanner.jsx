import { useState, useMemo, useEffect } from 'react'
import Modal from '../common/Modal'
import { useLocalStorage } from '../../hooks/useLocalStorage'

// ─────────────── Constants ────────────────────────────────────────────────────

const PLATFORMS = [
  { key: 'instagramFeed',    label: 'Instagram Feed',    icon: '📷', shortLabel: 'IG FEED',    tagColor: '#F0AEC4', defaultType: 'Carousel'  },
  { key: 'instagramReel',    label: 'Instagram Reel',    icon: '🎬', shortLabel: 'IG REEL',    tagColor: '#FFCFA8', defaultType: 'Reel'      },
  { key: 'instagramStories', label: 'Instagram Stories', icon: '⭕', shortLabel: 'IG STORIES', tagColor: '#C4AAED', defaultType: '5 frames'  },
  { key: 'tiktok',           label: 'TikTok',            icon: '🎵', shortLabel: 'TIKTOK',     tagColor: '#FFB5A7', defaultType: 'Video'     },
  { key: 'pinterest',        label: 'Pinterest',         icon: '📌', shortLabel: 'PINTEREST',  tagColor: '#A8C8EC', defaultType: 'Pin batch' },
  { key: 'youtubeShorts',    label: 'YouTube Shorts',    icon: '▶️', shortLabel: 'YT SHORTS',  tagColor: '#9ED8C6', defaultType: 'Short'     },
]

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

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
  if (day === 'sunday')       return 'PLAN'
  if (hasFilm)                return 'FILM DAY'
  if (cells.length === 0)     return 'REST'
  if (cells.length === 1)     return 'LIGHT'
  if (cells.length >= 4)      return 'FULL DAY'
  return 'POST DAY'
}

// ─────────────── Post Edit Modal ─────────────────────────────────────────────

function EPEditModal({ day, platform, cell, onSave, onClear, onClose }) {
  const [pillar,    setPillar]    = useState(cell?.pillar    ?? '')
  const [postType,  setPostType]  = useState(cell?.postType  ?? platform.defaultType)
  const [timeOfDay, setTimeOfDay] = useState(cell?.timeOfDay ?? '')
  const [title,     setTitle]     = useState(cell?.title     ?? '')
  const [script,    setScript]    = useState(cell?.script    ?? '')
  const [whatINeed, setWhatINeed] = useState(cell?.whatINeed ?? '')
  const [refLinks,  setRefLinks]  = useState(
    cell?.referenceLinks?.length ? cell.referenceLinks : ['']
  )
  const [notes, setNotes] = useState(cell?.notes ?? '')
  const [done,  setDone]  = useState(cell?.done  ?? false)

  const isNew = !cell

  const addRefLink    = () => setRefLinks(r => [...r, ''])
  const updateRefLink = (i, val) => setRefLinks(r => { const n = [...r]; n[i] = val; return n })
  const removeRefLink = (i) => setRefLinks(r => r.filter((_, idx) => idx !== i))

  const save = () => {
    onSave({
      ...(cell || {}),
      pillar, postType, timeOfDay: timeOfDay.trim(),
      title: title.trim(), script: script.trim(),
      whatINeed: whatINeed.trim(),
      referenceLinks: refLinks.filter(l => l.trim()),
      notes: notes.trim(), done, manuallyEdited: true,
    })
  }

  return (
    <Modal isOpen onClose={onClose} title={`${platform.icon} ${platform.label} · ${day.charAt(0).toUpperCase() + day.slice(1)}`}>

      {/* Content Pillar */}
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

      {/* Post Type + Time of Day */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Post Type</label>
          <input className="form-input" value={postType} onChange={e => setPostType(e.target.value)} placeholder={`e.g. ${platform.defaultType}`} />
        </div>
        <div className="form-group">
          <label className="form-label">Time of Day</label>
          <input className="form-input" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} placeholder="e.g. 9:00 AM" />
        </div>
      </div>

      {/* Idea / Title */}
      <div className="form-group">
        <label className="form-label">Idea / Title</label>
        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What's this post about?" autoFocus={isNew} />
      </div>

      {/* Script / Caption */}
      <div className="form-group">
        <label className="form-label">Script / Caption</label>
        <textarea className="form-input" value={script} onChange={e => setScript(e.target.value)}
          placeholder="Script outline, caption draft, key talking points…"
          rows={3} style={{ resize: 'vertical' }} />
      </div>

      {/* What I Need */}
      <div className="form-group">
        <label className="form-label">What I Need</label>
        <textarea className="form-input" value={whatINeed} onChange={e => setWhatINeed(e.target.value)}
          placeholder="Props, outfits, locations, people, apps, lighting…"
          rows={3} style={{ resize: 'vertical' }} />
      </div>

      {/* Reference Links */}
      <div className="form-group">
        <label className="form-label">Reference Links</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {refLinks.map((link, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="form-input"
                value={link}
                onChange={e => updateRefLink(i, e.target.value)}
                placeholder="https://…"
                style={{ flex: 1 }}
              />
              {refLinks.length > 1 && (
                <button type="button" onClick={() => removeRefLink(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: '1.1rem', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addRefLink}
            style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 8, padding: '3px 10px', fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer', marginTop: 2 }}>
            + Add link
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Hashtags, reminders, collab ideas…" rows={2} style={{ resize: 'vertical' }} />
      </div>

      {/* Done */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input type="checkbox" id="ep-done-check" checked={done} onChange={e => setDone(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--sage)' }} />
        <label htmlFor="ep-done-check" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer', margin: 0 }}>
          Mark as done ✓
        </label>
      </div>

      {/* Footer */}
      <div className="modal-footer">
        {!isNew && <button className="btn btn-danger btn-sm" onClick={onClear}>Delete</button>}
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save}>Save Post</button>
      </div>
    </Modal>
  )
}

// ─────────────── Post Row ─────────────────────────────────────────────────────

function EPPostRow({ platform, cell, onEdit }) {
  const [hovered, setHovered] = useState(false)
  const hasContent  = !!(cell?.title)
  const pillarColor = cell?.pillar ? PILLAR_COLORS[cell.pillar] : null

  return (
    <div
      onClick={onEdit}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        border: '1.5px solid transparent',
        transition: 'background 0.15s',
        margin: '3px 0',
      }}
    >
      {/* Platform pill */}
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
              {cell.done && (
                <span style={{ fontSize: '0.7rem', color: 'var(--sage)', fontWeight: 700, flexShrink: 0 }}>✓</span>
              )}
            </div>
            {/* Notes / script preview */}
            {(cell.notes || cell.script) && (
              <div style={{
                fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                borderLeft: `2px solid ${pillarColor || 'var(--border)'}66`,
                paddingLeft: 7, marginBottom: 3,
              }}>
                {cell.notes || cell.script}
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
              {cell.timeOfDay && (
                <span style={{ fontSize: '0.62rem', color: 'var(--text-light)' }}>
                  🕐 {cell.timeOfDay}
                </span>
              )}
              {cell.referenceLinks?.filter(l => l.trim()).length > 0 && (
                <span style={{ fontSize: '0.62rem', color: 'var(--text-light)' }}>
                  🔗 {cell.referenceLinks.filter(l => l.trim()).length} ref{cell.referenceLinks.filter(l => l.trim()).length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          {hovered && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 2, flexShrink: 0 }}>✏️</span>
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

// ─────────────── Day Card ─────────────────────────────────────────────────────

function EPDayCard({ day, dayDate, dayData, onEditCell, onUpdateNotes }) {
  const [notesVal, setNotesVal] = useState(dayData?._notes || '')

  // Sync from external changes (e.g., sync layer)
  useEffect(() => { setNotesVal(dayData?._notes || '') }, [dayData?._notes]) // eslint-disable-line

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
      <div style={{ background: 'var(--surface)', padding: '6px 6px 4px' }}>
        {PLATFORMS.map(platform => (
          <EPPostRow
            key={platform.key}
            platform={platform}
            cell={dayData?.[platform.key]}
            onEdit={() => onEditCell(day, platform.key)}
          />
        ))}
      </div>

      {/* Day notes strip */}
      <div style={{
        background: 'var(--surface)', padding: '4px 14px 10px',
        borderTop: '1px solid var(--border)',
      }}>
        <textarea
          value={notesVal}
          onChange={e => setNotesVal(e.target.value)}
          onBlur={() => onUpdateNotes(day, notesVal)}
          placeholder="Day notes — reminders, ideas, mood…"
          rows={1}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: '0.76rem', fontStyle: 'italic', color: 'var(--text-muted)',
            background: 'transparent', border: 'none',
            borderLeft: `2px solid ${isToday ? 'var(--pink)' : 'var(--border)'}`,
            paddingLeft: 8, outline: 'none',
            resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  )
}

// ─────────────── Main Component ──────────────────────────────────────────────

export default function EditorialPlanner() {
  const [data, setData] = useLocalStorage('commandCenter_personalBrandEditorial', { weeks: {} })
  const todayMonday = dateFmt(getWeekMonday(new Date()))
  const [weekKey,   setWeekKey]   = useState(todayMonday)
  const [editModal, setEditModal] = useState(null)
  const [toast,     setToast]     = useState(null)

  const weekDays      = useMemo(() => DAYS.map((_, i) => addDays(weekKey, i)), [weekKey])
  const weekData      = data.weeks?.[weekKey] || {}
  const isCurrentWeek = weekKey === todayMonday

  const weekLabel = (() => {
    const y0 = weekDays[0].getFullYear(), y6 = weekDays[6].getFullYear()
    return `${fmtMonthDay(weekDays[0])} – ${fmtMonthDay(weekDays[6])}, ${y0 === y6 ? y0 : `${y0}/${y6}`}`
  })()

  const hasAnyContent = DAYS.some(day =>
    PLATFORMS.some(p => weekData?.[day]?.[p.key]?.title)
  )

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

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

  const updateNotes = (day, notes) => {
    setData(prev => ({
      ...prev, lastUpdated: new Date().toISOString(),
      weeks: {
        ...prev.weeks,
        [weekKey]: {
          ...(prev.weeks?.[weekKey] || {}),
          [day]: { ...(prev.weeks?.[weekKey]?.[day] || {}), _notes: notes },
        },
      },
    }))
  }

  const markAllDone = () => {
    setData(prev => {
      const week = { ...(prev.weeks?.[weekKey] || {}) }
      for (const day of DAYS) {
        if (!week[day]) continue
        week[day] = Object.fromEntries(
          Object.entries(week[day]).map(([k, v]) =>
            [k, k.startsWith('_') || !v?.title ? v : { ...v, done: true }]
          )
        )
      }
      return { ...prev, lastUpdated: new Date().toISOString(), weeks: { ...prev.weeks, [weekKey]: week } }
    })
  }

  const clearWeek = () => {
    if (!window.confirm('Clear all posts for this week? This cannot be undone.')) return
    setData(prev => ({ ...prev, lastUpdated: new Date().toISOString(), weeks: { ...prev.weeks, [weekKey]: {} } }))
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            📖 Editorial Planner
          </h2>
          <p style={{ fontSize: '0.79rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Plan and capture your personal brand content week by week
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={markAllDone}>✓ Mark all done</button>
          <button className="btn btn-ghost btn-sm" onClick={clearWeek} style={{ color: 'var(--priority-high)' }}>🗑 Clear week</button>
        </div>
      </div>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm"
          onClick={() => { const d = new Date(weekKey); d.setDate(d.getDate()-7); setWeekKey(dateFmt(d)) }}>
          ← Prev
        </button>
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
        <button className="btn btn-ghost btn-sm"
          onClick={() => { const d = new Date(weekKey); d.setDate(d.getDate()+7); setWeekKey(dateFmt(d)) }}>
          Next →
        </button>
      </div>

      {/* Pillar legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {PILLARS.map(p => (
          <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: PILLAR_COLORS[p], flexShrink: 0 }} />
            {p}
          </span>
        ))}
      </div>

      {/* Empty state */}
      {!hasAnyContent && (
        <div style={{
          textAlign: 'center', padding: '14px 20px', marginBottom: 16,
          fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic',
          background: 'var(--surface-2)', borderRadius: 10, border: '1px dashed var(--border)',
        }}>
          Start adding your ideas — click any row to begin. ✨
        </div>
      )}

      {/* Day cards */}
      {DAYS.map((day, i) => (
        <EPDayCard
          key={day}
          day={day}
          dayDate={weekDays[i]}
          dayData={weekData?.[day]}
          onEditCell={(d, pk) => setEditModal({ day: d, platformKey: pk })}
          onUpdateNotes={(d, notes) => updateNotes(d, notes)}
        />
      ))}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--surface)',
          borderRadius: 24, padding: '10px 22px',
          fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          zIndex: 9999, pointerEvents: 'none', animation: 'fadeInUp 0.25s ease',
        }}>
          {toast}
        </div>
      )}

      {/* Edit modal */}
      {editModal && (() => {
        const platform = PLATFORMS.find(p => p.key === editModal.platformKey)
        const cell     = weekData?.[editModal.day]?.[editModal.platformKey]
        return (
          <EPEditModal
            day={editModal.day}
            platform={platform}
            cell={cell}
            onSave={cellData => { updateCell(editModal.day, editModal.platformKey, cellData); setEditModal(null); setToast('Saved ✓') }}
            onClear={() => { clearCell(editModal.day, editModal.platformKey); setEditModal(null) }}
            onClose={() => setEditModal(null)}
          />
        )
      })()}
    </div>
  )
}
