import { useState, useMemo } from 'react'
import Modal from '../common/Modal'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import {
  POSTS_KEY, PLATFORMS, PLATFORM_BY_KEY,
  parseLocalDate, dateFmt,
} from './postsStore'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function fmtFullDate(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString('default', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ─────────────── New / Edit Post Modal ──────────────────────────────────────

function PostModal({ initial, isNew, onSave, onDelete, onClose }) {
  const [platform, setPlatform] = useState(initial.platform)
  const [title,    setTitle]    = useState(initial.title || '')
  const [notes,    setNotes]    = useState(initial.notes || '')

  const canSave = !!title.trim()

  const save = () => {
    if (!canSave) return
    onSave({ ...initial, platform, title: title.trim(), notes: notes.trim() })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isNew ? `New Post — ${fmtFullDate(initial.date)}` : `Edit — ${fmtFullDate(initial.date)}`}
    >
      {/* Platform quick-pick */}
      <div className="form-group">
        <label className="form-label">Platform</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPlatform(p.key)}
              style={{
                padding: '6px 11px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                border: `2px solid ${p.tagColor}`,
                background: platform === p.key ? p.tagColor + '55' : 'transparent',
                fontWeight: platform === p.key ? 700 : 500,
                color: 'var(--text)', transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              <span>{p.icon}</span>{p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          className="form-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What's this post about?"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && canSave) save() }}
        />
      </div>

      {/* Notes (optional) */}
      <div className="form-group">
        <label className="form-label">Notes <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(optional)</span></label>
        <textarea
          className="form-input"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Caption draft, hook idea, references…"
          rows={3}
          style={{ resize: 'vertical' }}
        />
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 14 }}>
        Open the Editorial Planner for the full editor (script, what I need, ref links, done state…).
      </p>

      <div className="modal-footer">
        {!isNew && (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(initial.id)} style={{ marginRight: 'auto' }}>
            Delete
          </button>
        )}
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!canSave}>Save Post</button>
      </div>
    </Modal>
  )
}

// ─────────────── Main ────────────────────────────────────────────────────────

export default function BrandContentCalendar() {
  const [posts, setPosts] = useLocalStorage(POSTS_KEY, [])

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [modal,     setModal]     = useState(null)  // { mode: 'new'|'edit', post }

  const monthName = new Date(viewYear, viewMonth, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' })

  const calDays = useMemo(() => {
    const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate()
    const days = []
    for (let i = firstDay - 1; i >= 0; i--) days.push({ day: daysInPrev - i, month: viewMonth - 1, year: viewYear, other: true })
    for (let d = 1; d <= daysInMonth; d++)  days.push({ day: d, month: viewMonth, year: viewYear, other: false })
    while (days.length % 7 !== 0) days.push({ day: days.length - firstDay - daysInMonth + 1, month: viewMonth + 1, year: viewYear, other: true })
    return days
  }, [viewYear, viewMonth])

  const dayPosts = (y, m, d) => posts.filter(p => p.date === dateKey(y, m, d))
  const isToday  = (y, m, d) => y === today.getFullYear() && m === today.getMonth() && d === today.getDate()

  const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(v => v - 1)) : setViewMonth(v => v - 1)
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(v => v + 1)) : setViewMonth(v => v + 1)

  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }

  const openNew = (y, m, d) => {
    if (m < 0 || m > 11) return
    setModal({
      mode: 'new',
      post: { id: genId(), date: dateKey(y, m, d), platform: 'ig_feed', title: '', notes: '' },
    })
  }
  const openEdit = post => setModal({ mode: 'edit', post })

  const savePost = next => {
    setPosts(prev => {
      const idx = prev.findIndex(p => p.id === next.id)
      if (idx === -1) return [...prev, next]
      const copy = [...prev]; copy[idx] = { ...prev[idx], ...next }; return copy
    })
    setModal(null)
  }

  const deletePost = id => {
    if (!confirm('Delete this post? This will also remove it from the Editorial Planner.')) return
    setPosts(prev => prev.filter(p => p.id !== id))
    setModal(null)
  }

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="cal-nav" style={{ marginBottom: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹ Prev</button>
          <span className="cal-month-label">{monthName}</span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Next ›</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={goToday} style={{ marginLeft: 'auto' }}>
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="calendar-grid">
        {DAY_HEADERS.map(d => <div key={d} className="cal-day-header">{d}</div>)}
        {calDays.map((cell, i) => {
          const dp = cell.other ? [] : dayPosts(cell.year, cell.month, cell.day)
          return (
            <div
              key={i}
              className={`cal-day ${cell.other ? 'other-month' : ''} ${isToday(cell.year, cell.month, cell.day) ? 'is-today' : ''}`}
              onClick={() => !cell.other && openNew(cell.year, cell.month, cell.day)}
            >
              <div className="day-num">{cell.day}</div>
              {dp.slice(0, 3).map(post => {
                const platform = PLATFORM_BY_KEY[post.platform] || PLATFORMS[0]
                return (
                  <span
                    key={post.id}
                    onClick={ev => { ev.stopPropagation(); openEdit(post) }}
                    title={`${post.title} — ${platform.label}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: '0.63rem', padding: '2px 6px', borderRadius: 'var(--r-full)',
                      background: platform.tagColor + '55',
                      color: 'var(--text)', fontWeight: 600,
                      marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
                    }}>
                      {post.title || <em style={{ opacity: 0.7 }}>untitled</em>}
                    </span>
                    <span style={{
                      fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.03em',
                      opacity: 0.75, flexShrink: 0,
                    }}>
                      · {platform.tag}
                    </span>
                  </span>
                )
              })}
              {dp.length > 3 && (
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>+{dp.length - 3} more</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modal && (
        <PostModal
          initial={modal.post}
          isNew={modal.mode === 'new'}
          onSave={savePost}
          onDelete={deletePost}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
