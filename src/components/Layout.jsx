import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  {
    group: 'Personal',
    items: [
      { id: 'schedule',     label: 'My Schedule',         sub: 'Personal Life',    icon: '📅', iconClass: 'nav-icon-schedule' },
      { id: 'brand',        label: '@maryluengog',        sub: 'Personal Brand',   icon: '✨', iconClass: 'nav-icon-brand'    },
      { id: 'swim',         label: 'María Swim',          sub: 'Business',         icon: '🌊', iconClass: 'nav-icon-swim'     },
      { id: 'agency',       label: 'Social Media Agency', sub: 'Agency',           icon: '💼', iconClass: 'nav-icon-agency'   },
    ],
  },
  {
    group: 'Insights',
    items: [
      { id: 'analytics',    label: 'Analytics',           sub: 'IG & TikTok data', icon: '📊', iconClass: 'nav-icon-analytics'    },
      { id: 'intelligence', label: 'AI Intelligence',     sub: 'Claude insights',  icon: '🤖', iconClass: 'nav-icon-intelligence' },
    ],
  },
]

export default function Layout({ activeSection, setActiveSection, children }) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close drawer when route changes
  useEffect(() => { setMenuOpen(false) }, [activeSection])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const navContent = (
    <>
      <div className="sidebar-logo">
        <h1>Command Center</h1>
        <p>Your personal dashboard</p>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(group => (
          <div key={group.group}>
            <div className="nav-section-label">{group.group}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <span className={`nav-icon ${item.iconClass}`}>{item.icon}</span>
                <span>
                  <span style={{ display: 'block' }}>{item.label}</span>
                  <span style={{ display: 'block', fontSize: '0.67rem', color: 'var(--text-light)', marginTop: 1 }}>{item.sub}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-light)', textAlign: 'center' }}>All data saved locally ✦</p>
      </div>
    </>
  )

  return (
    <div className="app">

      {/* ── Mobile top header ── */}
      <header className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Open menu"
        >
          <span className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
            <span /><span /><span />
          </span>
        </button>
        <span className="mobile-header-title">Command Center</span>
        <span style={{ width: 44 }} /> {/* spacer to center title */}
      </header>

      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        {navContent}
      </aside>

      {/* ── Mobile sidebar drawer ── */}
      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />
      )}
      <aside className={`sidebar-drawer ${menuOpen ? 'open' : ''}`}>
        <button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button>
        {navContent}
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        {children}
      </main>

    </div>
  )
}
