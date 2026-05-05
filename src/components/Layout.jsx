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
      { id: 'analytics',       label: 'Analytics',         sub: 'IG & TikTok data',    icon: '📊', iconClass: 'nav-icon-analytics'       },
      { id: 'intelligence',    label: 'AI Intelligence',   sub: 'Claude insights',      icon: '🤖', iconClass: 'nav-icon-intelligence'    },
      { id: 'contentStrategy', label: 'Content Strategy',  sub: 'Weekly plan & goals',  icon: '🧭', iconClass: 'nav-icon-strategy'        },
    ],
  },
]

// Sync status indicator shown in the sidebar footer
function SyncBadge({ sync }) {
  const [showDetails, setShowDetails] = useState(false)
  if (!sync) return null
  const { status, lastSynced, configured, lastError } = sync

  // Env vars missing on the server — diagnostic message, not an error
  if (status === 'unconfigured' || (!configured && status !== 'error')) {
    return (
      <div style={{ textAlign: 'center', padding: '0 4px' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--lavender)', fontWeight: 600 }}>
          ⚙ Sync not configured
        </p>
        <p style={{ fontSize: '0.62rem', color: 'var(--text-light)', marginTop: 2, lineHeight: 1.4 }}>
          Check Vercel env vars
        </p>
      </div>
    )
  }

  const dot = {
    idle:    { color: 'var(--text-light)', label: '☁ Sync ready' },
    syncing: { color: 'var(--lavender)',   label: '↻ Syncing…' },
    synced:  { color: 'var(--sage)',       label: '✓ Synced' },
    error:   { color: 'var(--priority-high)', label: '⚠ Sync error' },
  }[status] || { color: 'var(--text-light)', label: '☁ Sync' }

  const ago = lastSynced
    ? (() => {
        const s = Math.round((Date.now() - lastSynced) / 1000)
        if (s < 5)  return 'just now'
        if (s < 60) return `${s}s ago`
        return `${Math.round(s/60)}m ago`
      })()
    : null

  const canExpand = status === 'error' && lastError

  return (
    <div style={{ textAlign: 'center' }}>
      <button
        type="button"
        onClick={() => canExpand && setShowDetails(s => !s)}
        disabled={!canExpand}
        title={canExpand ? 'Click for details' : ''}
        style={{
          background:  'none',
          border:      'none',
          padding:     0,
          cursor:      canExpand ? 'pointer' : 'default',
          fontSize:    '0.68rem',
          color:       dot.color,
          fontWeight:  600,
          fontFamily:  'inherit',
          textDecoration: canExpand ? 'underline dotted' : 'none',
          textUnderlineOffset: 3,
        }}
      >
        {dot.label}
      </button>
      {ago && status !== 'error' && (
        <p style={{ fontSize: '0.62rem', color: 'var(--text-light)', marginTop: 1 }}>Last sync: {ago}</p>
      )}
      {canExpand && showDetails && (
        <div
          style={{
            marginTop:    8,
            padding:      '8px 10px',
            background:   '#FFE8F2',
            border:       '1px solid #F8CECE',
            borderRadius: 'var(--r-md)',
            textAlign:    'left',
            fontSize:     '0.62rem',
            color:        'var(--text)',
            lineHeight:   1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: '#B83060', marginBottom: 4 }}>
            {lastError.operation === 'save' ? 'Save failed' : 'Load failed'}
            {lastError.status ? ` · ${lastError.status}` : ''}
          </div>
          <div style={{ wordBreak: 'break-word' }}>{lastError.message}</div>
          <div style={{ marginTop: 6, fontSize: '0.58rem', color: 'var(--text-light)' }}>
            {lastError.status === 401 && 'Check GITHUB_TOKEN — token rejected.'}
            {lastError.status === 404 && 'Check GITHUB_GIST_ID — gist not found.'}
            {lastError.status === 403 && 'Token missing "gist" scope.'}
            {!lastError.status      && 'Network error — check connection.'}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout({ activeSection, setActiveSection, children, sync }) {
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
        <SyncBadge sync={sync} />
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
