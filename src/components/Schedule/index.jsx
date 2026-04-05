import { useState, useMemo, useEffect } from 'react'
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

// ─────────────── 30-minute slots: 6:00 AM – 10:30 PM ───────────────
// Each slot = { totalMin (minutes from midnight), h, m }
const SLOTS = []
for (let h = 6; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 22 && m === 30) break
    SLOTS.push({ totalMin: h * 60 + m, h, m })
  }
}
// 34 slots total: 6:00, 6:30, 7:00 … 22:00

function fmtSlot(totalMin) {
  const h    = Math.floor(totalMin / 60)
  const m    = totalMin % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// dateKey uses total-minutes so slots are uniquely addressed
function dateKey(date, totalMin) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}-${totalMin}`
}

// Migrate old hour-based keys (YYYY-MM-DD-6 … YYYY-MM-DD-22) to minute-based keys
function migrateBlocksToSlots(raw) {
  const migrated = {}
  for (const [key, val] of Object.entries(raw || {})) {
    const parts = key.split('-')
    const last  = parseInt(parts[parts.length - 1], 10)
    if (last <= 22) {
      // old format: hour 6-22 → convert to total minutes
      const newKey = parts.slice(0, -1).join('-') + '-' + String(last * 60)
      migrated[newKey] = val
    } else {
      migrated[key] = val
    }
  }
  return migrated
}

// ─────────────── Time picker helpers ───────────────
const HOUR_OPTS = Array.from({ length: 12 }, (_, i) => i + 1) // 1–12
const MIN_OPTS  = [0, 30] // 30-minute grid precision

function to24h(hour, ampm) {
  const h = Number(hour)
  if (ampm === 'AM') return h === 12 ? 0 : h
  return h === 12 ? 12 : h + 12
}

function fmtTimeStr(h24, min) {
  const ampm = h24 < 12 ? 'AM' : 'PM'
  const h12  = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`
}

function TimePicker({ hour, min, ampm, onHour, onMin, onAmpm, label }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: 4 }}>
        <select className="form-select" style={{ width: 58 }} value={hour} onChange={e => onHour(Number(e.target.value))}>
          {HOUR_OPTS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <select className="form-select" style={{ width: 62 }} value={min} onChange={e => onMin(Number(e.target.value))}>
          {MIN_OPTS.map(m => <option key={m} value={m}>:{String(m).padStart(2, '0')}</option>)}
        </select>
        <select className="form-select" style={{ width: 64 }} value={ampm} onChange={e => onAmpm(e.target.value)}>
          <option>AM</option>
          <option>PM</option>
        </select>
      </div>
    </div>
  )
}

function getWeekStart(date) {
  const d   = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function fmt(date) {
  return date.toLocaleDateString('default', { month: 'short', day: 'numeric' })
}

// ─────────────── Add-Block Modal ───────────────
function AddBlockModal({ weekDays, categories, onSave, onClose }) {
  const [day,         setDay]         = useState(0)
  const [startHour,   setStartHour]   = useState(9)
  const [startMin,    setStartMin]    = useState(0)
  const [startAmpm,   setStartAmpm]   = useState('AM')
  const [endHour,     setEndHour]     = useState(10)
  const [endMin,      setEndMin]      = useState(0)
  const [endAmpm,     setEndAmpm]     = useState('AM')
  const [category,    setCategory]    = useState(categories[0] || '')
  const [description, setDescription] = useState('')
  const [details,     setDetails]     = useState('')

  const save = () => {
    if (!category) return
    const startH24      = to24h(startHour, startAmpm)
    const endH24        = to24h(endHour,   endAmpm)
    const startTotalMin = startH24 * 60 + startMin
    const endTotalMin   = endH24   * 60 + endMin
    if (endTotalMin <= startTotalMin) {
      alert('End time must be after start time.')
      return
    }
    onSave({
      dayIndex:     day,
      startTotalMin,
      endTotalMin,
      startTimeStr: fmtTimeStr(startH24, startMin),
      endTimeStr:   fmtTimeStr(endH24,   endMin),
      category,
      description:  description.trim(),
      details:      details.trim(),
    })
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Time Block">
      <div className="form-group">
        <label className="form-label">Day</label>
        <select className="form-select" value={day} onChange={e => setDay(Number(e.target.value))}>
          {weekDays.map((d, i) => (
            <option key={i} value={i}>
              {d.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <TimePicker label="Start Time" hour={startHour} min={startMin} ampm={startAmpm} onHour={setStartHour} onMin={setStartMin} onAmpm={setStartAmpm} />
        <TimePicker label="End Time"   hour={endHour}   min={endMin}   ampm={endAmpm}   onHour={setEndHour}   onMin={setEndMin}   onAmpm={setEndAmpm} />
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

// ─────────────── Block Detail Popup ───────────────
function BlockDetailModal({ blockData, categories, onClose, onClear }) {
  const { cat, meta } = blockData
  const color = getCatColor(cat, categories)
  return (
    <Modal isOpen onClose={onClose} title="Block Details">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ width: 16, height: 16, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{cat}</span>
      </div>

      {(meta?.startTimeStr || meta?.endTimeStr) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          <span>🕐</span>
          <span>{meta.startTimeStr} – {meta.endTimeStr}</span>
        </div>
      )}

      {meta?.description && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Description</label>
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', padding: '8px 0' }}>{meta.description}</div>
        </div>
      )}

      {meta?.details && (
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Details</label>
          <div style={{ fontSize: '0.9rem', color: 'var(--text)', padding: '8px 0' }}>{meta.details}</div>
        </div>
      )}

      {!meta?.description && !meta?.details && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 12 }}>
          No description added. Use "Add Block" to include description and details.
        </p>
      )}

      <div className="modal-footer">
        <button className="btn btn-danger btn-sm" onClick={onClear}>Clear Block</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}

// ─────────────── Weekly / Daily Grid ───────────────
function WeeklyGrid({ blocks, setBlocks, blockMeta, setBlockMeta, categories }) {
  const [weekStart,   setWeekStart]  = useState(() => getWeekStart(new Date()))
  const [openCell,    setOpenCell]   = useState(null) // for empty-cell picker
  const [detailBlock, setDetailBlock] = useState(null) // for filled-cell detail popup
  const [view,        setView]       = useState('week')
  const [dayOffset,   setDayOffset]  = useState(0)
  const [addModal,    setAddModal]   = useState(false)
  const today = new Date()

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  }), [weekStart])

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }

  const isToday = d =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth()    &&
    d.getDate()     === today.getDate()

  const getBlock = (d, totalMin) => blocks[dateKey(d, totalMin)]
  const getMeta  = (d, totalMin) => blockMeta[dateKey(d, totalMin)]

  const setBlock = (d, totalMin, cat) => {
    const key = dateKey(d, totalMin)
    setBlocks(prev => { const n = { ...prev }; if (!cat) delete n[key]; else n[key] = cat; return n })
  }

  const clearMeta = (d, totalMin) => {
    const key = dateKey(d, totalMin)
    setBlockMeta(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  // Clear all 30-min slots for an entire block starting at a given slot
  const clearBlock = (d, startTotalMin) => {
    const cat = getBlock(d, startTotalMin)
    if (!cat) return
    // Clear this slot and contiguous slots with the same category
    setBlocks(prev => {
      const n = { ...prev }
      for (const slot of SLOTS) {
        const k = dateKey(d, slot.totalMin)
        if (n[k] === cat) delete n[k]
      }
      return n
    })
    clearMeta(d, startTotalMin)
  }

  const handleAddBlock = ({ dayIndex, startTotalMin, endTotalMin, startTimeStr, endTimeStr, category, description, details }) => {
    const d       = weekDays[dayIndex]
    const updates = {}
    for (const slot of SLOTS) {
      if (slot.totalMin >= startTotalMin && slot.totalMin < endTotalMin) {
        updates[dateKey(d, slot.totalMin)] = category
      }
    }
    setBlocks(prev => ({ ...prev, ...updates }))
    if (description || details) {
      const metaKey = dateKey(d, startTotalMin)
      setBlockMeta(prev => ({
        ...prev,
        [metaKey]: { description, details, startTimeStr, endTimeStr },
      }))
    }
    setAddModal(false)
  }

  const displayDays = view === 'week' ? weekDays : [weekDays[dayOffset]]
  const yearStr     = weekDays[0].getFullYear() === weekDays[6].getFullYear()
    ? ` ${weekDays[0].getFullYear()}`
    : ` ${weekDays[0].getFullYear()}–${weekDays[6].getFullYear()}`
  const weekLabel   = view === 'week'
    ? `${fmt(weekDays[0])} – ${fmt(weekDays[6])}${yearStr}`
    : weekDays[dayOffset].toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
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
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setAddModal(true)}>+ Add Block</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
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

      {/* Grid */}
      <div className="schedule-grid-wrapper">
        <div className="schedule-grid">
          {/* Header */}
          <div className="schedule-grid-header" style={{ gridTemplateColumns: `64px repeat(${displayDays.length}, 1fr)` }}>
            <div className="schedule-time-label" style={{ background: 'var(--surface-2)', borderBottom: 'none' }} />
            {displayDays.map((d, i) => (
              <div key={i} className={`schedule-day-header ${isToday(d) ? 'is-today' : ''}`}>
                <span className="day-name">{d.toLocaleDateString('default', { weekday: 'short' })}</span>
                <span className="day-num">{d.getDate()}</span>
              </div>
            ))}
          </div>

          {/* 30-min slot rows */}
          {SLOTS.map(({ totalMin, h, m }) => (
            <div
              key={totalMin}
              className="schedule-row"
              style={{
                gridTemplateColumns: `64px repeat(${displayDays.length}, 1fr)`,
                borderBottom: m === 0 ? '1px solid var(--border)' : '1px dashed rgba(196,170,237,0.2)',
              }}
            >
              {/* Time label — only show on :00 rows to avoid clutter */}
              <div className="schedule-time-label" style={{ fontSize: m === 0 ? '0.68rem' : '0.58rem', color: m === 0 ? 'var(--text-light)' : 'transparent' }}>
                {fmtSlot(totalMin)}
              </div>

              {displayDays.map((d, di) => {
                const cat    = getBlock(d, totalMin)
                const meta   = getMeta(d, totalMin)
                const cellId = `${di}-${totalMin}`
                const bg     = cat ? getCatColor(cat, categories) : undefined

                // Is this the top slot of a block? (no same-cat block in the slot above)
                const prevSlotIdx = SLOTS.findIndex(s => s.totalMin === totalMin) - 1
                const prevSlot    = prevSlotIdx >= 0 ? SLOTS[prevSlotIdx] : null
                const isBlockTop  = cat && (!prevSlot || getBlock(d, prevSlot.totalMin) !== cat)

                return (
                  <div
                    key={di}
                    className="schedule-cell"
                    style={{
                      background: bg ? `${bg}50` : undefined,
                      minHeight: 36,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (cat) {
                        // Filled cell → show detail popup
                        setDetailBlock({ date: d, totalMin, cat, meta })
                        setOpenCell(null)
                      } else {
                        // Empty cell → open category picker
                        setOpenCell(openCell === cellId ? null : cellId)
                      }
                    }}
                    title={cat
                      ? `${cat}${meta?.startTimeStr ? ` · ${meta.startTimeStr}–${meta.endTimeStr}` : ''}`
                      : 'Click to assign · or use + Add Block'}
                  >
                    {/* Show category label only at the top of each block */}
                    {cat && isBlockTop && (
                      <div className="schedule-block" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1, padding: '3px 7px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: getCatColor(cat, categories), flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.65rem', color: 'var(--text)', fontWeight: 700, flex: 1 }}>{cat}</span>
                        </div>
                        {meta?.startTimeStr && (
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', paddingLeft: 11 }}>
                            {meta.startTimeStr}–{meta.endTimeStr}
                          </span>
                        )}
                        {meta?.description && (
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', paddingLeft: 11 }}>
                            {meta.description}
                          </span>
                        )}
                        {meta?.details && (
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', paddingLeft: 11, fontStyle: 'italic' }}>
                            {meta.details}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Empty cell category picker */}
                    {!cat && openCell === cellId && (
                      <>
                        <div className="cell-picker-overlay" onClick={e => { e.stopPropagation(); setOpenCell(null) }} />
                        <div className="cell-picker" onClick={e => e.stopPropagation()}>
                          {categories.map(c => (
                            <div
                              key={c}
                              className="cell-picker-option"
                              onClick={() => { setBlock(d, totalMin, c); setOpenCell(null) }}
                            >
                              <span className="cat-dot" style={{ background: getCatColor(c, categories) }} />
                              {c}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {addModal && (
        <AddBlockModal
          weekDays={weekDays}
          categories={categories}
          onSave={handleAddBlock}
          onClose={() => setAddModal(false)}
        />
      )}

      {detailBlock && (
        <BlockDetailModal
          blockData={detailBlock}
          categories={categories}
          onClose={() => setDetailBlock(null)}
          onClear={() => {
            clearBlock(detailBlock.date, detailBlock.totalMin)
            setDetailBlock(null)
          }}
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

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function MedTracker() {
  const [meds, setMeds]       = useLocalStorage('meds-list', [])
  const [logs, setLogs]       = useLocalStorage('meds-logs', {})
  const [showAdd, setShowAdd] = useState(false)
  const [newMed, setNewMed]   = useState({ name: '', time: '8:00 AM' })

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayLog = logs[todayKey] || {}

  const taken   = meds.filter(m => todayLog[m.id])
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

// ─────────────── Main ───────────────
export default function Schedule() {
  const [tab,        setTab]       = useState('schedule')
  const [rawBlocks,  setBlocks]    = useLocalStorage('schedule-blocks', {})
  const [blockMeta,  setBlockMeta] = useLocalStorage('schedule-block-meta', {})
  const { options: categories }    = useCustomOptions('schedule-cats', DEFAULT_CATS)

  // Migrate old hour-keyed blocks to 30-min slot keys once on mount
  useEffect(() => {
    const needsMigration = Object.keys(rawBlocks).some(k => {
      const last = parseInt(k.split('-').pop(), 10)
      return last <= 22
    })
    if (needsMigration) setBlocks(migrateBlocksToSlots(rawBlocks))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
          <WeeklyGrid
            blocks={rawBlocks}
            setBlocks={setBlocks}
            blockMeta={blockMeta}
            setBlockMeta={setBlockMeta}
            categories={categories}
          />
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
