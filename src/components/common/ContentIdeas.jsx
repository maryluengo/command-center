import { useState } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useCustomOptions } from '../../hooks/useCustomOptions'
import { OptionsManagerButton } from './OptionsManager'
import Modal from './Modal'
import FileUpload from './FileUpload'

const DEFAULT_PILLARS   = ['Fashion', 'Beauty', 'Real Life', 'María Swim']
const DEFAULT_PLATFORMS = ['Instagram', 'TikTok', 'Both', 'YouTube Short']
const DEFAULT_EFFORTS   = ['Quick', 'Half Day', 'Full Day']
const DEFAULT_STATUSES  = ['Just an Idea', 'Developing', 'Ready to Film', 'Done']

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

const PILLAR_COLORS = {
  'Fashion': '#F0AEC4', 'Beauty': '#C4AAED', 'Real Life': '#A8C8EC', 'María Swim': '#9ED8C6'
}
const EXTRA_COLORS = ['#F0AEC4','#C4AAED','#9ED8C6','#FFCFA8','#AECBAE','#A8C8EC']

function pillarColor(p, all) { return PILLAR_COLORS[p] || EXTRA_COLORS[all.indexOf(p) % EXTRA_COLORS.length] }

function tagClass(val, type) {
  if (type === 'pillar') {
    const map = { 'Fashion':'fashion','Beauty':'beauty','Real Life':'reallife','María Swim':'mariaswim' }
    return map[val] || 'fashion'
  }
  if (type === 'platform') {
    const map = { 'Instagram':'instagram','TikTok':'tiktok','Both':'both','YouTube Short':'youtube' }
    return map[val] || 'instagram'
  }
  if (type === 'effort') {
    const map = { 'Quick':'quick','Half Day':'halfday','Full Day':'fullday' }
    return map[val] || 'quick'
  }
  return ''
}

function statusClass(s) {
  const map = { 'Just an Idea':'idea','Developing':'developing','Ready to Film':'ready','Done':'done' }
  return map[s] || 'idea'
}

/**
 * ContentIdeas — shared across PersonalBrand and Agency.
 *
 * Props:
 *   storageKey    — scopes the ideas localStorage key
 *   showClient    — show client field
 *   clients       — client list for Agency
 *   customPillars — array of { label, bg, color } objects. When provided:
 *                   • overrides the shared useCustomOptions hook for pillars
 *                   • uses the supplied colors for card tops and tags
 *                   • hides the inline gear button (management done outside)
 *   onManagePillars — callback; when provided a "⚙ Manage pillars" button appears in toolbar
 */
export default function ContentIdeas({ storageKey, showClient = false, clients = [], customPillars, onManagePillars }) {
  const [ideas, setIdeas] = useLocalStorage(`content-ideas-${storageKey}`, [])

  // Shared hook — used by Agency (customPillars=undefined); result ignored when customPillars provided
  const { options: hookPillars }  = useCustomOptions('ideas-pillars',   DEFAULT_PILLARS)
  const { options: platforms }    = useCustomOptions('ideas-platforms', DEFAULT_PLATFORMS)
  const { options: efforts }      = useCustomOptions('ideas-efforts',   DEFAULT_EFFORTS)
  const { options: statuses }     = useCustomOptions('ideas-statuses',  DEFAULT_STATUSES)

  // Resolved pillar labels — custom (PersonalBrand) or shared hook (Agency)
  const pillars = customPillars ? customPillars.map(p => p.label) : hookPillars

  // Fast lookup for custom pillar colors: label → { bg, color }
  const cpMap = customPillars
    ? Object.fromEntries(customPillars.map(p => [p.label, { bg: p.bg, color: p.color }]))
    : null

  // Card-top color: use custom bg if available, else legacy function
  const cardTopBg = (label) => {
    if (cpMap) return (cpMap[label]?.bg) ?? '#E8E8EC'
    return pillarColor(label, pillars)
  }

  // Inline style for the tag pill on a card
  const tagPillStyle = (label) => {
    if (cpMap && cpMap[label]) return { background: cpMap[label].bg, color: cpMap[label].color }
    if (cpMap) return { background: '#EDEDF0', color: '#666670' }  // old/unknown → soft gray
    return null  // null = use CSS class system
  }

  const emptyCard = () => ({
    id: genId(), title: '', description: '',
    pillar: pillars[0] || 'Fashion', platform: 'Instagram',
    effort: 'Quick', status: 'Just an Idea',
    files: [], links: [''], client: '',
  })

  const [modalOpen, setModalOpen]   = useState(false)
  const [editCard,  setEditCard]    = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPillar, setFilterPillar] = useState('All')

  const openNew  = ()     => { setEditCard(emptyCard()); setModalOpen(true) }
  const openEdit = (card) => { setEditCard({ ...card }); setModalOpen(true) }

  const save = () => {
    if (!editCard.title.trim()) return
    const exists = ideas.find(i => i.id === editCard.id)
    if (exists) setIdeas(p => p.map(i => i.id === editCard.id ? editCard : i))
    else        setIdeas(p => [editCard, ...p])
    setModalOpen(false)
  }

  const del = id => { if (confirm('Delete this idea?')) setIdeas(p => p.filter(i => i.id !== id)) }

  const upd        = (k, v) => setEditCard(p => ({ ...p, [k]: v }))
  const addLink    = ()     => upd('links', [...(editCard.links || ['']), ''])
  const updLink    = (i, v) => { const l = [...(editCard.links || [])]; l[i] = v; upd('links', l) }
  const remLink    = i      => upd('links', editCard.links.filter((_, idx) => idx !== i))

  const filtered = ideas
    .filter(i => filterStatus === 'All' || i.status === filterStatus)
    .filter(i => filterPillar === 'All' || i.pillar === filterPillar)

  // Label + gear row (Agency only — hidden when customPillars provided)
  const LG = ({ children, optKey, defaults, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <label className="form-label" style={{ margin: 0 }}>{children}</label>
      <OptionsManagerButton optionsKey={optKey} defaults={defaults} label={label} />
    </div>
  )

  return (
    <div>
      {/* Toolbar */}
      <div className="ideas-toolbar">
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ New Idea</button>

        {/* ⚙ Manage pillars — only when caller provides a handler (PersonalBrand) */}
        {onManagePillars && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onManagePillars}
            style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
          >
            ⚙ Manage pillars
          </button>
        )}

        <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filterPillar} onChange={e => setFilterPillar(e.target.value)}>
          <option value="All">All Pillars</option>
          {pillars.map(p => <option key={p}>{p}</option>)}
          {/* If current filter is an old pillar no longer in list, keep it selectable */}
          {filterPillar !== 'All' && !pillars.includes(filterPillar) && (
            <option value={filterPillar}>{filterPillar}</option>
          )}
        </select>
        <span className="text-sm text-muted">{filtered.length} idea{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Board */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💡</div>
          <h3>No ideas yet</h3>
          <p>Click "+ New Idea" to start your brainstorm board</p>
        </div>
      ) : (
        <div className="ideas-board">
          {filtered.map(card => {
            const tStyle = tagPillStyle(card.pillar)
            return (
              <div key={card.id} className="idea-card">
                <div className="idea-card-top" style={{ background: cardTopBg(card.pillar) }} />
                <div className="idea-card-body">
                  <div className="idea-card-title">{card.title}</div>
                  {card.description && <div className="idea-card-desc">{card.description}</div>}

                  <div className="tag-row">
                    {/* Pillar tag — inline style when custom, CSS class when legacy */}
                    {tStyle
                      ? <span className="tag" style={tStyle}>{card.pillar}</span>
                      : <span className={`tag tag-${tagClass(card.pillar, 'pillar')}`}>{card.pillar}</span>
                    }
                    <span className={`tag tag-${tagClass(card.platform, 'platform')}`}>{card.platform}</span>
                    <span className={`tag tag-${tagClass(card.effort, 'effort')}`}>{card.effort}</span>
                    {showClient && card.client && (
                      <span className="tag" style={{ background: '#E8F4FF', color: '#1A4080' }}>{card.client}</span>
                    )}
                  </div>

                  <span className={`status-badge status-${statusClass(card.status)}`}>{card.status}</span>

                  {card.files?.length > 0 && (
                    <div className="idea-card-files">
                      {card.files.slice(0, 4).map(f =>
                        f.type?.startsWith('image/') ? (
                          <img key={f.id} src={f.data} alt={f.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} />
                        ) : (
                          <span key={f.id} style={{ fontSize: '22px' }}>📄</span>
                        )
                      )}
                      {card.files.length > 4 && <span className="text-sm text-muted">+{card.files.length - 4}</span>}
                    </div>
                  )}
                </div>
                <div className="idea-card-actions">
                  <button className="btn btn-ghost btn-xs" onClick={() => openEdit(card)}>Edit</button>
                  <button className="btn btn-danger btn-xs" onClick={() => del(card.id)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && editCard && (
        <Modal isOpen onClose={() => setModalOpen(false)} title={editCard.title || 'New Idea'} size="lg">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={editCard.title} onChange={e => upd('title', e.target.value)} placeholder="Idea title..." autoFocus />
            </div>
            {showClient && (
              <div className="form-group">
                <label className="form-label">Client</label>
                {clients.length > 0 ? (
                  <select className="form-select" value={editCard.client} onChange={e => upd('client', e.target.value)}>
                    <option value="">No client</option>
                    {clients.map(c => <option key={c}>{c}</option>)}
                  </select>
                ) : (
                  <input className="form-input" value={editCard.client} onChange={e => upd('client', e.target.value)} placeholder="Client name..." />
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={editCard.description} onChange={e => upd('description', e.target.value)} placeholder="Describe this idea..." />
          </div>

          <div className="form-row-3">
            <div className="form-group">
              {/* Pillar — show gear button for Agency (shared hook), plain label for PersonalBrand (custom) */}
              {customPillars ? (
                <label className="form-label" style={{ marginBottom: 4 }}>Content Pillar</label>
              ) : (
                <LG optKey="ideas-pillars" defaults={DEFAULT_PILLARS} label="Content Pillars">Content Pillar</LG>
              )}
              <select className="form-select" value={editCard.pillar} onChange={e => upd('pillar', e.target.value)}>
                {pillars.map(p => <option key={p}>{p}</option>)}
                {/* If the card's saved pillar isn't in the current list, keep it as an option so the user can reassign */}
                {editCard.pillar && !pillars.includes(editCard.pillar) && (
                  <option value={editCard.pillar}>{editCard.pillar} ↺ reassign</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <LG optKey="ideas-platforms" defaults={DEFAULT_PLATFORMS} label="Platforms">Platform</LG>
              <select className="form-select" value={editCard.platform} onChange={e => upd('platform', e.target.value)}>
                {platforms.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <LG optKey="ideas-efforts" defaults={DEFAULT_EFFORTS} label="Effort Levels">Effort</LG>
              <select className="form-select" value={editCard.effort} onChange={e => upd('effort', e.target.value)}>
                {efforts.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <LG optKey="ideas-statuses" defaults={DEFAULT_STATUSES} label="Idea Statuses">Status</LG>
            <select className="form-select" value={editCard.status} onChange={e => upd('status', e.target.value)}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reference Links</label>
            {(editCard.links || ['']).map((link, i) => (
              <div key={i} className="flex gap-sm mb-sm">
                <input className="form-input" value={link} onChange={e => updLink(i, e.target.value)} placeholder="https://..." type="url" />
                {(editCard.links || []).length > 1 && <button className="btn btn-danger btn-sm" onClick={() => remLink(i)}>×</button>}
              </div>
            ))}
            <button className="btn btn-ghost btn-xs" onClick={addLink}>+ Add Link</button>
          </div>

          <div className="form-group">
            <label className="form-label">Reference Files</label>
            <FileUpload files={editCard.files || []} onChange={f => upd('files', f)} label="Upload images, videos or documents" />
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save Idea</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
