import { useMemo } from 'react'
import { DEFAULT_EVENTS } from '../../data/calendarEvents'

// ─────────────── Constants ────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  Fashion: '#F0AEC4', Beauty: '#FFCFA8', Holiday: '#FFE4A8',
  Awareness: '#C4AAED', Cultural: '#9ED8C6', Miami: '#A8C8EC', Shopping: '#F4B8C8',
}

// ─────────────── Helpers ─────────────────────────────────────────────────────

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getWeekBounds() {
  const today  = new Date()
  const day    = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

function fmtDate(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString('default', { month: 'short', day: 'numeric' })
}

function timeUntilLabel(dateStr) {
  const today  = new Date(); today.setHours(0, 0, 0, 0)
  const event  = parseLocalDate(dateStr)
  const days   = Math.round((event - today) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'happening today!'
  if (days === 1) return '1 day'
  if (days < 14) return `${days} days`
  const weeks = Math.round(days / 7)
  return `${weeks} week${weeks !== 1 ? 's' : ''}`
}

// ─────────────── Main Component ──────────────────────────────────────────────

export default function PrepThisWeek({ calendarEventsData, onJumpToEvent }) {
  const prepEvents = useMemo(() => {
    const cal         = calendarEventsData ?? {}
    const customEvents = cal.customEvents ?? []
    const deletedIds   = cal.deletedIds   ?? []
    const defaults     = DEFAULT_EVENTS.filter(e => !deletedIds.includes(e.id))
    const allEvents    = [...defaults, ...customEvents].sort((a, b) => a.date.localeCompare(b.date))

    const { monday, sunday } = getWeekBounds()
    return allEvents.filter(event => {
      const eventDate = parseLocalDate(event.date)
      const leadWeeks = event.leadTimeWeeks ?? 2
      const prepDate  = new Date(eventDate)
      prepDate.setDate(prepDate.getDate() - leadWeeks * 7)
      prepDate.setHours(0, 0, 0, 0)
      return prepDate >= monday && prepDate <= sunday
    })
  }, [calendarEventsData])

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: prepEvents.length > 0 ? 16 : 0 }}>
        <h2 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px',
        }}>
          🔥 Prep This Week
        </h2>
        <p style={{ fontSize: '0.79rem', color: 'var(--text-muted)', margin: 0 }}>
          Events you should start creating content for now
        </p>
      </div>

      {prepEvents.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 0 4px', color: 'var(--text-muted)', fontSize: '0.875rem',
        }}>
          <span style={{ fontSize: '1.4rem' }}>✨</span>
          <span>No big events to prep this week — focus on your regular content rhythm.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {prepEvents.map(event => {
            const catColor  = CATEGORY_COLORS[event.category] || '#E8E0F8'
            const timeLeft  = timeUntilLabel(event.date)
            const leadWeeks = event.leadTimeWeeks ?? 2
            return (
              <div
                key={event.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  padding: '12px 16px', borderRadius: 12,
                  background: catColor + '18',
                  border: `1.5px solid ${catColor}66`,
                  boxShadow: `0 2px 10px ${catColor}22`,
                }}
              >
                {/* Priority dot */}
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: catColor, flexShrink: 0,
                  boxShadow: `0 0 0 3px ${catColor}44`,
                }} />

                {/* Event info */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 2 }}>
                    {event.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {fmtDate(event.date)} · Start prepping now — it's in <strong>{timeLeft}</strong>
                  </div>
                </div>

                {/* Category badge */}
                <span style={{
                  background: catColor + '44', color: 'var(--text)',
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: '0.69rem', fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {event.category}
                </span>

                {/* Lead time */}
                <span style={{
                  background: '#FFF3CC', color: '#8A6800',
                  border: '1px solid #FFE47A',
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: '0.67rem', fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {leadWeeks}w lead time
                </span>

                {/* Jump button */}
                <button
                  onClick={() => onJumpToEvent(event.id)}
                  style={{
                    background: catColor + '55', color: 'var(--text)',
                    border: `1px solid ${catColor}AA`,
                    borderRadius: 20, padding: '6px 14px',
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = catColor + '99' }}
                  onMouseLeave={e => { e.currentTarget.style.background = catColor + '55' }}
                >
                  Jump to event ↓
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
