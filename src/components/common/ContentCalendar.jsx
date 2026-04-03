import { useState, useMemo } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useCustomOptions } from '../../hooks/useCustomOptions'
import { OptionsManagerButton } from './OptionsManager'
import Modal from './Modal'
import FileUpload from './FileUpload'

const DEFAULT_PLATFORMS  = ['Instagram Reel', 'Instagram Carousel', 'Instagram Story', 'TikTok', 'YouTube Short']
const DEFAULT_PILLARS    = ['Fashion', 'Beauty', 'Real Life', 'María Swim']
const DEFAULT_FILM_TIMES = ['15 min', '30 min', '1 hour', '2+ hours', 'Full day']
const DEFAULT_STATUSES   = ['Idea', 'Filming', 'Editing', 'Scheduled', 'Posted']

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const PILLAR_CLASSES = {
  'Fashion': 'fashion', 'Beauty': 'beauty', 'Real Life': 'real-life', 'María Swim': 'maria-swim'
}

function pillarClass(p) { return PILLAR_CLASSES[p] || 'fashion' }

function emptyEntry(dateStr) {
  return {
    id: genId(), date: dateStr,
    platform: 'Instagram Reel', pillar: 'Fashion',
    caption: '', script: '', audio: '', filmTime: '30 min',
    whatINeed: '', referenceLinks: [''], status: 'Idea',
    notes: '', files: [], client: '',
  }
}

export default function ContentCalendar({ storageKey, showClient = false, clients = [] }) {
  const [entries, setEntries] = useLocalStorage(`cal-entries-${storageKey}`, [])

  // Customizable options
  const { options: platforms }  = useCustomOptions('cal-platforms',  DEFAULT_PLATFORMS)
  const { options: pillars }    = useCustomOptions('cal-pillars',    DEFAULT_PILLARS)
  const { options: filmTimes }  = useCustomOptions('cal-film-times', DEFAULT_FILM_TIMES)
  const { options: statuses }   = useCustomOptions('cal-statuses',   DEFAULT_STATUSES)

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [editEntry, setEditEntry] = useState(null)
  const [editId,    setEditId]    = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

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

  const dayEntries = (y, m, d) => entries.filter(e => e.date === dateKey(y, m, d))
  const isToday = (y, m, d) => y === today.getFullYear() && m === today.getMonth() && d === today.getDate()

  const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(v => v - 1)) : setViewMonth(v => v - 1)
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(v => v + 1)) : setViewMonth(v => v + 1)

  const openDay  = (y, m, d)   => { if (m < 0 || m > 11) return; setEditEntry(emptyEntry(dateKey(y, m, d))); setEditId(null); setModalOpen(true) }
  const openEdit = (entry)     => { setEditEntry({ ...entry }); setEditId(entry.id); setModalOpen(true) }

  const save = () => {
    if (!editEntry) return
    if (editId) setEntries(p => p.map(e => e.id === editId ? editEntry : e))
    else        setEntries(p => [...p, editEntry])
    setModalOpen(false)
  }

  const del = id => { if (confirm('Delete this entry?')) { setEntries(p => p.filter(e => e.id !== id)); setModalOpen(false) } }

  const upd = (k, v) => setEditEntry(p => ({ ...p, [k]: v }))

  const addLink  = ()      => upd('referenceLinks', [...(editEntry.referenceLinks || ['']), ''])
  const updLink  = (i, v)  => { const l = [...(editEntry.referenceLinks || [])]; l[i] = v; upd('referenceLinks', l) }
  const remLink  = i       => upd('referenceLinks', editEntry.referenceLinks.filter((_, idx) => idx !== i))

  // Label for field with gear icon
  const LabelWithGear = ({ children, optKey, defaults, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <label className="form-label" style={{ margin: 0 }}>{children}</label>
      <OptionsManagerButton optionsKey={optKey} defaults={defaults} label={label} />
    </div>
  )

  return (
    <div>
      {/* Nav */}
      <div className="cal-nav mb-md">
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹ Prev</button>
        <span className="cal-month-label">{monthName}</span>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Next ›</button>
      </div>

      {/* Grid */}
      <div className="calendar-grid">
        {DAYS.map(d => <div key={d} className="cal-day-header">{d}</div>)}
        {calDays.map((cell, i) => {
          const de = cell.other ? [] : dayEntries(cell.year, cell.month, cell.day)
          return (
            <div key={i} className={`cal-day ${cell.other ? 'other-month' : ''} ${isToday(cell.year, cell.month, cell.day) ? 'is-today' : ''}`}
              onClick={() => !cell.other && openDay(cell.year, cell.month, cell.day)}
            >
              <div className="day-num">{cell.day}</div>
              {de.slice(0, 3).map(e => (
                <span key={e.id} className={`cal-entry-pill ${pillarClass(e.pillar)}`}
                  onClick={ev => { ev.stopPropagation(); openEdit(e) }} title={`${e.platform} — ${e.status}`}>
                  {e.platform.split(' ')[0]}
                </span>
              ))}
              {de.length > 3 && <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>+{de.length - 3}</span>}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modalOpen && editEntry && (
        <Modal isOpen onClose={() => setModalOpen(false)} size="lg"
          title={editId
            ? `Edit — ${new Date(editEntry.date + 'T12:00').toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : `New Post — ${editEntry.date ? new Date(editEntry.date + 'T12:00').toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}`}
        >
          <div className="form-row">
            <div className="form-group">
              <LabelWithGear optKey="cal-platforms" defaults={DEFAULT_PLATFORMS} label="Platforms">Platform</LabelWithGear>
              <select className="form-select" value={editEntry.platform} onChange={e => upd('platform', e.target.value)}>
                {platforms.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <LabelWithGear optKey="cal-pillars" defaults={DEFAULT_PILLARS} label="Content Pillars">Content Pillar</LabelWithGear>
              <select className="form-select" value={editEntry.pillar} onChange={e => upd('pillar', e.target.value)}>
                {pillars.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {showClient && (
            <div className="form-group">
              <label className="form-label">Client</label>
              {clients.length > 0 ? (
                <select className="form-select" value={editEntry.client} onChange={e => upd('client', e.target.value)}>
                  <option value="">No client</option>
                  {clients.map(c => <option key={c}>{c}</option>)}
                </select>
              ) : (
                <input className="form-input" value={editEntry.client} onChange={e => upd('client', e.target.value)} placeholder="Client name..." />
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Caption</label>
            <textarea className="form-textarea" value={editEntry.caption} onChange={e => upd('caption', e.target.value)} placeholder="Write your caption here..." style={{ minHeight: 90 }} />
          </div>

          <div className="form-group">
            <label className="form-label">Script / Talking Points</label>
            <textarea className="form-textarea" value={editEntry.script} onChange={e => upd('script', e.target.value)} placeholder="Key talking points or full script..." style={{ minHeight: 80 }} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Audio / Sound</label>
              <input className="form-input" value={editEntry.audio} onChange={e => upd('audio', e.target.value)} placeholder="Song or sound name..." />
            </div>
            <div className="form-group">
              <LabelWithGear optKey="cal-film-times" defaults={DEFAULT_FILM_TIMES} label="Film Times">Est. Film Time</LabelWithGear>
              <select className="form-select" value={editEntry.filmTime} onChange={e => upd('filmTime', e.target.value)}>
                {filmTimes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">What I Need (props, outfits, locations)</label>
            <textarea className="form-textarea" value={editEntry.whatINeed} onChange={e => upd('whatINeed', e.target.value)} placeholder="List everything you need to film this..." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <LabelWithGear optKey="cal-statuses" defaults={DEFAULT_STATUSES} label="Post Statuses">Status</LabelWithGear>
              <select className="form-select" value={editEntry.status} onChange={e => upd('status', e.target.value)}>
                {statuses.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={editEntry.notes} onChange={e => upd('notes', e.target.value)} placeholder="Any extra notes..." />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reference Links</label>
            {(editEntry.referenceLinks || ['']).map((link, i) => (
              <div key={i} className="flex gap-sm mb-sm">
                <input className="form-input" value={link} onChange={e => updLink(i, e.target.value)} placeholder="https://..." type="url" />
                {(editEntry.referenceLinks || []).length > 1 && <button className="btn btn-danger btn-sm" onClick={() => remLink(i)}>×</button>}
              </div>
            ))}
            <button className="btn btn-ghost btn-xs" onClick={addLink}>+ Add Link</button>
          </div>

          <div className="form-group">
            <label className="form-label">Files / References</label>
            <FileUpload files={editEntry.files || []} onChange={f => upd('files', f)} label="Upload photos, videos, or documents" />
          </div>

          <div className="modal-footer">
            {editId && <button className="btn btn-danger btn-sm" onClick={() => del(editId)} style={{ marginRight: 'auto' }}>Delete</button>}
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save Post</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
