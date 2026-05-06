import { useState } from 'react'
import Modal from '../common/Modal'
import { usePlatforms, colorHex } from './postsStore'
import { mapIdeaPlatformToIds } from './ideaPostSync'

// Small modal used by Content Ideas to schedule (Step C) or reschedule (Step G).
// Props:
//   idea       the source idea (for default platform inference and title)
//   prefill?   { date?: 'YYYY-MM-DD', time?: 'HH:MM', platforms?: string[] }
//   mode       'schedule' (default) or 'reschedule'
//   onConfirm  ({ date, time, platforms }) → void
//   onCancel   () → void
export default function ScheduleIdeaModal({ idea, prefill, mode = 'schedule', onConfirm, onCancel }) {
  const [platforms] = usePlatforms()

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const initialPlats =
    Array.isArray(prefill?.platforms) && prefill.platforms.length > 0
      ? prefill.platforms
      : mapIdeaPlatformToIds(idea?.platform)

  const [date,  setDate]  = useState(prefill?.date || today)
  const [time,  setTime]  = useState(prefill?.time ?? '09:00')
  const [plats, setPlats] = useState(initialPlats)

  const togglePlatform = id =>
    setPlats(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])

  const canConfirm = !!date && plats.length > 0

  const title = mode === 'reschedule'
    ? `Reschedule "${idea?.title || 'post'}"`
    : `Schedule "${idea?.title || 'idea'}"`

  return (
    <Modal isOpen onClose={onCancel} title={title} size="sm">
      <div className="form-group">
        <label className="form-label">Date *</label>
        <input
          className="form-input"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">Time</label>
        <input
          className="form-input"
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Platforms *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {platforms.map(p => {
            const active = plats.includes(p.id)
            const c      = colorHex(p.color)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlatform(p.id)}
                style={{
                  border:     `2px solid ${c}`,
                  background: active ? `${c}55` : 'transparent',
                  color:      'var(--text)',
                  fontWeight: active ? 700 : 500,
                  borderRadius: 20,
                  padding:    '4px 12px',
                  fontSize:   '0.78rem',
                  cursor:     'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        {plats.length === 0 && (
          <p style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--priority-high)' }}>
            Pick at least one platform.
          </p>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={!canConfirm}
          onClick={() => onConfirm({ date, time, platforms: plats })}
        >
          {mode === 'reschedule' ? 'Save changes' : 'Schedule it'}
        </button>
      </div>
    </Modal>
  )
}
