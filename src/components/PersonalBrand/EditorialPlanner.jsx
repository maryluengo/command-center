import { useState, useMemo, useEffect } from 'react'
import Modal from '../common/Modal'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import {
  POSTS_KEY, DAY_NOTES_KEY,
  parseLocalDate as parseLocal,
  usePillars, usePlatforms,
  findPillar, colorHex,
} from './postsStore'
import ManageModal from './ManageModal'
import PostEditModal from './PostEditModal'

// ─────────────── Constants ────────────────────────────────────────────────────

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
// parseLocalDate is imported from postsStore (avoids the UTC-midnight off-by-one bug)
function addDays(dateStr, n) { const d = parseLocal(dateStr); d.setDate(d.getDate()+n); return d }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }
function fmtMonthDay(d) { return d.toLocaleDateString('default', { month: 'short', day: 'numeric' }) }

function getDayBadge(day, dayData, platforms) {
  // Count unique posts across all platform rows (a multi-platform post
  // appears in multiple arrays; only count it once for badge thresholds).
  const seen = new Set()
  const cells = []
  for (const p of platforms) {
    for (const post of (dayData?.[p.id] || [])) {
      if (post?.title && !seen.has(post.id)) {
        seen.add(post.id)
        cells.push(post)
      }
    }
  }
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


// ─────────────── Single Post Item (one row inside a platform stack) ──────────

function EPPostItem({ platform, post, pillars, onEdit }) {
  const [hovered, setHovered] = useState(false)
  const matchedPillar = post.pillar ? findPillar(pillars, post.pillar) : null
  const pillarColor   = matchedPillar ? colorHex(matchedPillar.color) : null
  const tagBg         = colorHex(platform.color)
  const refCount      = post.referenceLinks?.filter(l => l && l.trim()).length || 0
  const mediaCount    = post.mediaLinks?.filter(l => l && l.trim()).length || 0
  const isDone        = !!(post.checklist?.posted) || post.done === true
  // Other platforms this post is also tagged on
  const otherPlats = (Array.isArray(post.platforms) ? post.platforms : [post.platform].filter(Boolean))
    .filter(id => id !== platform.id)

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
        background: tagBg + '55',
        borderRadius: 6, padding: '3px 7px',
        fontSize: '0.59rem', fontWeight: 700, letterSpacing: '0.04em',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
        color: 'var(--text)', marginTop: 2,
        minWidth: 76, textAlign: 'center',
      }}>
        {platform.label}
      </span>

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
            {post.title}
          </span>
          {isDone && (
            <span style={{ fontSize: '0.7rem', color: 'var(--sage, #2A7A4A)', fontWeight: 700, flexShrink: 0 }}>✓</span>
          )}
        </div>

        {/* Notes / script preview */}
        {(post.notes || post.script) && (
          <div style={{
            fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            borderLeft: `2px solid ${pillarColor || 'var(--border)'}66`,
            paddingLeft: 7, marginBottom: 3,
          }}>
            {post.notes || post.script}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {post.stage && post.stage !== 'idea' && (
            <span style={{
              fontSize: '0.62rem', color: 'var(--text-light)', background: 'var(--surface-2)',
              borderRadius: 10, padding: '1px 7px', border: '1px solid var(--border)',
              textTransform: 'capitalize',
            }}>{post.stage}</span>
          )}
          {post.timeOfDay && (
            <span style={{ fontSize: '0.62rem', color: 'var(--text-light)' }}>
              🕐 {post.timeOfDay}
            </span>
          )}
          {post.timeToFilm && (
            <span style={{ fontSize: '0.62rem', color: 'var(--text-light)' }}>
              🎬 {post.timeToFilm}
            </span>
          )}
          {mediaCount > 0 && (
            <span style={{ fontSize: '0.62rem', color: 'var(--text-light)' }}>
              📎 {mediaCount}
            </span>
          )}
          {refCount > 0 && (
            <span style={{ fontSize: '0.62rem', color: 'var(--text-light)' }}>
              🔗 {refCount}
            </span>
          )}
          {otherPlats.length > 0 && (
            <span title={`Also on: ${otherPlats.join(', ')}`}
              style={{
                fontSize: '0.6rem', color: 'var(--text-light)', fontWeight: 600,
                background: 'var(--surface-2)', borderRadius: 10,
                padding: '1px 7px', border: '1px dashed var(--border)',
              }}>
              +{otherPlats.length} other {otherPlats.length === 1 ? 'platform' : 'platforms'}
            </span>
          )}
        </div>
      </div>

      {hovered && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 2, flexShrink: 0 }}>✏️</span>
      )}
    </div>
  )
}

// ─────────────── Platform Row (stack of posts for one platform on one day) ───

function EPPlatformRow({ platform, posts, pillars, onEditPost, onAddPost }) {
  const [addHover, setAddHover] = useState(false)
  const tagBg = colorHex(platform.color)

  return (
    <div>
      {posts.map(post => (
        <EPPostItem
          key={post.id}
          platform={platform}
          post={post}
          pillars={pillars}
          onEdit={() => onEditPost(post)}
        />
      ))}

      {/* + Add affordance — always visible, even when posts exist */}
      <div
        onClick={onAddPost}
        onMouseEnter={() => setAddHover(true)}
        onMouseLeave={() => setAddHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
          background: addHover ? 'var(--surface-2)' : 'transparent',
          transition: 'background 0.15s',
          margin: '3px 0',
        }}
      >
        {posts.length === 0 ? (
          <>
            <span style={{
              flexShrink: 0, display: 'inline-block',
              background: tagBg + '33',
              borderRadius: 6, padding: '3px 7px',
              fontSize: '0.59rem', fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', whiteSpace: 'nowrap',
              color: 'var(--text-muted)', marginTop: 2, opacity: 0.7,
              minWidth: 76, textAlign: 'center',
            }}>
              {platform.label}
            </span>
            <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
              + add a {platform.label} post…
            </span>
          </>
        ) : (
          <span style={{
            flex: 1, fontSize: '0.72rem', color: 'var(--text-light)', fontStyle: 'italic',
            paddingLeft: 86, // align with text after platform pill
          }}>
            + add another {platform.label} post…
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────── Day Card ─────────────────────────────────────────────────────

function EPDayCard({ day, dayDate, dayData, pillars, platforms, onEditPost, onAddPost, onUpdateNotes }) {
  const [notesVal, setNotesVal] = useState(dayData?._notes || '')

  // Sync from external changes (e.g., sync layer)
  useEffect(() => { setNotesVal(dayData?._notes || '') }, [dayData?._notes]) // eslint-disable-line

  const badge     = getDayBadge(day, dayData, platforms)
  const badgeSt   = BADGE_STYLES[badge] || BADGE_STYLES['REST']
  // Count UNIQUE posts (a multi-platform post would appear in multiple arrays)
  const postCount = (() => {
    const ids = new Set()
    for (const p of platforms) for (const post of (dayData?.[p.id] || [])) {
      if (post?.title) ids.add(post.id)
    }
    return ids.size
  })()
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
        {platforms.length === 0 && (
          <div style={{
            padding: '12px', textAlign: 'center',
            fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic',
          }}>
            No platforms — add some via the ⚙ Manage button up top.
          </div>
        )}
        {platforms.map(platform => (
          <EPPlatformRow
            key={platform.id}
            platform={platform}
            posts={dayData?.[platform.id] || []}
            pillars={pillars}
            onEditPost={(post) => onEditPost(post)}
            onAddPost={() => onAddPost(day, platform.id)}
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
  // Unified store — same key the Content Calendar reads/writes.
  const [posts,    setPosts]    = useLocalStorage(POSTS_KEY,     [])
  const [dayNotes, setDayNotes] = useLocalStorage(DAY_NOTES_KEY, {})
  const [pillars]    = usePillars()
  const [platforms]  = usePlatforms()

  const todayMonday = dateFmt(getWeekMonday(new Date()))
  const [weekKey,    setWeekKey]    = useState(todayMonday)
  const [editModal,  setEditModal]  = useState(null)
  const [toast,      setToast]      = useState(null)
  const [manageOpen, setManageOpen] = useState(false)

  const weekDays      = useMemo(() => DAYS.map((_, i) => addDays(weekKey, i)), [weekKey])
  const weekDateStrs  = useMemo(() => weekDays.map(dateFmt),                   [weekDays])
  const isCurrentWeek = weekKey === todayMonday

  // Derive weekData = { monday: { ig_feed: [post, post], ig_reel: [post], _notes: "" }, ... }
  // A post tagged with multiple platforms appears in EACH of its platforms' arrays.
  // Order within an array: by timeOfDay (lexical) then by id (stable).
  const weekData = useMemo(() => {
    const byDate = {}
    for (const p of posts) {
      if (!weekDateStrs.includes(p.date)) continue
      ;(byDate[p.date] ||= []).push(p)
    }
    const w = {}
    DAYS.forEach((day, i) => {
      const date = weekDateStrs[i]
      const dayObj = { _notes: dayNotes[date] || '' }
      for (const p of byDate[date] || []) {
        const platIds = Array.isArray(p.platforms) && p.platforms.length > 0
          ? p.platforms
          : (p.platform ? [p.platform] : [])
        for (const pid of platIds) {
          (dayObj[pid] ||= []).push(p)
        }
      }
      // Sort each platform's stack so the order is stable
      for (const k of Object.keys(dayObj)) {
        if (k.startsWith('_') || !Array.isArray(dayObj[k])) continue
        dayObj[k].sort((a, b) => {
          const ta = a.timeOfDay || ''
          const tb = b.timeOfDay || ''
          if (ta !== tb) return ta < tb ? -1 : 1
          return (a.id || '') < (b.id || '') ? -1 : 1
        })
      }
      w[day] = dayObj
    })
    return w
  }, [posts, dayNotes, weekDateStrs])

  const weekLabel = (() => {
    const y0 = weekDays[0].getFullYear(), y6 = weekDays[6].getFullYear()
    return `${fmtMonthDay(weekDays[0])} – ${fmtMonthDay(weekDays[6])}, ${y0 === y6 ? y0 : `${y0}/${y6}`}`
  })()

  const hasAnyContent = DAYS.some(day =>
    platforms.some(p => (weekData?.[day]?.[p.id] || []).some(post => post?.title))
  )

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const dateForDay = day => weekDateStrs[DAYS.indexOf(day)]

  // Save a post by id. If existingId is null, create new. cellData already
  // includes platforms[], pillar, stage, checklist, etc. from the modal.
  const savePost = (existingId, date, cellData) => {
    setPosts(prev => {
      const idx = existingId ? prev.findIndex(p => p.id === existingId) : -1
      if (idx === -1) {
        return [...prev, { id: existingId || genId(), date, ...cellData }]
      }
      const next = [...prev]
      next[idx] = { ...prev[idx], ...cellData, date, id: prev[idx].id }
      return next
    })
  }

  const deletePostById = (id) => {
    if (!id) return
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const updateNotes = (day, notes) => {
    const date = dateForDay(day)
    setDayNotes(prev => {
      const next = { ...prev }
      if (notes && notes.trim()) next[date] = notes
      else                       delete next[date]
      return next
    })
  }

  const markAllDone = () => {
    const dates = new Set(weekDateStrs)
    setPosts(prev => prev.map(p => {
      if (!dates.has(p.date) || !p.title) return p
      return {
        ...p,
        done: true,           // legacy
        stage: 'posted',
        checklist: { filmed: true, edited: true, captioned: true, scheduled: true, posted: true },
      }
    }))
  }

  const clearWeek = () => {
    if (!window.confirm('Clear ALL posts for this week — both Editorial Planner and Content Calendar — for the @maryluengog brand? This cannot be undone.')) return
    const dates = new Set(weekDateStrs)
    setPosts(prev => prev.filter(p => !dates.has(p.date)))
    setDayNotes(prev => {
      const next = { ...prev }
      for (const d of dates) delete next[d]
      return next
    })
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
          <button className="btn btn-ghost btn-sm" onClick={() => setManageOpen(true)} title="Manage pillars and platforms">⚙ Manage</button>
          <button className="btn btn-ghost btn-sm" onClick={markAllDone}>✓ Mark all done</button>
          <button className="btn btn-ghost btn-sm" onClick={clearWeek} style={{ color: 'var(--priority-high)' }}>🗑 Clear week</button>
        </div>
      </div>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm"
          onClick={() => { const d = parseLocal(weekKey); d.setDate(d.getDate()-7); setWeekKey(dateFmt(d)) }}>
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
          onClick={() => { const d = parseLocal(weekKey); d.setDate(d.getDate()+7); setWeekKey(dateFmt(d)) }}>
          Next →
        </button>
      </div>

      {/* Pillar legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {pillars.map(p => (
          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: colorHex(p.color), flexShrink: 0 }} />
            {p.label}
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
          pillars={pillars}
          platforms={platforms}
          onEditPost={(post) => setEditModal({ mode: 'edit', postId: post.id, day })}
          onAddPost={(d, pk) => setEditModal({ mode: 'new', day: d, platformKey: pk })}
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
        // For edits: look up the post by id (its date is on the post itself)
        // For new: derive the date from the day-of-week
        const cell =
          editModal.mode === 'edit' && editModal.postId
            ? (posts.find(p => p.id === editModal.postId) || null)
            : null
        const date = cell?.date || dateForDay(editModal.day)
        return (
          <PostEditModal
            date={date}
            cell={cell}
            pillars={pillars}
            platforms={platforms}
            initialPlatforms={cell ? null : (editModal.platformKey ? [editModal.platformKey] : [])}
            onSave={cellData => {
              savePost(cell?.id, date, cellData)
              setEditModal(null)
              setToast('Saved ✓')
            }}
            onClear={() => {
              if (cell?.id) deletePostById(cell.id)
              setEditModal(null)
            }}
            onClose={() => setEditModal(null)}
          />
        )
      })()}

      {/* Manage pillars + platforms modal */}
      {manageOpen && <ManageModal onClose={() => setManageOpen(false)} />}
    </div>
  )
}
