import { useState, useRef, useEffect } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'

// ─────────────── Area config ───────────────
const AREAS = [
  { label: 'Content',          bg: '#FFE8E8', color: '#C0392B' },
  { label: 'Maria Swim',       bg: '#FFF0E4', color: '#C46E22' },
  { label: 'Work',             bg: '#E8FFE8', color: '#1E8B45' },
  { label: 'Health',           bg: '#FFFBE6', color: '#9A7A00' },
  { label: 'Self-Care',        bg: '#FAE4EE', color: '#B03070' },
  { label: 'Study',            bg: '#D8F5EC', color: '#0A7A6A' },
  { label: 'Life Admin',       bg: '#EDE0FF', color: '#5B30A0' },
  { label: 'Friends & Family', bg: '#FFEEE0', color: '#B05A20' },
]

const EFFORTS = [
  { label: 'Quick',  sub: '< 15 min', bg: '#E8FFE8', color: '#1E8B45' },
  { label: 'Medium', sub: '15–60 min', bg: '#FFFBE6', color: '#9A7A00' },
  { label: 'Deep',   sub: '1 hr+',    bg: '#FFE8E8', color: '#C0392B' },
]

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ─────────────── Pill Badges ───────────────
function AreaBadge({ area }) {
  const cfg = AREAS.find(a => a.label === area)
  if (!cfg) return <span className="ntd-empty-pill">—</span>
  return <span className="ntd-pill" style={{ background: cfg.bg, color: cfg.color }}>{area}</span>
}

function EffortBadge({ effort }) {
  const cfg = EFFORTS.find(e => e.label === effort)
  if (!cfg) return <span className="ntd-empty-pill">—</span>
  return <span className="ntd-pill" style={{ background: cfg.bg, color: cfg.color }}>{effort}</span>
}

// ─────────────── Inline Edit Cell ───────────────
function EditCell({ todo, field, type, options, placeholder, onUpdate, isEditing, onStartEdit, onStopEdit }) {
  const inputRef = useRef(null)
  const value    = todo[field]

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus()
  }, [isEditing])

  if (isEditing) {
    if (options) {
      return (
        <select
          ref={inputRef}
          className="ntd-inline-select"
          value={value}
          onChange={e => { onUpdate(field, e.target.value); onStopEdit() }}
          onBlur={onStopEdit}
        >
          <option value="">—</option>
          {options.map(o => <option key={o.label} value={o.label}>{o.label}{o.sub ? ` (${o.sub})` : ''}</option>)}
        </select>
      )
    }
    if (type === 'date') {
      return (
        <input
          ref={inputRef}
          type="date"
          className="ntd-inline-input"
          value={value}
          onChange={e => onUpdate(field, e.target.value)}
          onBlur={onStopEdit}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onStopEdit() }}
        />
      )
    }
    return (
      <input
        ref={inputRef}
        type="text"
        className="ntd-inline-input"
        value={value}
        placeholder={placeholder}
        onChange={e => onUpdate(field, e.target.value)}
        onBlur={onStopEdit}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onStopEdit() }}
      />
    )
  }

  // Display mode
  if (field === 'area')   return <div className="ntd-cell-click" onClick={onStartEdit}><AreaBadge area={value} /></div>
  if (field === 'effort') return <div className="ntd-cell-click" onClick={onStartEdit}><EffortBadge effort={value} /></div>

  if (field === 'dueDate') {
    const display = value ? new Date(value + 'T12:00:00').toLocaleDateString('default', { month: 'short', day: 'numeric' }) : '—'
    const overdue = value && new Date(value + 'T12:00:00') < new Date() && !todo.done
    return (
      <div className="ntd-cell-click" onClick={onStartEdit} style={{ color: overdue ? 'var(--priority-high)' : undefined, fontWeight: overdue ? 600 : undefined }}>
        {display}
      </div>
    )
  }

  if (field === 'notes') {
    return (
      <div className="ntd-cell-click ntd-notes-cell" onClick={onStartEdit}>
        {value || <span className="ntd-placeholder">Add note…</span>}
      </div>
    )
  }

  // task field
  return (
    <div
      className="ntd-cell-click ntd-task-cell"
      style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? 'var(--text-muted)' : 'var(--text)' }}
      onClick={onStartEdit}
    >
      {value || <span className="ntd-placeholder">Untitled task</span>}
    </div>
  )
}

// ─────────────── Main Component ───────────────
export default function TodoList({ storageKey }) {
  const [todos, setTodos] = useLocalStorage(`todos-${storageKey}`, [])
  const [editId,    setEditId]    = useState(null)
  const [editField, setEditField] = useState(null)
  const [filter,    setFilter]    = useState('all')
  const [sparkleId, setSparkleId] = useState(null)

  const addTodo = () => {
    const id = genId()
    const newTodo = { id, task: '', area: '', effort: '', dueDate: '', done: false, notes: '' }
    setTodos(prev => [...prev, newTodo])
    setEditId(id)
    setEditField('task')
  }

  const updateTodo = (id, field, value) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  const toggleDone = (id) => {
    const todo = todos.find(t => t.id === id)
    if (todo && !todo.done) {
      setSparkleId(id)
      setTimeout(() => setSparkleId(null), 700)
    }
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const startEdit = (id, field) => { setEditId(id); setEditField(field) }
  const stopEdit  = ()           => { setEditId(null); setEditField(null) }

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.done
    if (filter === 'done')   return t.done
    return true
  })

  const done  = todos.filter(t => t.done).length
  const total = todos.length
  const pct   = total ? Math.round((done / total) * 100) : 0

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {done}/{total} done
          </span>
          {total > 0 && (
            <div style={{ width: 80, height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--pink), var(--lavender))', borderRadius: 999, transition: 'width 0.4s ease' }} />
            </div>
          )}
          {total > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct}%</span>}
        </div>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${filter === 'all'    ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
          <button className={`tab ${filter === 'done'   ? 'active' : ''}`} onClick={() => setFilter('done')}>Done</button>
        </div>
      </div>

      {/* Table */}
      <div className="ntd-table-wrap">
        {/* Column headers */}
        <div className="ntd-header-row">
          <div className="ntd-col-check" />
          <div className="ntd-col-task">Task</div>
          <div className="ntd-col-area">Area</div>
          <div className="ntd-col-effort">Effort</div>
          <div className="ntd-col-due">Due</div>
          <div className="ntd-col-notes">Notes</div>
          <div className="ntd-col-del" />
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="ntd-empty">
            {filter === 'done'   ? '🎉 Nothing completed yet'
             : filter === 'active' ? '🎊 All tasks are done!'
             : 'No tasks yet — click "+ New task" below'}
          </div>
        ) : filtered.map(todo => (
          <div key={todo.id} className={`ntd-row ${todo.done ? 'ntd-row-done' : ''}`}>
            {/* Checkbox */}
            <div className="ntd-col-check" style={{ position: 'relative' }}>
              {sparkleId === todo.id && <div className="sparkle-overlay">✨</div>}
              <button
                className={`todo-checkbox ${todo.done ? 'checked' : ''}`}
                style={{ width: 18, height: 18 }}
                onClick={() => toggleDone(todo.id)}
                title={todo.done ? 'Mark undone' : 'Mark done'}
              />
            </div>

            {/* Task */}
            <div className="ntd-col-task">
              <EditCell
                todo={todo} field="task" type="text" placeholder="Task name…"
                isEditing={editId === todo.id && editField === 'task'}
                onUpdate={(f, v) => updateTodo(todo.id, f, v)}
                onStartEdit={() => startEdit(todo.id, 'task')}
                onStopEdit={stopEdit}
              />
            </div>

            {/* Area */}
            <div className="ntd-col-area">
              <EditCell
                todo={todo} field="area" options={AREAS}
                isEditing={editId === todo.id && editField === 'area'}
                onUpdate={(f, v) => updateTodo(todo.id, f, v)}
                onStartEdit={() => startEdit(todo.id, 'area')}
                onStopEdit={stopEdit}
              />
            </div>

            {/* Effort */}
            <div className="ntd-col-effort">
              <EditCell
                todo={todo} field="effort" options={EFFORTS}
                isEditing={editId === todo.id && editField === 'effort'}
                onUpdate={(f, v) => updateTodo(todo.id, f, v)}
                onStartEdit={() => startEdit(todo.id, 'effort')}
                onStopEdit={stopEdit}
              />
            </div>

            {/* Due date */}
            <div className="ntd-col-due">
              <EditCell
                todo={todo} field="dueDate" type="date"
                isEditing={editId === todo.id && editField === 'dueDate'}
                onUpdate={(f, v) => updateTodo(todo.id, f, v)}
                onStartEdit={() => startEdit(todo.id, 'dueDate')}
                onStopEdit={stopEdit}
              />
            </div>

            {/* Notes */}
            <div className="ntd-col-notes">
              <EditCell
                todo={todo} field="notes" type="text" placeholder="Add a note…"
                isEditing={editId === todo.id && editField === 'notes'}
                onUpdate={(f, v) => updateTodo(todo.id, f, v)}
                onStartEdit={() => startEdit(todo.id, 'notes')}
                onStopEdit={stopEdit}
              />
            </div>

            {/* Delete */}
            <div className="ntd-col-del">
              <button className="todo-delete ntd-del-btn" onClick={() => deleteTodo(todo.id)} title="Delete">×</button>
            </div>
          </div>
        ))}

        {/* + New task row */}
        <div className="ntd-add-row" onClick={addTodo}>
          <span>+ New task</span>
        </div>
      </div>
    </div>
  )
}
