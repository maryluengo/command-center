import { useState, useRef } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import TodoList from '../common/TodoList'
import Modal from '../common/Modal'
import FileUpload from '../common/FileUpload'

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

// ─────────────── Research Hub ───────────────
const DEFAULT_RESEARCH_TABS = [
  'Competitor Research', 'Fabric & Production', 'Pricing',
  'Legal/Trademark', 'Branding & Aesthetic', 'Marketing'
]

function ResearchHub() {
  const [tabs, setTabs]   = useLocalStorage('swim-research-tabs', DEFAULT_RESEARCH_TABS)
  const [notes, setNotes] = useLocalStorage('swim-research-notes', {})
  const [files, setFiles] = useLocalStorage('swim-research-files', {})
  const [activeTab, setActiveTab]   = useState(0)
  const [newTabName, setNewTabName] = useState('')
  const [addingTab, setAddingTab]   = useState(false)

  const currentTab = tabs[activeTab]

  const addTab = () => {
    if (!newTabName.trim()) return
    setTabs(prev => [...prev, newTabName.trim()])
    setActiveTab(tabs.length)
    setNewTabName('')
    setAddingTab(false)
  }

  const deleteTab = (i) => {
    if (!confirm(`Remove tab "${tabs[i]}"?`)) return
    const newTabs = tabs.filter((_, idx) => idx !== i)
    setTabs(newTabs)
    setActiveTab(Math.min(activeTab, newTabs.length - 1))
  }

  const updNotes = (val) => setNotes(prev => ({ ...prev, [currentTab]: val }))
  const updFiles = (val) => setFiles(prev => ({ ...prev, [currentTab]: val }))

  return (
    <div>
      {/* Tab bar */}
      <div className="research-tab-bar">
        {tabs.map((tab, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              className={`research-tab ${activeTab === i ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
            {tabs.length > 1 && (
              <button
                onClick={() => deleteTab(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
                title="Remove tab"
              >×</button>
            )}
          </div>
        ))}

        {addingTab ? (
          <div className="flex gap-sm items-center">
            <input
              className="form-input"
              value={newTabName}
              onChange={e => setNewTabName(e.target.value)}
              placeholder="Tab name..."
              style={{ width: 140 }}
              onKeyDown={e => e.key === 'Enter' && addTab()}
              autoFocus
            />
            <button className="btn btn-primary btn-xs" onClick={addTab}>Add</button>
            <button className="btn btn-ghost btn-xs" onClick={() => setAddingTab(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-xs" onClick={() => setAddingTab(true)}>+ New Tab</button>
        )}
      </div>

      {currentTab && (
        <div className="card">
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', marginBottom: 16 }}>{currentTab}</h3>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={notes[currentTab] || ''}
              onChange={e => updNotes(e.target.value)}
              placeholder={`Write your ${currentTab.toLowerCase()} notes here...`}
              style={{ minHeight: 200 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Files & References</label>
            <FileUpload
              files={files[currentTab] || []}
              onChange={updFiles}
              label={`Upload files for ${currentTab}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────── Moodboards ───────────────
function Moodboards() {
  const [boards, setBoards]  = useLocalStorage('swim-moodboards', [])
  const [activeId, setActiveId] = useState(null)
  const [newName, setNewName]   = useState('')
  const [addingBoard, setAddingBoard] = useState(false)
  const imgInputRef = useRef()

  const activeBoard = boards.find(b => b.id === activeId)

  const addBoard = () => {
    if (!newName.trim()) return
    const board = { id: genId(), name: newName.trim(), images: [] }
    setBoards(prev => [...prev, board])
    setActiveId(board.id)
    setNewName('')
    setAddingBoard(false)
  }

  const deleteBoard = (id) => {
    if (!confirm('Delete this moodboard?')) return
    setBoards(prev => prev.filter(b => b.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const addImages = async (e) => {
    if (!activeId) return
    const rawFiles = Array.from(e.target.files)
    const imgs = []
    for (const f of rawFiles) {
      if (f.size > 3 * 1024 * 1024) { alert(`"${f.name}" is over 3MB`); continue }
      const data = await new Promise(res => {
        const r = new FileReader()
        r.onload = ev => res(ev.target.result)
        r.readAsDataURL(f)
      })
      imgs.push({ id: genId(), name: f.name, data })
    }
    setBoards(prev => prev.map(b => b.id === activeId ? { ...b, images: [...b.images, ...imgs] } : b))
  }

  const removeImage = (boardId, imgId) => {
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, images: b.images.filter(i => i.id !== imgId) } : b))
  }

  return (
    <div>
      {boards.length === 0 && !addingBoard ? (
        <div className="empty-state">
          <div className="empty-icon">🎨</div>
          <h3>No moodboards yet</h3>
          <p>Create a named collection to start pinning inspiration images.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setAddingBoard(true)}>+ Create Moodboard</button>
        </div>
      ) : (
        <div className="moodboard-layout">
          {/* Sidebar list */}
          <div className="moodboard-sidebar">
            <button className="btn btn-primary btn-sm" style={{ marginBottom: 10 }} onClick={() => setAddingBoard(true)}>+ New</button>

            {addingBoard && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                <input
                  className="form-input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Board name..."
                  onKeyDown={e => e.key === 'Enter' && addBoard()}
                  autoFocus
                />
                <div className="flex gap-xs">
                  <button className="btn btn-primary btn-xs" onClick={addBoard}>Create</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => setAddingBoard(false)}>Cancel</button>
                </div>
              </div>
            )}

            {boards.map(board => (
              <div
                key={board.id}
                className={`moodboard-list-item ${activeId === board.id ? 'active' : ''}`}
                onClick={() => setActiveId(board.id)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteBoard(board.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: 14, flexShrink: 0 }}
                >×</button>
              </div>
            ))}
          </div>

          {/* Board content */}
          <div>
            {activeBoard ? (
              <>
                <div className="flex items-center justify-between mb-md">
                  <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>{activeBoard.name}</h3>
                  <div className="flex gap-sm">
                    <span className="text-sm text-muted">{activeBoard.images.length} image{activeBoard.images.length !== 1 ? 's' : ''}</span>
                    <button className="btn btn-primary btn-sm" onClick={() => imgInputRef.current.click()}>+ Upload</button>
                  </div>
                </div>

                <input ref={imgInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={addImages} />

                {activeBoard.images.length === 0 ? (
                  <div
                    style={{ border: '2px dashed var(--border-strong)', borderRadius: 'var(--r-lg)', padding: 48, textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                    onClick={() => imgInputRef.current.click()}
                  >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div>
                    <p style={{ fontSize: '0.85rem' }}>Click or drag images here</p>
                  </div>
                ) : (
                  <div className="moodboard-grid">
                    {activeBoard.images.map(img => (
                      <div key={img.id} className="moodboard-img-wrap">
                        <img src={img.data} alt={img.name} />
                        <button
                          className="moodboard-img-remove"
                          onClick={() => removeImage(activeBoard.id, img.id)}
                        >×</button>
                      </div>
                    ))}
                    <div
                      style={{ aspectRatio: 1, border: '2px dashed var(--border-strong)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-light)', fontSize: 28 }}
                      onClick={() => imgInputRef.current.click()}
                    >+</div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state" style={{ paddingTop: 60 }}>
                <div className="empty-icon">👈</div>
                <h3>Select a board</h3>
                <p>Choose a moodboard from the left to view and add images.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────── Business Stages Kanban ───────────────
const STAGES = ['Research', 'Development', 'Pre-Launch', 'Launch', 'Growth']

const STAGE_COLORS = {
  'Research':    '#C4AAED',
  'Development': '#FFCFA8',
  'Pre-Launch':  '#F0AEC4',
  'Launch':      '#9ED8C6',
  'Growth':      '#AECBAE',
}

function BusinessStages() {
  const [cards, setCards] = useLocalStorage('swim-kanban', [])
  const [modalOpen, setModalOpen]   = useState(false)
  const [editCard, setEditCard]     = useState(null)
  const [dragId, setDragId]         = useState(null)
  const [dragOver, setDragOver]     = useState(null)

  const openNew = (stage) => {
    setEditCard({ id: genId(), title: '', description: '', stage })
    setModalOpen(true)
  }

  const openEdit = (card) => {
    setEditCard({ ...card })
    setModalOpen(true)
  }

  const save = () => {
    if (!editCard.title.trim()) return
    const exists = cards.find(c => c.id === editCard.id)
    if (exists) setCards(prev => prev.map(c => c.id === editCard.id ? editCard : c))
    else setCards(prev => [...prev, editCard])
    setModalOpen(false)
  }

  const deleteCard = (id) => {
    setCards(prev => prev.filter(c => c.id !== id))
    setModalOpen(false)
  }

  const handleDragStart = (e, id) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e, stage) => {
    e.preventDefault()
    if (dragId) {
      setCards(prev => prev.map(c => c.id === dragId ? { ...c, stage } : c))
    }
    setDragId(null)
    setDragOver(null)
  }

  return (
    <div>
      <div className="kanban-board">
        {STAGES.map(stage => {
          const stageCards = cards.filter(c => c.stage === stage)
          return (
            <div
              key={stage}
              className={`kanban-col ${dragOver === stage ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, stage)}
            >
              <div className="kanban-col-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[stage] }} />
                  {stage}
                </span>
                <span className="kanban-count">{stageCards.length}</span>
              </div>

              {stageCards.map(card => (
                <div
                  key={card.id}
                  className={`kanban-card ${dragId === card.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={e => handleDragStart(e, card.id)}
                  onDragEnd={() => setDragId(null)}
                >
                  <div className="kanban-card-title">{card.title}</div>
                  {card.description && (
                    <div className="kanban-card-desc">{card.description}</div>
                  )}
                  <div className="kanban-card-actions">
                    <button className="btn btn-ghost btn-xs" onClick={() => openEdit(card)}>Edit</button>
                  </div>
                </div>
              ))}

              <button
                className="btn btn-ghost btn-xs"
                style={{ width: '100%', marginTop: 6, borderStyle: 'dashed' }}
                onClick={() => openNew(stage)}
              >
                + Add Card
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modalOpen && editCard && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editCard.id && cards.find(c => c.id === editCard.id) ? 'Edit Card' : 'New Card'}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={editCard.title} onChange={e => setEditCard(p => ({ ...p, title: e.target.value }))} placeholder="Card title..." autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={editCard.description} onChange={e => setEditCard(p => ({ ...p, description: e.target.value }))} placeholder="Details, notes, links..." />
          </div>
          <div className="form-group">
            <label className="form-label">Stage</label>
            <select className="form-select" value={editCard.stage} onChange={e => setEditCard(p => ({ ...p, stage: e.target.value }))}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="modal-footer">
            {cards.find(c => c.id === editCard.id) && (
              <button className="btn btn-danger btn-sm" onClick={() => deleteCard(editCard.id)} style={{ marginRight: 'auto' }}>Delete</button>
            )}
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────── Main MariaSwim Section ───────────────
export default function MariaSwim() {
  const [tab, setTab] = useState('todo')

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">María Swim</h1>
          <p className="section-subtitle">Business planning & brand building</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'todo'     ? 'active' : ''}`} onClick={() => setTab('todo')}>✅ To-Do</button>
        <button className={`tab ${tab === 'research' ? 'active' : ''}`} onClick={() => setTab('research')}>🔬 Research Hub</button>
        <button className={`tab ${tab === 'moods'    ? 'active' : ''}`} onClick={() => setTab('moods')}>🎨 Moodboards</button>
        <button className={`tab ${tab === 'kanban'   ? 'active' : ''}`} onClick={() => setTab('kanban')}>📊 Business Stages</button>
      </div>

      {tab === 'todo' && (
        <div className="card">
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', marginBottom: 20 }}>María Swim To-Do</h2>
          <TodoList storageKey="swim" />
        </div>
      )}

      {tab === 'research' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Research Hub</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Organized notes and files per category</p>
          </div>
          <ResearchHub />
        </div>
      )}

      {tab === 'moods' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Moodboards</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Visual inspiration collections</p>
          </div>
          <Moodboards />
        </div>
      )}

      {tab === 'kanban' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>Business Stages</h2>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>Drag cards between stages to track progress</p>
          </div>
          <BusinessStages />
        </div>
      )}
    </div>
  )
}
