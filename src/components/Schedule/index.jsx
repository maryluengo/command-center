import { useState, useMemo, useEffect, useRef } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useCustomOptions } from '../../hooks/useCustomOptions'
import { OptionsManagerButton } from '../common/OptionsManager'
import TodoList from '../common/TodoList'
import Modal from '../common/Modal'

// ─────────────── Default categories ───────────────
const DEFAULT_CATS = ['Content Batching', 'Shoot Day', 'Editing', 'Admin', 'Personal', 'Fitness', 'Free']

const CAT_COLORS_DEFAULT = {
  'Content Batching': '#C4AAED',
  'Shoot Day':        '#F0AEC4',
  'Editing':          '#FFCFA8',
  'Admin':            '#AECBAE',
  'Personal':         '#FFE4A8',
  'Fitness':          '#9ED8C6',
  'Free':             '#E8E0F8',
}
const EXTRA_COLORS = ['#F0AEC4','#C4AAED','#FFCFA8','#AECBAE','#9ED8C6','#A8C8EC','#FFE4A8','#E8E0F8']

function getCatColor(cat, all) {
  if (CAT_COLORS_DEFAULT[cat]) return CAT_COLORS_DEFAULT[cat]
  const idx = all.indexOf(cat)
  return EXTRA_COLORS[idx % EXTRA_COLORS.length]
}

// ─────────────── Calendar grid constants ───────────────
// 64px per hour = ~1.067px per minute
// Grid spans 6 AM – 11 PM (17 hours = 1088px)
const HOUR_PX    = 64
const PX_PER_MIN = HOUR_PX / 60
const START_HOUR = 6
const END_HOUR   = 23
const START_MIN  = START_HOUR * 60
const END_MIN    = END_HOUR   * 60
const TOTAL_PX   = (END_HOUR - START_HOUR) * HOUR_PX
const MIN_BLOCK_H = 20   // minimum block height in pixels
const TIME_COL_W  = 52   // width of the left time-label column

// Hours to display on the left axis
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

// ─────────────── Utility helpers ───────────────
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function dateFmt(d) {
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtMin(totalMin) {
  const h    = Math.floor(totalMin / 60)
  const m    = totalMin % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2,'0')} ${ampm}`
}

function fmtHourLabel(h) {
  if (h === 12) return '12 PM'
  if (h === 0)  return '12 AM'
  return h > 12 ? `${h-12} PM` : `${h} AM`
}

function minToTimeInput(totalMin) {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

function timeInputToMin(str) {
  if (!str) return 0
  const [h, m] = str.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function getWeekStart(date) {
  const d   = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtShort(date) {
  return date.toLocaleDateString('default', { month: 'short', day: 'numeric' })
}

// ─────────────── Migrate old slot-based storage → event objects ───────────────
function migrateToEvents(rawBlocks, blockMeta) {
  const events  = []
  const byDate  = {}

  for (const [key, cat] of Object.entries(rawBlocks || {})) {
    const parts   = key.split('-')
    const rawLast = parseInt(parts[parts.length - 1], 10)
    // Old format used hour 6–22; new format uses totalMin 360–1320
    const totalMin = rawLast <= 22 ? rawLast * 60 : rawLast
    const date     = parts.slice(0, -1).join('-')
    if (!byDate[date]) byDate[date] = []
    byDate[date].push({ totalMin, cat })
  }

  for (const [date, slots] of Object.entries(byDate)) {
    slots.sort((a, b) => a.totalMin - b.totalMin)
    let i = 0
    while (i < slots.length) {
      const { totalMin: startMin, cat } = slots[i]
      let endMin = startMin + 30
      let j = i + 1
      while (j < slots.length && slots[j].totalMin === endMin && slots[j].cat === cat) {
        endMin += 30; j++
      }
      const meta = (blockMeta || {})[`${date}-${startMin}`] || {}
      events.push({ id: genId(), date, startMin, endMin, category: cat, description: meta.description || '', details: meta.details || '' })
      i = j
    }
  }
  return events
}

// ─────────────── Add Block Modal ───────────────
function AddBlockModal({ weekDays, categories, prefill, onSave, onClose }) {
  const defaultIdx = prefill?.dayDate
    ? Math.max(0, weekDays.findIndex(d => dateFmt(d) === dateFmt(prefill.dayDate)))
    : 0

  const [dayIdx,      setDayIdx]      = useState(defaultIdx < 0 ? 0 : defaultIdx)
  const [startTime,   setStartTime]   = useState(minToTimeInput(prefill?.startMin ?? 9 * 60))
  const [endTime,     setEndTime]     = useState(minToTimeInput(prefill?.endMin   ?? 10 * 60))
  const [category,    setCategory]    = useState(categories[0] || '')
  const [description, setDescription] = useState('')
  const [details,     setDetails]     = useState('')

  const save = () => {
    if (!category) return
    const startMin = timeInputToMin(startTime)
    const endMin   = timeInputToMin(endTime)
    if (endMin <= startMin) { alert('End time must be after start time.'); return }
    onSave({ dayDate: weekDays[dayIdx] ?? weekDays[0], startMin, endMin, category, description: description.trim(), details: details.trim() })
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Time Block">
      <div className="form-group">
        <label className="form-label">Day</label>
        <select className="form-select" value={dayIdx} onChange={e => setDayIdx(Number(e.target.value))}>
          {weekDays.map((d, i) => (
            <option key={i} value={i}>
              {d.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">End Time</label>
          <input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        {category && <div style={{ width: 14, height: 14, borderRadius: '50%', background: getCatColor(category, categories), marginTop: 6 }} />}
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <input className="form-input" placeholder="e.g. Batch content for the week" value={description} onChange={e => setDescription(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
      </div>

      <div className="form-group">
        <label className="form-label">Details</label>
        <input className="form-input" placeholder="e.g. 2 videos + 1 photo" value={details} onChange={e => setDetails(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>Add Block</button>
      </div>
    </Modal>
  )
}

// ─────────────── Block Detail / Edit Modal ───────────────
function BlockDetailModal({ event, categories, onClose, onDelete, onUpdate }) {
  const [mode,        setMode]        = useState('view')
  const [startTime,   setStartTime]   = useState(minToTimeInput(event.startMin))
  const [endTime,     setEndTime]     = useState(minToTimeInput(event.endMin))
  const [category,    setCategory]    = useState(event.category)
  const [description, setDescription] = useState(event.description || '')
  const [details,     setDetails]     = useState(event.details || '')

  const color       = getCatColor(event.category, categories)
  const durationMin = event.endMin - event.startMin
  const durLabel    = durationMin >= 60
    ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ''}`
    : `${durationMin}m`

  const saveEdit = () => {
    const startMin = timeInputToMin(startTime)
    const endMin   = timeInputToMin(endTime)
    if (endMin <= startMin) { alert('End time must be after start time.'); return }
    onUpdate({ ...event, startMin, endMin, category, description: description.trim(), details: details.trim() })
  }

  if (mode === 'edit') {
    return (
      <Modal isOpen onClose={onClose} title="Edit Block">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">End Time</label>
            <input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Details</label>
          <input className="form-input" value={details} onChange={e => setDetails(e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => setMode('view')}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save Changes</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen onClose={onClose} title="Block Details">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{event.category}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        <span>🕐</span>
        <span>{fmtMin(event.startMin)} – {fmtMin(event.endMin)}</span>
        <span style={{ marginLeft: 6, fontSize: '0.76rem', color: 'var(--text-light)' }}>({durLabel})</span>
      </div>

      {event.description && (
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label className="form-label">Description</label>
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', padding: '6px 0' }}>{event.description}</div>
        </div>
      )}
      {event.details && (
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label className="form-label">Details</label>
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', padding: '6px 0' }}>{event.details}</div>
        </div>
      )}
      {!event.description && !event.details && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 12 }}>
          No description added. Hit Edit to add one.
        </p>
      )}

      <div className="modal-footer">
        <button className="btn btn-danger btn-sm" onClick={() => { onDelete(event.id); onClose() }}>Delete</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setMode('edit')}>Edit</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}

// ─────────────── Calendar Grid (Google Calendar style) ───────────────
function CalendarGrid({ events, setEvents, categories }) {
  const [weekStart,   setWeekStart]   = useState(() => getWeekStart(new Date()))
  const [view,        setView]        = useState('week')
  const [dayOffset,   setDayOffset]   = useState(() => {
    const today = new Date()
    const ws    = getWeekStart(today)
    return Math.max(0, Math.round((today - ws) / (1000 * 60 * 60 * 24)))
  })
  const [addModal,    setAddModal]    = useState(null)   // null | { prefill }
  const [detailEvent, setDetailEvent] = useState(null)
  const scrollRef = useRef(null)
  const today = new Date()

  // Current time indicator
  const nowMin = today.getHours() * 60 + today.getMinutes()
  const nowPx  = nowMin >= START_MIN && nowMin <= END_MIN
    ? (nowMin - START_MIN) * PX_PER_MIN
    : null

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current && nowPx !== null) {
      scrollRef.current.scrollTop = Math.max(0, nowPx - 120)
    }
  }, []) // eslint-disable-line

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  }), [weekStart])

  const displayDays = view === 'week' ? weekDays : [weekDays[dayOffset]]

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }

  const isToday = d =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth()    &&
    d.getDate()     === today.getDate()

  const getEventsForDay = d => events.filter(e => e.date === dateFmt(d))

  // Click on empty grid area → snap to nearest 15 min and open add modal
  const handleGridClick = (e, dayDate) => {
    if (e.target !== e.currentTarget) return
    const y          = e.nativeEvent.offsetY
    const clickMin   = Math.round(y / PX_PER_MIN) + START_MIN
    const snappedMin = Math.round(clickMin / 15) * 15
    const startMin   = Math.max(START_MIN, Math.min(END_MIN - 30, snappedMin))
    const endMin     = Math.min(END_MIN, startMin + 60)
    setAddModal({ prefill: { dayDate, startMin, endMin } })
  }

  const handleAddBlock = ({ dayDate, startMin, endMin, category, description, details }) => {
    setEvents(prev => [...prev, { id: genId(), date: dateFmt(dayDate), startMin, endMin, category, description, details }])
    setAddModal(null)
  }

  const handleDelete = id => setEvents(prev => prev.filter(e => e.id !== id))

  const handleUpdate = updated => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
    setDetailEvent(null)
  }

  const yearStr   = weekDays[0].getFullYear() === weekDays[6].getFullYear()
    ? ` ${weekDays[0].getFullYear()}`
    : ` ${weekDays[0].getFullYear()}–${weekDays[6].getFullYear()}`
  const weekLabel = view === 'week'
    ? `${fmtShort(weekDays[0])} – ${fmtShort(weekDays[6])}${yearStr}`
    : weekDays[dayOffset].toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div>
      {/* ── Controls bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Weekly</button>
          <button className={`tab ${view === 'day'  ? 'active' : ''}`} onClick={() => setView('day')}>Daily</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={prevWeek}>‹</button>
        <span className="week-label">{weekLabel}</span>
        <button className="btn btn-ghost btn-sm" onClick={nextWeek}>›</button>
        {view === 'day' && (
          <select className="form-select" style={{ width: 'auto' }} value={dayOffset} onChange={e => setDayOffset(Number(e.target.value))}>
            {weekDays.map((d, i) => (
              <option key={i} value={i}>{d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}</option>
            ))}
          </select>
        )}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setAddModal({ prefill: null })}>
          + Add Block
        </button>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {categories.map(cat => (
          <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: getCatColor(cat, categories), flexShrink: 0 }} />
            {cat}
          </span>
        ))}
        <span style={{ marginLeft: 'auto' }}>
          <OptionsManagerButton optionsKey="schedule-cats" defaults={DEFAULT_CATS} label="Schedule Categories" />
        </span>
      </div>

      {/* ── Calendar body ── */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
        <div style={{ minWidth: view === 'week' ? 620 : 280 }}>

          {/* Sticky day-header row */}
          <div style={{
            display:         'grid',
            gridTemplateColumns: `${TIME_COL_W}px repeat(${displayDays.length}, 1fr)`,
            position:        'sticky',
            top:             0,
            zIndex:          10,
            background:      'var(--surface)',
            borderBottom:    '2px solid var(--border)',
          }}>
            <div style={{ borderRight: '1px solid var(--border)' }} />
            {displayDays.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: isToday(d) ? 'var(--pink)' : 'var(--text-muted)' }}>
                  {d.toLocaleDateString('default', { weekday: 'short' })}
                </div>
                <div style={{
                  fontSize:        '1.05rem',
                  fontWeight:      700,
                  color:           isToday(d) ? 'white' : 'var(--text)',
                  width:           28, height: 28,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  borderRadius:    '50%',
                  background:      isToday(d) ? 'var(--pink)' : 'transparent',
                  margin:          '3px auto 0',
                }}>
                  {d.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable grid body */}
          <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 360px)', minHeight: 380 }}>
            <div style={{
              display:             'grid',
              gridTemplateColumns: `${TIME_COL_W}px repeat(${displayDays.length}, 1fr)`,
            }}>
              {/* Time-label column */}
              <div style={{ position: 'relative', height: TOTAL_PX, borderRight: '1px solid var(--border)' }}>
                {HOURS.map(h => (
                  <div key={h} style={{
                    position:   'absolute',
                    top:        (h - START_HOUR) * HOUR_PX - 7,
                    right:      6,
                    fontSize:   '0.6rem',
                    color:      'var(--text-light)',
                    lineHeight: 1,
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}>
                    {fmtHourLabel(h)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {displayDays.map((d, di) => {
                const dayEvents = getEventsForDay(d)
                return (
                  <div
                    key={di}
                    style={{
                      position:  'relative',
                      height:    TOTAL_PX,
                      borderLeft: '1px solid var(--border)',
                      cursor:    'crosshair',
                      boxSizing: 'border-box',
                    }}
                    onClick={e => handleGridClick(e, d)}
                  >
                    {/* Hour lines */}
                    {HOURS.map(h => (
                      <div key={h} style={{
                        position:     'absolute',
                        top:          (h - START_HOUR) * HOUR_PX,
                        left: 0, right: 0, height: 1,
                        background:   'var(--border)',
                        pointerEvents:'none',
                      }} />
                    ))}
                    {/* Half-hour dashed lines */}
                    {HOURS.map(h => (
                      <div key={`hh${h}`} style={{
                        position:     'absolute',
                        top:          (h - START_HOUR) * HOUR_PX + HOUR_PX / 2,
                        left: 0, right: 0, height: 1,
                        borderTop:    '1px dashed rgba(196,170,237,0.18)',
                        pointerEvents:'none',
                      }} />
                    ))}

                    {/* Current time indicator */}
                    {isToday(d) && nowPx !== null && (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: nowPx, zIndex: 3, pointerEvents: 'none' }}>
                        <div style={{ position: 'relative', height: 2, background: 'var(--pink)' }}>
                          <div style={{ position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--pink)' }} />
                        </div>
                      </div>
                    )}

                    {/* Event blocks — absolutely positioned at exact time */}
                    {dayEvents.map(ev => {
                      const top    = Math.max(0, (ev.startMin - START_MIN) * PX_PER_MIN)
                      const height = Math.max(MIN_BLOCK_H, (ev.endMin - ev.startMin) * PX_PER_MIN)
                      const color  = getCatColor(ev.category, categories)
                      return (
                        <div
                          key={ev.id}
                          style={{
                            position:   'absolute',
                            top, height,
                            left: 2, right: 2,
                            background: color + 'CC',
                            borderLeft: `3px solid ${color}`,
                            borderRadius: 4,
                            padding:    '3px 6px',
                            cursor:     'pointer',
                            overflow:   'hidden',
                            boxShadow:  '0 1px 3px rgba(0,0,0,0.12)',
                            zIndex:     2,
                            boxSizing:  'border-box',
                            transition: 'opacity 0.1s',
                          }}
                          onClick={e => { e.stopPropagation(); setDetailEvent(ev) }}
                          title={`${ev.category} · ${fmtMin(ev.startMin)}–${fmtMin(ev.endMin)}`}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.category}
                          </div>
                          {height >= 38 && (
                            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {fmtMin(ev.startMin)}–{fmtMin(ev.endMin)}
                            </div>
                          )}
                          {height >= 56 && ev.description && (
                            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                              {ev.description}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 6, textAlign: 'right' }}>
        Click the calendar to add a block · Click a block to view, edit, or delete
      </p>

      {/* Modals */}
      {addModal && (
        <AddBlockModal
          weekDays={weekDays}
          categories={categories}
          prefill={addModal.prefill}
          onSave={handleAddBlock}
          onClose={() => setAddModal(null)}
        />
      )}
      {detailEvent && (
        <BlockDetailModal
          event={detailEvent}
          categories={categories}
          onClose={() => setDetailEvent(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}

// ─────────────── Medication Tracker ───────────────
const MED_TIMES = [
  '5:00 AM','6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
  '6:00 PM','7:00 PM','8:00 PM','9:00 PM','10:00 PM',
]
const MED_PALETTE = ['#F0AEC4','#C4AAED','#9ED8C6','#FFCFA8','#AECBAE','#A8C8EC','#FFE4A8']

function MedTracker() {
  const [meds, setMeds]       = useLocalStorage('meds-list', [])
  const [logs, setLogs]       = useLocalStorage('meds-logs', {})
  const [showAdd, setShowAdd] = useState(false)
  const [newMed, setNewMed]   = useState({ name: '', time: '8:00 AM' })

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayLog = logs[todayKey] || {}

  const taken   = meds.filter(m =>  todayLog[m.id])
  const pending = meds.filter(m => !todayLog[m.id])
  const pct     = meds.length ? Math.round((taken.length / meds.length) * 100) : 0

  const toggle = id => setLogs(p => ({ ...p, [todayKey]: { ...todayLog, [id]: !todayLog[id] } }))
  const del    = id => setMeds(p => p.filter(m => m.id !== id))

  const addMed = () => {
    if (!newMed.name.trim()) return
    setMeds(p => [...p, { id: genId(), name: newMed.name.trim(), time: newMed.time, color: MED_PALETTE[meds.length % MED_PALETTE.length] }])
    setNewMed({ name: '', time: '8:00 AM' })
    setShowAdd(false)
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="flex items-center justify-between mb-md">
        <div>
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.3rem' }}>Daily Medications</h3>
          <p className="text-sm text-muted">{new Date().toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(p => !p)}>+ Add Med</button>
      </div>

      {showAdd && (
        <div className="card mb-md" style={{ padding: '14px 16px' }}>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Name</label>
              <input className="form-input" value={newMed.name} onChange={e => setNewMed(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Vitamin D" onKeyDown={e => e.key === 'Enter' && addMed()} autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Time</label>
              <select className="form-select" value={newMed.time} onChange={e => setNewMed(p => ({ ...p, time: e.target.value }))}>
                {MED_TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-sm mt-md">
            <button className="btn btn-primary btn-sm" onClick={addMed}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {meds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💊</div>
          <h3>No medications added</h3>
          <p>Add your daily medications and supplements to track them.</p>
        </div>
      ) : (
        <>
          <div className="mb-md">
            <div className="flex items-center justify-between mb-sm">
              <span className="text-sm" style={{ fontWeight: 600 }}>{taken.length} of {meds.length} taken today</span>
              <span className="text-sm text-muted">{pct}%</span>
            </div>
            <div className="med-progress-wrap"><div className="med-progress-fill" style={{ width: `${pct}%` }} /></div>
            {pct === 100 && <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--sage)', marginTop: 6 }}>✨ All done for today!</p>}
          </div>

          {pending.length > 0 && (
            <>
              <p className="text-sm text-muted mb-sm" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</p>
              {pending.map(m => (
                <div key={m.id} className="med-item">
                  <button className="med-checkbox" onClick={() => toggle(m.id)} />
                  <span className="med-color-dot" style={{ background: m.color }} />
                  <span className="med-name">{m.name}</span>
                  <span className="med-time">{m.time}</span>
                  <span className="med-status-badge pending">Pending</span>
                  <button className="todo-delete" onClick={() => del(m.id)} style={{ opacity: 0.5 }}>×</button>
                </div>
              ))}
            </>
          )}
          {taken.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="text-sm text-muted mb-sm" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taken ✓</p>
              {taken.map(m => (
                <div key={m.id} className="med-item taken">
                  <button className="med-checkbox checked" onClick={() => toggle(m.id)} />
                  <span className="med-color-dot" style={{ background: m.color }} />
                  <span className="med-name">{m.name}</span>
                  <span className="med-time">{m.time}</span>
                  <span className="med-status-badge taken">Taken ✓</span>
                  <button className="todo-delete" onClick={() => del(m.id)} style={{ opacity: 0.5 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────── Main export ───────────────
export default function Schedule() {
  const [tab,      setTab]      = useState('schedule')
  const [events,   setEvents]   = useLocalStorage('schedule-events', [])
  const [migrated, setMigrated] = useLocalStorage('schedule-v3-migrated', false)
  const { options: categories } = useCustomOptions('schedule-cats', DEFAULT_CATS)

  // One-time migration from old slot-based storage → event objects
  useEffect(() => {
    if (!migrated) {
      try {
        const oldBlocks = JSON.parse(localStorage.getItem('schedule-blocks') || '{}')
        const oldMeta   = JSON.parse(localStorage.getItem('schedule-block-meta') || '{}')
        if (Object.keys(oldBlocks).length > 0) {
          const evts = migrateToEvents(oldBlocks, oldMeta)
          if (evts.length > 0) setEvents(evts)
        }
      } catch (err) {
        console.error('[Schedule] migration error:', err)
      }
      setMigrated(true)
    }
  }, []) // eslint-disable-line

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">My Schedule</h1>
          <p className="section-subtitle">Personal life & daily planning</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>📅 Schedule</button>
        <button className={`tab ${tab === 'todo'     ? 'active' : ''}`} onClick={() => setTab('todo')}>✅ To-Do</button>
        <button className={`tab ${tab === 'meds'     ? 'active' : ''}`} onClick={() => setTab('meds')}>💊 Medications</button>
      </div>

      {tab === 'schedule' && (
        <div className="card">
          <CalendarGrid events={events} setEvents={setEvents} categories={categories} />
        </div>
      )}
      {tab === 'todo' && (
        <div className="card">
          <h2 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.4rem', marginBottom: 20 }}>Personal To-Do</h2>
          <TodoList storageKey="schedule" />
        </div>
      )}
      {tab === 'meds' && (
        <div className="card"><MedTracker /></div>
      )}
    </div>
  )
}
