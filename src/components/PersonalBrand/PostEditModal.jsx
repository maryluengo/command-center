import { useState } from 'react'
import Modal from '../common/Modal'
import {
  parseLocalDate,
  findPillar, colorHex, platformIcon,
  STAGES, CHECKLIST_FIELDS, emptyChecklist,
} from './postsStore'

// Shared post-edit modal used by the Editorial Planner and the Content Calendar.
// Same shape, same fields — so editing a post from either view is identical.
//
// Props:
//   date              YYYY-MM-DD the post should be saved against
//   cell              the existing post object, or null for a new post
//   pillars           editable pillars list
//   platforms         editable platforms list
//   initialPlatforms  override of pre-selected platforms (used when opening a fresh
//                     post from a specific platform row in the EP)
//   onSave(cellData)  cellData is the merged post payload (excluding date/id)
//   onClear()         called when the user hits Delete (only shown for existing)
//   onClose()         dismiss

export default function PostEditModal({
  date, cell, pillars, platforms, initialPlatforms,
  onSave, onClear, onClose,
}) {
  const isNew = !cell

  // Resolve legacy label-form pillar to id form
  const initialPillar = cell?.pillar ? (findPillar(pillars, cell.pillar)?.id ?? cell.pillar) : ''
  // Selected platforms: prop override > existing post array > legacy single > []
  const startPlatforms =
    (Array.isArray(initialPlatforms) && initialPlatforms.length > 0)
      ? initialPlatforms
      : (Array.isArray(cell?.platforms) && cell.platforms.length > 0)
        ? cell.platforms
        : (cell?.platform ? [cell.platform] : [])

  const [selectedPlats, setSelectedPlats] = useState(startPlatforms)
  const [pillar,        setPillar]        = useState(initialPillar)
  const [editedDate,    setEditedDate]    = useState(date || '')
  const [title,         setTitle]         = useState(cell?.title     ?? '')
  const [timeOfDay,     setTimeOfDay]     = useState(cell?.timeOfDay ?? '')
  const [timeToFilm,    setTimeToFilm]    = useState(cell?.timeToFilm ?? cell?.filmTime ?? '')
  const [stage,         setStage]         = useState(cell?.stage     ?? 'idea')
  const [checklist,     setChecklist]     = useState({ ...emptyChecklist(), ...(cell?.checklist || {}) })
  const [script,        setScript]        = useState(cell?.script    ?? '')
  const [scriptExpanded, setScriptExpanded] = useState(false)
  const [whatINeed,     setWhatINeed]     = useState(cell?.whatINeed ?? '')
  const [mediaLinks,    setMediaLinks]    = useState(
    Array.isArray(cell?.mediaLinks) && cell.mediaLinks.length ? cell.mediaLinks : ['']
  )
  const [refLinks,      setRefLinks]      = useState(
    Array.isArray(cell?.referenceLinks) && cell.referenceLinks.length ? cell.referenceLinks : ['']
  )
  const [notes,         setNotes]         = useState(cell?.notes ?? '')

  const togglePlatform = id => setSelectedPlats(prev =>
    prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
  )
  const toggleCheck = key => setChecklist(c => ({ ...c, [key]: !c[key] }))

  const updateLink = (setter) => (i, val) => setter(arr => { const n = [...arr]; n[i] = val; return n })
  const addLink    = (setter) => () => setter(arr => [...arr, ''])
  const removeLink = (setter) => (i) => setter(arr => arr.filter((_, idx) => idx !== i))

  // Derive a friendly header date that reflects the user's current pick.
  const headerDate = (() => {
    try {
      return parseLocalDate(editedDate || date).toLocaleDateString('default', {
        weekday: 'long', month: 'short', day: 'numeric',
      })
    } catch {
      return date
    }
  })()
  const titleStr = `${isNew ? 'New post' : 'Edit post'} · ${headerDate}`

  const canSave = selectedPlats.length > 0 && title.trim().length > 0 && !!editedDate

  const save = () => {
    if (!canSave) return
    onSave({
      ...(cell || {}),
      // The new date the user picked — parents prefer cellData.date over the prop date
      date:      editedDate,
      // Multi-platform — `platform` kept as legacy alias
      platforms: selectedPlats,
      platform:  selectedPlats[0],
      pillar,
      title:      title.trim(),
      timeOfDay:  timeOfDay.trim(),
      timeToFilm: timeToFilm.trim(),
      stage,
      checklist,
      script:     script.trim(),
      whatINeed:  whatINeed.trim(),
      mediaLinks:     mediaLinks.map(l => l.trim()).filter(Boolean),
      referenceLinks: refLinks.map(l => l.trim()).filter(Boolean),
      notes:      notes.trim(),
      // Keep legacy `done` flag in sync with checklist.posted for any external readers
      done:       !!checklist.posted,
      manuallyEdited: true,
    })
  }

  // ── Reusable bits ─────────────────────────────────────────────────────────
  const Chip = ({ active, color, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
        border: `2px solid ${color}`,
        background: active ? color + '55' : 'transparent',
        fontWeight: active ? 700 : 500, color: 'var(--text)', transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >{children}</button>
  )

  const LinkList = ({ values, onUpdate, onAdd, onRemove, placeholder, label }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {values.map((link, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            className="form-input"
            value={link}
            onChange={e => onUpdate(i, e.target.value)}
            placeholder={placeholder}
            type="url"
            style={{ flex: 1 }}
          />
          {link.trim() && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              title="Open link"
              style={{
                fontSize: '0.78rem', color: 'var(--text-light)', textDecoration: 'none',
                padding: '0 6px', flexShrink: 0,
              }}
            >↗</a>
          )}
          {values.length > 1 && (
            <button type="button" onClick={() => onRemove(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: '1.1rem', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
          )}
        </div>
      ))}
      <button type="button" onClick={onAdd}
        style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 8, padding: '3px 10px', fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer', marginTop: 2 }}>
        + Add {label}
      </button>
    </div>
  )

  return (
    <Modal isOpen onClose={onClose} title={titleStr} size="lg">

      {/* DATE — sets where this post lands in the Calendar / Editorial Planner */}
      <div className="form-group">
        <label className="form-label">📅 Date</label>
        <input
          className="form-input"
          type="date"
          value={editedDate}
          onChange={e => setEditedDate(e.target.value)}
          style={{ maxWidth: 220 }}
        />
        <p style={{ marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Changing the date moves this post to that day in the Calendar and Editorial Planner.
        </p>
      </div>

      {/* PLATFORMS — multi-select */}
      <div className="form-group">
        <label className="form-label">
          Platforms {selectedPlats.length === 0 && <span style={{ color: 'var(--priority-high, #B83060)', fontWeight: 400, marginLeft: 6 }}>· pick at least one</span>}
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {platforms.map(p => (
            <Chip
              key={p.id}
              color={colorHex(p.color)}
              active={selectedPlats.includes(p.id)}
              onClick={() => togglePlatform(p.id)}
            >
              <span style={{ marginRight: 4 }}>{platformIcon(p.id)}</span>{p.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* CONTENT PILLAR — single-select */}
      <div className="form-group">
        <label className="form-label">Content Pillar</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip color="var(--border)" active={pillar === ''} onClick={() => setPillar('')}>None</Chip>
          {pillars.map(p => (
            <Chip
              key={p.id}
              color={colorHex(p.color)}
              active={pillar === p.id}
              onClick={() => setPillar(p.id)}
            >{p.label}</Chip>
          ))}
        </div>
      </div>

      {/* IDEA / TITLE */}
      <div className="form-group">
        <label className="form-label">Idea / Title</label>
        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What's this post about?" autoFocus={isNew} />
      </div>

      {/* TIME OF DAY + TIME TO FILM */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Time of Day</label>
          <input className="form-input" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} placeholder="e.g. 9:00 AM" />
        </div>
        <div className="form-group">
          <label className="form-label">Time to Film</label>
          <input className="form-input" value={timeToFilm} onChange={e => setTimeToFilm(e.target.value)} placeholder="e.g. 30 mins" />
        </div>
      </div>

      {/* STAGE */}
      <div className="form-group">
        <label className="form-label">Stage</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STAGES.map(s => (
            <Chip
              key={s.id}
              color="var(--lavender, #C4AAED)"
              active={stage === s.id}
              onClick={() => setStage(s.id)}
            >{s.label}</Chip>
          ))}
        </div>
      </div>

      {/* PRODUCTION CHECKLIST */}
      <div className="form-group">
        <label className="form-label">Production Checklist</label>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          padding: '8px 10px', background: 'var(--surface-2)',
          borderRadius: 10, border: '1px solid var(--border)',
        }}>
          {CHECKLIST_FIELDS.map(key => {
            const checked = !!checklist[key]
            return (
              <label
                key={key}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 16, cursor: 'pointer',
                  background: checked ? 'var(--sage, #C8E0B0)' + '55' : 'var(--surface)',
                  border: `1.5px solid ${checked ? 'var(--sage, #C8E0B0)' : 'var(--border)'}`,
                  fontSize: '0.78rem', fontWeight: checked ? 600 : 500, color: 'var(--text)',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleCheck(key)}
                  style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--sage, #2A7A4A)', margin: 0 }} />
                {key}
              </label>
            )
          })}
        </div>
      </div>

      {/* SCRIPT / CAPTION with inline expand */}
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <label className="form-label" style={{ margin: 0 }}>Script / Caption</label>
          <button
            type="button"
            onClick={() => setScriptExpanded(v => !v)}
            title={scriptExpanded ? 'Collapse' : 'Expand for more room'}
            style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
              padding: '2px 8px', fontSize: '0.7rem', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            {scriptExpanded ? '⤡ Collapse' : '⤢ Expand'}
          </button>
        </div>
        <textarea
          className="form-input"
          value={script}
          onChange={e => setScript(e.target.value)}
          placeholder="Script outline, caption draft, key talking points…"
          rows={scriptExpanded ? 22 : 7}
          style={{
            resize: 'vertical',
            transition: 'min-height 0.2s ease',
            fontFamily: 'inherit',
            lineHeight: 1.55,
          }}
        />
      </div>

      {/* WHAT I NEED */}
      <div className="form-group">
        <label className="form-label">What I Need</label>
        <textarea className="form-input" value={whatINeed} onChange={e => setWhatINeed(e.target.value)}
          placeholder="Props, outfits, locations, people, apps, lighting…"
          rows={3} style={{ resize: 'vertical' }} />
      </div>

      {/* MEDIA LINKS — paste-only URL list */}
      <div className="form-group">
        <label className="form-label">
          Media Links <span style={{ color: 'var(--text-light)', fontWeight: 400, fontSize: '0.7rem' }}>· paste Drive / Dropbox / iCloud links</span>
        </label>
        <LinkList
          values={mediaLinks}
          onUpdate={updateLink(setMediaLinks)}
          onAdd={addLink(setMediaLinks)}
          onRemove={removeLink(setMediaLinks)}
          placeholder="https://drive.google.com/…"
          label="media link"
        />
      </div>

      {/* REFERENCE LINKS */}
      <div className="form-group">
        <label className="form-label">Reference Links</label>
        <LinkList
          values={refLinks}
          onUpdate={updateLink(setRefLinks)}
          onAdd={addLink(setRefLinks)}
          onRemove={removeLink(setRefLinks)}
          placeholder="https://…"
          label="reference"
        />
      </div>

      {/* NOTES */}
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Hashtags, reminders, collab ideas…" rows={3} style={{ resize: 'vertical' }} />
      </div>

      {/* FOOTER */}
      <div className="modal-footer">
        {!isNew && <button className="btn btn-danger btn-sm" onClick={onClear} style={{ marginRight: 'auto' }}>Delete</button>}
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary btn-sm"
          onClick={save}
          disabled={!canSave}
          title={!canSave ? 'Pick at least one platform and add a title' : ''}
        >
          Save Post
        </button>
      </div>
    </Modal>
  )
}
