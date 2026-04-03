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

const BOTTOM_NAV = [
  { id: 'schedule',     icon: '📅', label: 'Schedule'  },
  { id: 'brand',        icon: '✨', label: 'Brand'     },
  { id: 'swim',         icon: '🌊', label: 'Swim'      },
  { id: 'agency',       icon: '💼', label: 'Agency'    },
  { id: 'analytics',    icon: '📊', label: 'Analytics' },
  { id: 'intelligence', icon: '🤖', label: 'AI'        },
]

export default function Layout({ activeSection, setActiveSection, children }) {
  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
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
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {children}
      </main>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          {BOTTOM_NAV.map(item => (
            <button
              key={item.id}
              className={`bottom-nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
