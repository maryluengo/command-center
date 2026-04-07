import { useState, useEffect } from 'react'

// ─────────────── Quick context buttons ────────────────────────────────────────

const QUICK_CONTEXTS = [
  { label: '✈️ Traveling',          key: 'traveling'       },
  { label: '🚀 Launching something', key: 'launching'       },
  { label: '📅 Multiple events',     key: 'multiple-events' },
  { label: '🪫 Low energy week',     key: 'low-energy'      },
  { label: '🤒 Sick day',            key: 'sick'            },
  { label: '🏖 Vacation mode',       key: 'vacation'        },
  { label: '💼 Heavy client work',   key: 'client-work'     },
  { label: '🎉 Big life moment',     key: 'big-moment'      },
  { label: '📸 Have a photoshoot',   key: 'photoshoot'      },
  { label: '🌙 Slow content week',   key: 'slow-week'       },
]

// ─────────────── Component ────────────────────────────────────────────────────

export default function WeekContext({ weekKey, contextData, onApplyContext, onClearContext }) {
  const [activeContexts, setActiveContexts] = useState([])
  const [contextNote,    setContextNote]    = useState('')
  const [isExpanded,     setIsExpanded]     = useState(false)

  // Sync state from saved contextData when weekKey changes
  useEffect(() => {
    setActiveContexts(contextData?.activeContexts || [])
    setContextNote(contextData?.contextNote || '')
  }, [weekKey, contextData])

  const toggleContext = (key) => {
    setActiveContexts(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const hasInput = activeContexts.length > 0 || contextNote.trim().length > 0
  const hasApplied = !!(contextData?.activeContexts?.length || contextData?.contextNote?.trim())

  const handleApply = () => {
    onApplyContext({ activeContexts, contextNote: contextNote.trim() })
    setIsExpanded(false)
  }

  const handleClear = () => {
    setActiveContexts([])
    setContextNote('')
    onClearContext()
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      {/* Header row — always visible */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12 }}
        onClick={() => setIsExpanded(e => !e)}
      >
        <div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            ✨ What's going on this week?
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3, marginBottom: 0 }}>
            Tell the AI your context — it'll tailor your schedule around it
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {hasApplied && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 600,
              background: '#EAE0FC', color: '#5B3FA0',
              borderRadius: 10, padding: '3px 10px',
              border: '1px solid #C4AAED',
            }}>
              ✓ Context active
            </span>
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
            ▾
          </span>
        </div>
      </div>

      {/* Applied context summary (shown when collapsed + has context) */}
      {!isExpanded && hasApplied && (
        <div style={{
          marginTop: 10,
          display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {(contextData.activeContexts || []).map(key => {
            const ctx = QUICK_CONTEXTS.find(c => c.key === key)
            return ctx ? (
              <span key={key} style={{
                fontSize: '0.72rem', background: '#EAE0FC', color: '#5B3FA0',
                borderRadius: 20, padding: '3px 10px', border: '1px solid #C4AAED',
                fontWeight: 600,
              }}>
                {ctx.label}
              </span>
            ) : null
          })}
          {contextData.contextNote && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              "{contextData.contextNote.length > 60 ? contextData.contextNote.slice(0, 60) + '…' : contextData.contextNote}"
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); handleClear() }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', color: 'var(--text-light)', textDecoration: 'underline',
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Expanded panel */}
      {isExpanded && (
        <div style={{ marginTop: 16 }}>
          {/* Quick context pills */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Quick tags
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_CONTEXTS.map(({ label, key }) => {
                const isActive = activeContexts.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleContext(key)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? '#EAE0FC' : 'var(--surface-2)',
                      border: isActive ? '1.5px solid #C4AAED' : '1.5px solid var(--border)',
                      color: isActive ? '#5B3FA0' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Free-text note */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Or type anything specific…
            </div>
            <textarea
              value={contextNote}
              onChange={e => setContextNote(e.target.value)}
              placeholder="e.g. I'm in NYC for a brand trip this week, lots of outfit opportunities but no access to my studio setup…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontSize: '0.84rem', color: 'var(--text)',
                background: 'var(--surface)', border: '1.5px solid var(--border)',
                borderRadius: 10, padding: '10px 14px', outline: 'none',
                resize: 'vertical', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--lavender)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleApply}
              disabled={!hasInput}
              style={{
                padding: '9px 20px', borderRadius: 12, fontSize: '0.84rem', fontWeight: 700,
                background: hasInput ? 'var(--peach)' : 'var(--surface-2)',
                color: hasInput ? 'var(--text)' : 'var(--text-light)',
                border: hasInput ? '1.5px solid var(--peach)' : '1.5px solid var(--border)',
                cursor: hasInput ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              ✨ Apply context &amp; regenerate
            </button>
            {hasApplied && (
              <button
                onClick={handleClear}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.78rem', color: 'var(--text-light)', textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Clear context
              </button>
            )}
            <span style={{ fontSize: '0.74rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
              Will regenerate Weekly Schedule + Stories for this week
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
