import { useState } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import TodoList from '../common/TodoList'
import ContentIdeas from '../common/ContentIdeas'
import ContentCalendar from '../common/ContentCalendar'
import Modal from '../common/Modal'
import FileUpload from '../common/FileUpload'

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

// ─────────────── Prospective Clients ───────────────
const CLIENT_STATUSES = ['Researching', 'Reached Out', 'In Conversation', 'Signed', 'Passed']

const PROSPECT_STYLE = {
  'Researching':    { cls: 'prospect-researching' },
  'Reached Out':    { cls: 'prospect-reached-out' },
  'In Conversation':{ cls: 'prospect-conversation' },
  'Signed':         { cls: 'prospect-signed' },
  'Passed':         { cls: 'prospect-passed' },
}

function ProspectiveClients() {
  const [prospects, setProspects] = useLocalStorage('agency-prospects', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [editProspect, setEditProspect] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')

  const empty = () => ({ id: genId(), businessName: '', contactInfo: '', status: 'Researching', notes: '', followUpDate: '' })

  const openNew  = () => { setEditProspect(empty()); setModalOpen(true) }
  const openEdit = (p) => { setEditProspect({ ...p }); setModalOpen(true) }

  const save = () => {
    if (!editProspect.businessName.trim()) return
    const exists = prospects.find(p => p.id === editProspect.id)
    if (exists) setProspects(prev => prev.map(p => p.id === editProspect.id ? editProspect : p))
    else setProspects(prev => [...prev, editProspect])
    setModalOpen(false)
  }

  const del = (id) => {
    if (confirm('Remove this prospect?')) {
      setProspects(prev => prev.filter(p => p.id !== id))
      setModalOpen(false)
    }
  }

  const upd = (key, val) => setEditProspect(prev => ({ ...prev, [key]: val }))

  const filtered = filterStatus === 'All'
    ? prospects
    : prospects.filter(p => p.status === filterStatus)

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-sm mb-md wrap">
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Prospect</button>
        <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {CLIENT_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="text-sm text-muted">{filtered.length} prospect{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Summary counts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {CLIENT_STATUSES.map(s => {
          const count = prospects.filter(p => p.status === s).length
          return count > 0 ? (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? 'All' : s)}
              className={`prospect-status ${PROSPECT_STYLE[s]?.cls}`}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              {s} · {count}
            </button>
          ) : null
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤝</div>
          <h3>No prospects yet</h3>
          <p>Track potential clients and follow-ups here.</p>
        </div>
      ) : (
        <div className="prospects-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="prospects-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.businessName}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 160 }}>{p.contactInfo}</td>
                  <td>
                    <span className={`prospect-status ${PROSPECT_STYLE[p.status]?.cls}`}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {p.followUpDate ? new Date(p.followUpDate + 'T12:00').toLocaleDateString('default', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td style={{ fontSize: '0.82rem', maxWidth: 200, color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                  <td>
                    <button className="btn btn-ghost btn-xs" onClick={() => openEdit(p)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && editProspect && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editProspect.businessName || 'New Prospect'}>
          <div className="form-group">
            <label className="form-label">Business Name *</label>
            <input className="form-input" value={editProspect.businessName} onChange={e => upd('businessName', e.target.value)} placeholder="Business name..." autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Info</label>
            <input className="form-input" value={editProspect.contactInfo} onChange={e => upd('contactInfo', e.target.value)} placeholder="Email, Instagram, phone..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={editProspect.status} onChange={e => upd('status', e.target.value)}>
                {CLIENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Follow-up Date</label>
              <input className="form-input" type="date" value={editProspect.followUpDate} onChange={e => upd('followUpDate', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={editProspect.notes} onChange={e => upd('notes', e.target.value)} placeholder="Notes about this prospect..." />
          </div>
          <div className="modal-footer">
            {prospects.find(p => p.id === editProspect.id) && (
              <button className="btn btn-danger btn-sm" onClick={() => del(editProspect.id)} style={{ marginRight: 'auto' }}>Delete</button>
            )}
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────── Documents & Resources ───────────────
const DOC_CATEGORIES = ['Contracts & Templates', 'Pricing & Packages', 'Pitch Decks', 'Processes & SOPs']

function Documents() {
  const [notes, setNotes] = useLocalStorage('agency-doc-notes', {})
  const [files, setFiles] = useLocalStorage('agency-doc-files', {})
  const [activeTab, setActiveTab] = useState(0)

  const cat = DOC_CATEGORIES[activeTab]

  return (
    <div>
      {/* Tab bar */}
      <div className="research-tab-bar">
        {DOC_CATEGORIES.map((c, i) => (
          <button
            key={i}
            className={`research-tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="card">
        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', marginBottom: 16 }}>{cat}</h3>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            value={notes[cat] || ''}
            onChange={e => setNotes(prev => ({ ...prev, [cat]: e.target.value }))}
            placeholder={`Notes for ${cat.toLowerCase()}...`}
            style={{ minHeight: 140 }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Files</label>
          <FileUpload
            files={files[cat] || []}
            onChange={val => setFiles(prev => ({ ...prev, [cat]: val }))}
            label={`Upload files for ${cat}`}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────── Ideas Board ───────────────
function IdeasBoard() {
  const [ideas, setIdeas] = useLocalStorage('agency-ideas', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [editIdea, setEditIdea]   = useState(null)

  const openNew  = () => { setEditIdea({ id: genId(), title: '', description: '' }); setModalOpen(true) }
  const openEdit = (idea) => { setEditIdea({ ...idea }); setModalOpen(true) }

  const save = () => {
    if (!editIdea.title.trim()) return
    const exists = ideas.find(i => i.id === editIdea.id)
    if (exists) setIdeas(prev => prev.map(i => i.id === editIdea.id ? editIdea : i))
    else setIdeas(prev => [editIdea, ...prev])
    setModalOpen(false)
  }

  const del = (id) => {
    if (confirm('Delete this idea?')) { setIdeas(prev => prev.filter(i => i.id !== id)); setModalOpen(false) }
  }

  return (
    <div>
      <div className="ideas-toolbar">
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ New Idea</button>
        <span className="text-sm text-muted">{ideas.length} idea{ideas.length !== 1 ? 's' : ''}</span>
      </div>

      {ideas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💼</div>
          <h3>No ideas yet</h3>
          <p>Capture business ideas, strategies and concepts here.</p>
        </div>
      ) : (
        <div className="ideas-board">
          {ideas.map(idea => (
            <div key={idea.id} className="idea-card">
              <div className="idea-card-top" style={{ background: 'linear-gradient(90deg, var(--peach), var(--pink))' }} />
              <div className="idea-card-body">
                <div className="idea-card-title">{idea.title}</div>
                {idea.description && <div className="idea-card-desc">{idea.description}</div>}
              </div>
              <div className="idea-card-actions">
                <button className="btn btn-ghost btn-xs" onClick={() => openEdit(idea)}>Edit</button>
                <button className="btn btn-danger btn-xs" onClick={() => del(idea.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && editIdea && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editIdea.title || 'New Idea'}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={editIdea.title} onChange={e => setEditIdea(p => ({ ...p, title: e.target.value }))} placeholder="Idea title..." autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={editIdea.description} onChange={e => setEditIdea(p => ({ ...p, description: e.target.value }))} placeholder="Describe the idea..." style={{ minHeight: 100 }} />
          </div>
          <div className="modal-footer">
            {ideas.find(i => i.id === editIdea.id) && (
              <button className="btn btn-danger btn-sm" onClick={() => del(editIdea.id)} style={{ marginRight: 'auto' }}>Delete</button>
            )}
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────── Client Manager (for calendar dropdown) ───────────────
function ClientManager({ clients, setClients }) {
  const [newClient, setNewClient] = useState('')

  const add = () => {
    const name = newClient.trim()
    if (!name || clients.includes(name)) return
    setClients(prev => [...prev, name])
    setNewClient('')
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', marginBottom: 12 }}>Manage Clients</h3>
      <div className="flex gap-sm mb-md wrap">
        <input
          className="form-input"
          value={newClient}
          onChange={e => setNewClient(e.target.value)}
          placeholder="Add client name..."
          style={{ maxWidth: 220 }}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className="btn btn-primary btn-sm" onClick={add}>Add</button>
      </div>
      <div className="flex gap-xs wrap">
        {clients.map(c => (
          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', padding: '3px 10px', fontSize: '0.82rem' }}>
            {c}
            <button
              onClick={() => setClients(prev => prev.filter(x => x !== c))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 14, lineHeight: 1 }}
            >×</button>
          </span>
        ))}
        {clients.length === 0 && <span className="text-sm text-muted">No clients yet</span>}
      </div>
    </div>
  )
}

// ─────────────── Main Agency Section ───────────────
export default function Agency() {
  const [tab, setTab] = useState('todo')
  const [clients, setClients] = useLocalStorage('agency-clients', [])

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">Social Media Agency</h1>
          <p className="section-subtitle">Client work, strategy & operations</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'todo'      ? 'active' : ''}`} onClick={() => setTab('todo')}>✅ To-Do</button>
        <button className={`tab ${tab === 'ideas'     ? 'active' : ''}`} onClick={() => setTab('ideas')}>💡 Content Ideas</button>
        <button className={`tab ${tab === 'calendar'  ? 'active' : ''}`} onClick={() => setTab('calendar')}>📆 Calendar</button>
        <button className={`tab ${tab === 'prospects' ? 'active' : ''}`} onClick={() => setTab('prospects')}>🤝 Prospects</button>
        <button className={`tab ${tab === 'docs'      ? 'active' : ''}`} onClick={() => setTab('docs')}>📁 Documents</button>
        <button className={`tab ${tab === 'ideasboard'? 'active' : ''}`} onClick={() => setTab('ideasboard')}>🚀 Ideas Board</button>
      </div>

      {tab === 'todo' && (
        <div className="card">
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', marginBottom: 20 }}>Agency To-Do</h2>
          <TodoList storageKey="agency" />
        </div>
      )}

      {tab === 'ideas' && (
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Content Ideas</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Brainstorm board with client tracking</p>
          </div>
          <ContentIdeas storageKey="agency" showClient={true} clients={clients} />
        </div>
      )}

      {tab === 'calendar' && (
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Content Calendar</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Plan content per client — click any day</p>
          </div>
          <ClientManager clients={clients} setClients={setClients} />
          <ContentCalendar storageKey="agency" showClient={true} clients={clients} />
        </div>
      )}

      {tab === 'prospects' && (
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Prospective Clients</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Track leads and follow-ups</p>
          </div>
          <ProspectiveClients />
        </div>
      )}

      {tab === 'docs' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Documents & Resources</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Contracts, pricing, pitch decks and SOPs</p>
          </div>
          <Documents />
        </div>
      )}

      {tab === 'ideasboard' && (
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Ideas Board</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Business ideas and strategies</p>
          </div>
          <IdeasBoard />
        </div>
      )}
    </div>
  )
}
