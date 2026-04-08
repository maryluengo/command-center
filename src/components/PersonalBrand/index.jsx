import { useState, useEffect } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import TodoList from '../common/TodoList'
import ContentIdeas from '../common/ContentIdeas'
import ContentCalendar from '../common/ContentCalendar'
import EditorialPlanner from './EditorialPlanner'
import Modal from '../common/Modal'

// ─────────────── Personal Brand Pillars ───────────────

export const DEFAULT_PERSONAL_PILLARS = [
  { label: 'Fashion',    bg: '#FDE8EF', color: '#B03060' },
  { label: 'Beauty',     bg: '#FEF0E0', color: '#B06020' },
  { label: 'ADHD',       bg: '#EDE8FD', color: '#5B3FA0' },
  { label: 'María Swim', bg: '#D8F8F0', color: '#0A6A5A' },
  { label: 'Real Life',  bg: '#FDF8EC', color: '#7A6020' },
  { label: 'Wellness',   bg: '#E8F8EC', color: '#2A7A4A' },
]

// ─────────────── Color helpers (picker hex → pastel bg + dark text) ───────────

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else                h = ((r - g) / d + 4) / 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

function pillarColorsFromHex(hex) {
  const [h, s] = hexToHsl(hex)
  return {
    bg:    hslToHex(h, Math.min(s + 10, 70), 93),
    color: hslToHex(h, Math.max(s + 20, 65), 32),
  }
}

// ─────────────── Manage Pillars Modal ───────────────

function ManagePillarsModal({ pillars, onSave, onClose }) {
  const [draft, setDraft] = useState(
    pillars.map((p, i) => ({ ...p, _id: `p${i}-${Date.now()}` }))
  )

  const update      = (id, field, val) => setDraft(d => d.map(p => p._id === id ? { ...p, [field]: val } : p))
  const updateColor = (id, hex)        => setDraft(d => d.map(p => p._id === id ? { ...p, ...pillarColorsFromHex(hex) } : p))
  const del         = (id)             => setDraft(d => d.filter(p => p._id !== id))

  const addNew = () => {
    const colors = pillarColorsFromHex('#C4AAED')
    setDraft(d => [...d, { label: 'New Pillar', ...colors, _id: `pnew-${Date.now()}` }])
  }

  const reset = () => {
    if (!window.confirm('Reset to default pillars? Any custom pillars will be removed.')) return
    setDraft(DEFAULT_PERSONAL_PILLARS.map((p, i) => ({ ...p, _id: `preset-${i}` })))
  }

  const save = () => {
    const cleaned = draft.filter(p => p.label.trim()).map(({ _id, ...pillar }) => pillar)
    onSave(cleaned)
  }

  return (
    <Modal isOpen onClose={onClose} title="Manage Content Pillars">
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
        Click a color swatch to change the pillar color. These pillars appear in your Content Ideas tab.
      </p>

      <div style={{ maxHeight: 380, overflowY: 'auto', marginBottom: 10 }}>
        {draft.map(pillar => (
          <div key={pillar._id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>

            {/* Color swatch — clicking opens the native color picker */}
            <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} title="Click to change color">
              <span style={{
                display: 'block', width: 28, height: 28, borderRadius: 8,
                background: pillar.bg, border: '1.5px solid var(--border)',
                outline: `2px solid ${pillar.color}44`,
              }} />
              <input
                type="color"
                value={pillar.bg}
                onChange={e => updateColor(pillar._id, e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
            </label>

            {/* Label input */}
            <input
              className="form-input"
              value={pillar.label}
              onChange={e => update(pillar._id, 'label', e.target.value)}
              placeholder="Pillar name…"
              style={{ flex: 1 }}
            />

            {/* Live preview badge */}
            <span style={{
              background: pillar.bg, color: pillar.color,
              borderRadius: 12, padding: '2px 10px',
              fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {pillar.label || '…'}
            </span>

            {/* Delete */}
            <button
              onClick={() => del(pillar._id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: '1.1rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
              title="Remove pillar"
            >×</button>
          </div>
        ))}
      </div>

      {/* Add new pillar */}
      <button
        onClick={addNew}
        style={{
          width: '100%', padding: '7px', borderRadius: 8,
          border: '1px dashed var(--border)', background: 'transparent',
          color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer',
          marginBottom: 14,
        }}
      >+ Add new pillar</button>

      <div className="modal-footer">
        <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginRight: 'auto' }}>
          Reset to defaults
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save}>Done</button>
      </div>
    </Modal>
  )
}

// ─────────────── Main PersonalBrand Section ───────────────

export default function PersonalBrand() {
  const [tab, setTab] = useState('todo')

  // Personal Brand pillars — isolated key, never shared with Agency or Content Strategy
  const [brandPillars, setBrandPillars] = useLocalStorage(
    'commandCenter_personalBrandPillars',
    DEFAULT_PERSONAL_PILLARS
  )
  const [managePillarsOpen, setManagePillarsOpen] = useState(false)

  // Navigate to editorial tab when triggered by the "View →" button in Content Strategy
  useEffect(() => {
    // Check for pending navigation from copy-to-brand flow (fires before this component mounted)
    if (sessionStorage.getItem('ep_pending_navigate') === '1') {
      sessionStorage.removeItem('ep_pending_navigate')
      setTab('editorial')
    }
    // Also listen for ep:navigate while this component is mounted (user already on Brand section)
    const handler = () => setTab('editorial')
    window.addEventListener('ep:navigate', handler)
    return () => window.removeEventListener('ep:navigate', handler)
  }, [])

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">@maryluengog</h1>
          <p className="section-subtitle">Personal brand & content planning</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'todo'      ? 'active' : ''}`} onClick={() => setTab('todo')}>✅ To-Do</button>
        <button className={`tab ${tab === 'ideas'     ? 'active' : ''}`} onClick={() => setTab('ideas')}>💡 Content Ideas</button>
        <button className={`tab ${tab === 'calendar'  ? 'active' : ''}`} onClick={() => setTab('calendar')}>📆 Content Calendar</button>
        <button className={`tab ${tab === 'editorial' ? 'active' : ''}`} onClick={() => setTab('editorial')}>📖 Editorial Planner</button>
      </div>

      {tab === 'todo' && (
        <div className="card">
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', marginBottom: 20 }}>Brand To-Do</h2>
          <TodoList storageKey="brand" />
        </div>
      )}

      {tab === 'ideas' && (
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Content Ideas & Strategy</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Brainstorm board for @maryluengog</p>
          </div>
          {/* customPillars + onManagePillars give this instance its own isolated pillar list */}
          <ContentIdeas
            storageKey="brand"
            showClient={false}
            customPillars={brandPillars}
            onManagePillars={() => setManagePillarsOpen(true)}
          />
        </div>
      )}

      {tab === 'calendar' && (
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Content Calendar</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Click any day to plan a post</p>
          </div>
          <ContentCalendar storageKey="brand" showClient={false} />
        </div>
      )}

      {tab === 'editorial' && <EditorialPlanner />}

      {/* Manage Pillars modal */}
      {managePillarsOpen && (
        <ManagePillarsModal
          pillars={brandPillars}
          onSave={newPillars => { setBrandPillars(newPillars); setManagePillarsOpen(false) }}
          onClose={() => setManagePillarsOpen(false)}
        />
      )}
    </div>
  )
}
