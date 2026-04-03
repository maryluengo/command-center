import { useState } from 'react'
import TodoList from '../common/TodoList'
import ContentIdeas from '../common/ContentIdeas'
import ContentCalendar from '../common/ContentCalendar'

export default function PersonalBrand() {
  const [tab, setTab] = useState('todo')

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">@maryluengog</h1>
          <p className="section-subtitle">Personal brand & content planning</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'todo'     ? 'active' : ''}`} onClick={() => setTab('todo')}>✅ To-Do</button>
        <button className={`tab ${tab === 'ideas'    ? 'active' : ''}`} onClick={() => setTab('ideas')}>💡 Content Ideas</button>
        <button className={`tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>📆 Content Calendar</button>
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
          <ContentIdeas storageKey="brand" showClient={false} />
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
    </div>
  )
}
