import { useState } from 'react'
import { useCustomOptions } from '../../hooks/useCustomOptions'
import Modal from './Modal'

/**
 * A gear-icon button that opens a modal to add/rename/delete options for a list.
 *
 * Props:
 *   optionsKey   — storage key (e.g. "pillars")
 *   defaults     — default option array
 *   label        — display name (e.g. "Content Pillars")
 */
export function OptionsManagerButton({ optionsKey, defaults, label }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="opts-gear-btn"
        onClick={() => setOpen(true)}
        title={`Manage ${label}`}
        type="button"
      >
        ⚙
      </button>
      {open && (
        <OptionsManagerModal
          optionsKey={optionsKey}
          defaults={defaults}
          label={label}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function OptionsManagerModal({ optionsKey, defaults, label, onClose }) {
  const { options, add, remove, rename, reset } = useCustomOptions(optionsKey, defaults)
  const [newVal, setNewVal]     = useState('')
  const [editIdx, setEditIdx]   = useState(null)
  const [editVal, setEditVal]   = useState('')

  const handleAdd = () => {
    add(newVal)
    setNewVal('')
  }

  const startEdit = (i) => {
    setEditIdx(i)
    setEditVal(options[i])
  }

  const commitEdit = () => {
    if (editIdx !== null) rename(options[editIdx], editVal)
    setEditIdx(null)
  }

  return (
    <Modal isOpen onClose={onClose} title={`Manage ${label}`}>
      {/* Existing options */}
      <div style={{ marginBottom: 20 }}>
        <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Current Options</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--lavender-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--lavender)', flexShrink: 0 }}>
                {i + 1}
              </span>

              {editIdx === i ? (
                <>
                  <input
                    className="form-input"
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditIdx(null) }}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary btn-xs" onClick={commitEdit}>✓</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => setEditIdx(null)}>✕</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: '0.875rem' }}>{opt}</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => startEdit(i)} title="Rename">✏️</button>
                  <button
                    className="btn btn-danger btn-xs"
                    onClick={() => { if (options.length > 1) remove(opt) }}
                    disabled={options.length <= 1}
                    title="Delete"
                  >×</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add new */}
      <div className="form-group">
        <label className="form-label">Add New Option</label>
        <div className="flex gap-sm">
          <input
            className="form-input"
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Type and press Enter..."
          />
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!newVal.trim()}>Add</button>
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Reset to defaults?')) reset() }}>Reset Defaults</button>
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  )
}
