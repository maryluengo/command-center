import { useState } from 'react'
import Modal from '../common/Modal'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import {
  POSTS_KEY,
  PILLARS_KEY, EDITABLE_PLATFORMS_KEY,
  DEFAULT_PILLARS, DEFAULT_EDITABLE_PLATFORMS,
  PALETTE, colorHex,
} from './postsStore'

function genId(label) {
  const slug = (label || 'item').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  return (slug || 'item') + '_' + Math.random().toString(36).slice(2, 6)
}

// Tiny pastel swatch that opens an inline palette popover
function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Change color"
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: colorHex(value),
          border: '1.5px solid var(--border)',
          outline: `2px solid ${colorHex(value)}55`,
          cursor: 'pointer', padding: 0,
        }}
      />
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          />
          <div
            style={{
              position: 'absolute', top: 32, left: 0, zIndex: 11,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 8, boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.12))',
              display: 'grid', gridTemplateColumns: 'repeat(5, 24px)', gap: 6,
            }}
          >
            {PALETTE.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false) }}
                title={c.id}
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: c.hex,
                  border: value === c.id ? '2px solid var(--text)' : '1.5px solid var(--border)',
                  cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Reusable list editor — handles both pillars and platforms
function ListEditor({ items, setItems, kind, postsRefCount }) {
  const isPlatform = kind === 'platform'

  const update = (id, patch) =>
    setItems(items.map(it => it.id === id ? { ...it, ...patch } : it))

  const remove = (item) => {
    const refs = postsRefCount(item.id)
    const noun = isPlatform ? 'platform' : 'pillar'
    if (refs > 0) {
      const ok = window.confirm(
        `Delete the "${item.label}" ${noun}?\n\n${refs} post${refs === 1 ? '' : 's'} reference${refs === 1 ? 's' : ''} it. ` +
        `The post${refs === 1 ? '' : 's'} won't be deleted — just the ${noun} reference will be cleared.`
      )
      if (!ok) return
    } else {
      if (!window.confirm(`Delete the "${item.label}" ${noun}?`)) return
    }
    setItems(items.filter(it => it.id !== item.id))
  }

  const addNew = () => {
    const base = isPlatform
      ? { label: 'New platform', short: 'New', color: 'cloud' }
      : { label: 'New pillar', color: 'cloud' }
    setItems([...items, { id: genId(base.label), ...base }])
  }

  const reset = () => {
    const noun = isPlatform ? 'platforms' : 'pillars'
    if (!window.confirm(`Reset ${noun} to defaults? Custom ${noun} you've added will be removed.`)) return
    setItems(isPlatform ? [...DEFAULT_EDITABLE_PLATFORMS] : [...DEFAULT_PILLARS])
  }

  return (
    <div>
      <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 10, paddingRight: 4 }}>
        {items.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '20px 12px',
            fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic',
            background: 'var(--surface-2)', borderRadius: 10, border: '1px dashed var(--border)',
          }}>
            No {isPlatform ? 'platforms' : 'pillars'} yet — click "+ Add" below.
          </div>
        )}
        {items.map(item => {
          const refs = postsRefCount(item.id)
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ColorPicker value={item.color} onChange={c => update(item.id, { color: c })} />

              <input
                className="form-input"
                value={item.label}
                onChange={e => update(item.id, { label: e.target.value })}
                placeholder={isPlatform ? 'Platform name…' : 'Pillar name…'}
                style={{ flex: 2, minWidth: 0 }}
              />

              {isPlatform && (
                <input
                  className="form-input"
                  value={item.short}
                  onChange={e => update(item.id, { short: e.target.value })}
                  placeholder="Short"
                  maxLength={6}
                  title="Short tag shown on calendar pills"
                  style={{ width: 70, flexShrink: 0 }}
                />
              )}

              {/* Live preview */}
              <span style={{
                background: colorHex(item.color), color: 'var(--text)',
                borderRadius: 12, padding: '2px 10px',
                fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                opacity: 0.85,
              }}>
                {isPlatform ? (item.short || item.label) : item.label}
              </span>

              {refs > 0 && (
                <span title={`${refs} post${refs === 1 ? '' : 's'} use this`}
                  style={{
                    fontSize: '0.66rem', color: 'var(--text-muted)',
                    background: 'var(--surface-2)', borderRadius: 10,
                    padding: '1px 7px', flexShrink: 0,
                  }}>
                  {refs}
                </span>
              )}

              <button
                onClick={() => remove(item)}
                title="Remove"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-light)', fontSize: '1.15rem', lineHeight: 1,
                  padding: '0 4px', flexShrink: 0,
                }}
              >×</button>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={addNew}
          style={{
            flex: 1, padding: '8px', borderRadius: 8,
            border: '1px dashed var(--border)', background: 'transparent',
            color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer',
          }}
        >+ Add {isPlatform ? 'platform' : 'pillar'}</button>
        <button
          onClick={reset}
          style={{
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer',
          }}
        >Reset to defaults</button>
      </div>
    </div>
  )
}

export default function ManageModal({ onClose }) {
  const [tab,       setTab]       = useState('pillars')
  const [pillars,   setPillars]   = useLocalStorage(PILLARS_KEY,            DEFAULT_PILLARS)
  const [platforms, setPlatforms] = useLocalStorage(EDITABLE_PLATFORMS_KEY, DEFAULT_EDITABLE_PLATFORMS)
  const [posts,     setPosts]     = useLocalStorage(POSTS_KEY,              [])

  // Local drafts so we can save/cancel atomically
  const [pillarDraft,   setPillarDraft]   = useState(pillars)
  const [platformDraft, setPlatformDraft] = useState(platforms)

  const pillarRefCount   = id => posts.filter(p => p.pillar === id || p.pillar === pillars.find(x => x.id === id)?.label).length
  const platformRefCount = id => posts.filter(p => Array.isArray(p.platforms) ? p.platforms.includes(id) : p.platform === id).length

  const save = () => {
    // Find what got deleted so we can clear references on posts
    const removedPillarIds = pillars
      .filter(p => !pillarDraft.find(d => d.id === p.id))
      .map(p => p.id)
    const removedPillarLabels = pillars
      .filter(p => !pillarDraft.find(d => d.id === p.id))
      .map(p => p.label)
    const removedPlatformIds = platforms
      .filter(p => !platformDraft.find(d => d.id === p.id))
      .map(p => p.id)

    if (removedPillarIds.length || removedPlatformIds.length) {
      setPosts(prev => prev.map(post => {
        let next = post
        // Pillar: clear if id matches removed, OR (legacy) label matches a removed pillar's label
        if (next.pillar && (removedPillarIds.includes(next.pillar) || removedPillarLabels.includes(next.pillar))) {
          next = { ...next, pillar: '' }
        }
        // Platforms array: filter out removed ids
        if (Array.isArray(next.platforms) && removedPlatformIds.some(id => next.platforms.includes(id))) {
          const filtered = next.platforms.filter(id => !removedPlatformIds.includes(id))
          next = { ...next, platforms: filtered, platform: filtered[0] || '' }
        }
        // Legacy single platform field
        if (next.platform && removedPlatformIds.includes(next.platform) && !Array.isArray(next.platforms)) {
          next = { ...next, platform: '' }
        }
        return next
      }))
    }

    setPillars(pillarDraft.filter(p => p.label.trim()))
    setPlatforms(platformDraft.filter(p => p.label.trim()))
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title="Manage Pillars & Platforms" size="md">
      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab ${tab === 'pillars' ? 'active' : ''}`}
          onClick={() => setTab('pillars')}
        >🎨 Pillars</button>
        <button
          className={`tab ${tab === 'platforms' ? 'active' : ''}`}
          onClick={() => setTab('platforms')}
        >📱 Platforms</button>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
        {tab === 'pillars'
          ? 'Pillars appear as chips in the post editor and color the dot on each post.'
          : 'Platforms appear as rows in the Editorial Planner and as tags on the Calendar. Short = the tiny tag (e.g. "TT" for TikTok).'}
      </p>

      {tab === 'pillars' && (
        <ListEditor
          items={pillarDraft}
          setItems={setPillarDraft}
          kind="pillar"
          postsRefCount={pillarRefCount}
        />
      )}
      {tab === 'platforms' && (
        <ListEditor
          items={platformDraft}
          setItems={setPlatformDraft}
          kind="platform"
          postsRefCount={platformRefCount}
        />
      )}

      <div className="modal-footer" style={{ marginTop: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save}>Save changes</button>
      </div>
    </Modal>
  )
}
