import { useState, useMemo } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import {
  POSTS_KEY,
  dateFmt,
  usePillars, usePlatforms, colorHex, findPlatform,
} from './postsStore'
import PostEditModal from './PostEditModal'

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
    setPosts(prev => {
      const idx = existingId ? prev.findIndex(p => p.id === existingId) : -1
      if (idx === -1) return [...prev, { id: existingId || genId(), date, ...cellData }]
      const copy = [...prev]
      copy[idx] = { ...prev[idx], ...cellData, date, id: prev[idx].id }
      return copy
    })
    setModal(null)
  }

  const deletePost = id => {
    if (!id) return
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
                    onClick={ev => { ev.stopPropagation(); openEdit(post) }}
                    title={`${post.title} — ${labelTitle || 'no platform'}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: '0.63rem', padding: '2px 6px', borderRadius: 'var(--r-full)',
                      background: tagBg + '55',
                      color: 'var(--text)', fontWeight: 600,
                      marginBottom: 2,
                      cursor: 'pointer',
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
    </div>
  )
}
