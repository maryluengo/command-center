import { useState } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'

const PRIORITIES = ['High', 'Medium', 'Low']

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function TodoList({ storageKey }) {
  const [todos, setTodos] = useLocalStorage(`todos-${storageKey}`, [])
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [sparkleId, setSparkleId] = useState(null)
  const [filter, setFilter] = useState('All')

  const addTodo = () => {
    if (!text.trim()) return
    setTodos(prev => [
      { id: genId(), text: text.trim(), priority, completed: false, createdAt: Date.now() },
      ...prev,
    ])
    setText('')
  }

  const toggleTodo = (id) => {
    const todo = todos.find(t => t.id === id)
    if (!todo.completed) {
      setSparkleId(id)
      setTimeout(() => setSparkleId(null), 700)
    }
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const filtered = filter === 'All'
    ? todos
    : filter === 'Active'
      ? todos.filter(t => !t.completed)
      : todos.filter(t => t.completed)

  const done   = todos.filter(t => t.completed).length
  const total  = todos.length
  const pct    = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="todo-container">
      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-md">
          <div className="flex items-center justify-between mb-sm">
            <span className="text-sm text-muted">{done}/{total} done</span>
            <span className="text-sm text-muted">{pct}%</span>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-full)', height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 'var(--r-full)', background: 'linear-gradient(90deg, var(--pink) 0%, var(--lavender) 100%)', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="todo-add-form">
        <input
          className="form-input"
          placeholder="Add a task..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
        />
        <select
          className="form-select"
          value={priority}
          onChange={e => setPriority(e.target.value)}
          style={{ width: 'auto' }}
        >
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={addTodo}>+ Add</button>
      </div>

      {/* Filter tabs */}
      {total > 0 && (
        <div className="flex gap-xs mb-md" style={{ flexWrap: 'wrap' }}>
          {['All', 'Active', 'Done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="btn btn-ghost btn-xs"
              style={filter === f ? { background: 'var(--lavender-light)', borderColor: 'var(--lavender)', color: 'var(--text)' } : {}}
            >
              {f}
              {f === 'All' && total > 0 && <span style={{ marginLeft: 4, background: 'var(--border)', borderRadius: 'var(--r-full)', padding: '0 6px', fontSize: '0.68rem' }}>{total}</span>}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="todo-list">
        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-icon">{filter === 'Done' ? '🎉' : '✅'}</div>
            <h3>{filter === 'Done' ? 'Nothing completed yet' : 'No tasks here'}</h3>
            <p>{filter === 'All' ? 'Add your first task above!' : filter === 'Active' ? 'All tasks are done!' : 'Check something off!'}</p>
          </div>
        )}

        {filtered.map(todo => (
          <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
            {/* Sparkle on check */}
            {sparkleId === todo.id && (
              <div className="sparkle-overlay">✨</div>
            )}

            <button
              className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
              onClick={() => toggleTodo(todo.id)}
              title={todo.completed ? 'Mark undone' : 'Mark done'}
            />

            <span className={`priority-dot ${todo.priority.toLowerCase()}`} title={todo.priority} />

            <span className="todo-text">{todo.text}</span>

            <span className={`priority-badge ${todo.priority.toLowerCase()}`}>
              {todo.priority}
            </span>

            <button
              className="todo-delete"
              onClick={() => deleteTodo(todo.id)}
              title="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
