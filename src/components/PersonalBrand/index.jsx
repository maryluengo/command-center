import { useState, useEffect } from 'react'
import TodoList from '../common/TodoList'
import ContentIdeas from '../common/ContentIdeas'
import ContentCalendar from '../common/ContentCalendar'
import EditorialPlanner from './EditorialPlanner'

export default function PersonalBrand() {
  const [tab, setTab] = useState('todo')

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

      {tab === 'editorial' && <EditorialPlanner />}
    </div>
  )
}
