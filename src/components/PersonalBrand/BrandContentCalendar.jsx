import { useState, useMemo, useEffect } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import {
  POSTS_KEY,
  dateFmt,
  usePillars, usePlatforms, colorHex, findPlatform,
} from './postsStore'
import PostEditModal from './PostEditModal'
import {
  onPostUpdated, onPostDeleted,
  handleScheduleDrop,
} from './ideaPostSync'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ─────────────── Main ────────────────────────────────────────────────────────

export default function BrandContentCalendar() {
  const [posts, setPosts] = useLocalStorage(POSTS_KEY, [])
  const [pillars]         = usePillars()
  const [platforms]       = usePlatforms()

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  // modal state: { mode: 'new'|'edit', date, post?, initialPlatformId? }
  const [modal,     setModal]     = useState(null)
  // Drag-over highlight + transient drop toast + drag-source post id.
  const [dragOver,    setDragOver]    = useState(null)  // 'YYYY-MM-DD' | null
  const [draggingId,  setDraggingId]  = useState(null)  // post id currently being dragged
  const [toast,       setToast]       = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

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
    setModal({ mode: 'new', date: dateKey(y, m, d), initialPlatformId: platforms[0]?.id || '' })
  }
  const openEdit = post => setModal({ mode: 'edit', date: post.date, post })

  const savePost = (existingId, date, cellData) => {
    const idx       = existingId ? posts.findIndex(p => p.id === existingId) : -1
    const baseline  = idx !== -1 ? posts[idx] : {}
    const id        = (existingId && idx !== -1) ? existingId : genId()
    // Prefer the date the modal returned (user may have picked a new one).
    const finalDate = (cellData && cellData.date) || date
    const updated   = { ...baseline, ...cellData, date: finalDate, id }
    setPosts(prev => {
      const i = prev.findIndex(p => p.id === id)
      if (i === -1) return [...prev, updated]
      const copy = [...prev]; copy[i] = updated; return copy
    })
    onPostUpdated(updated)
    setModal(null)
  }

  const deletePost = id => {
    if (!id) return
    if (!confirm('Delete this post? This will also remove it from the Editorial Planner.')) return
    const target = posts.find(p => p.id === id) || null
    setPosts(prev => prev.filter(p => p.id !== id))
    if (target) onPostDeleted(target)
    setModal(null)
  }

  // ─── Drag & drop ───
  // Day cells accept BOTH `content-idea` (schedule) and `calendar-post` /
  // `planner-post` (reschedule) payloads. Routing is in `handleScheduleDrop`.
  const handleDayDragOver = (e, dateStr) => {
    if (e.dataTransfer?.types?.includes('application/json')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (dragOver !== dateStr) setDragOver(dateStr)
    }
  }
  const handleDayDragLeave = (_e, dateStr) => {
    if (dragOver === dateStr) setDragOver(null)
  }
  const handleDayDrop = (e, dateStr) => {
    e.preventDefault()
    setDragOver(null)
    let payload = null
    try { payload = JSON.parse(e.dataTransfer.getData('application/json')) } catch { return }
    const result = handleScheduleDrop(payload, dateStr)
    if (result?.message) setToast(result.message)
  }

  // Drag from a calendar chip → another day (reschedule).
  const handleChipDragStart = (e, post) => {
    try {
      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'calendar-post', postId: post.id }))
      e.dataTransfer.effectAllowed = 'move'
    } catch { /* ignore */ }
    setDraggingId(post.id)
  }
  const handleChipDragEnd = () => setDraggingId(null)

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
          const dp      = cell.other ? [] : dayPosts(cell.year, cell.month, cell.day)
          const dateStr = cell.other ? null : dateKey(cell.year, cell.month, cell.day)
          const isDragOver = dateStr && dragOver === dateStr
          return (
            <div
              key={i}
              className={`cal-day ${cell.other ? 'other-month' : ''} ${isToday(cell.year, cell.month, cell.day) ? 'is-today' : ''}`}
              onClick={() => !cell.other && openNew(cell.year, cell.month, cell.day)}
              onDragOver={cell.other ? undefined : (e => handleDayDragOver(e, dateStr))}
              onDragLeave={cell.other ? undefined : (e => handleDayDragLeave(e, dateStr))}
              onDrop={cell.other ? undefined : (e => handleDayDrop(e, dateStr))}
              style={isDragOver ? {
                outline:    '2px dashed var(--lavender)',
                background: 'var(--lavender-light)',
              } : undefined}
            >
              <div className="day-num">{cell.day}</div>
              {dp.slice(0, 3).map(post => {
                const platIds = Array.isArray(post.platforms) && post.platforms.length > 0
                  ? post.platforms
                  : (post.platform ? [post.platform] : [])
                const primary = platIds[0] && findPlatform(platforms, platIds[0])
                const tagBg   = primary ? colorHex(primary.color) : '#E0E0E0'
                const tagText = platIds.length === 0
                  ? '?'
                  : platIds.length <= 2
                    ? platIds.map(id => findPlatform(platforms, id)?.short || '?').join('/')
                    : `${findPlatform(platforms, platIds[0])?.short || '?'} +${platIds.length - 1}`
                const labelTitle = platIds.map(id => findPlatform(platforms, id)?.label).filter(Boolean).join(' · ')
                return (
                  <span
                    key={post.id}
                    draggable
                    onDragStart={ev => { ev.stopPropagation(); handleChipDragStart(ev, post) }}
                    onDragEnd={handleChipDragEnd}
                    onClick={ev => { ev.stopPropagation(); openEdit(post) }}
                    title={`${post.title} — ${labelTitle || 'no platform'}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: '0.63rem', padding: '2px 6px', borderRadius: 'var(--r-full)',
                      background: tagBg + '55',
                      color: 'var(--text)', fontWeight: 600,
                      marginBottom: 2,
                      cursor: draggingId === post.id ? 'grabbing' : 'grab',
                      opacity: draggingId === post.id ? 0.5 : 1,
                      minWidth: 0, maxWidth: '100%',
                    }}
                  >
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: '1 1 auto', minWidth: 0,
                    }}>
                      {post.title || <em style={{ opacity: 0.7 }}>untitled</em>}
                    </span>
                    <span style={{
                      fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.02em',
                      opacity: 0.75, flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      ·{tagText}
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

      {/* Shared post-edit modal — same UI as Editorial Planner */}
      {modal && (
        <PostEditModal
          date={modal.date}
          cell={modal.post || null}
          pillars={pillars}
          platforms={platforms}
          initialPlatforms={modal.post ? null : (modal.initialPlatformId ? [modal.initialPlatformId] : [])}
          onSave={cellData => savePost(modal.post?.id, modal.date, cellData)}
          onClear={() => deletePost(modal.post?.id)}
          onClose={() => setModal(null)}
        />
      )}

      {/* Drop toast (shown after a drag-and-drop schedule/move) */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--surface)',
          borderRadius: 24, padding: '10px 22px',
          fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          zIndex: 9999, pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
