import { useMemo } from 'react'

const PILLARS = ['Fashion', 'Beauty', 'ADHD', 'María Swim']
const PILLAR_COLORS = {
  Fashion: '#F0AEC4', Beauty: '#FFCFA8', ADHD: '#C4AAED', 'María Swim': '#9ED8C6',
}
const TARGET_PCT = { Fashion: 35, Beauty: 30, ADHD: 20, 'María Swim': 15 }
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function PillarBalance({ weekData }) {
  const { counts, total, percents, warnings } = useMemo(() => {
    const counts = { Fashion: 0, Beauty: 0, ADHD: 0, 'María Swim': 0 }
    for (const day of DAYS) {
      const dayData = weekData?.[day] || {}
      for (const cell of Object.values(dayData)) {
        if (cell?.pillar && counts[cell.pillar] !== undefined) counts[cell.pillar]++
      }
    }
    const total    = Object.values(counts).reduce((a, b) => a + b, 0)
    const percents = {}
    for (const p of PILLARS) {
      percents[p] = total > 0 ? Math.round((counts[p] / total) * 100) : 0
    }
    const warnings = PILLARS.filter(p => total >= 4 && percents[p] < 10 && TARGET_PCT[p] >= 15)
    return { counts, total, percents, warnings }
  }, [weekData])

  if (total === 0) return null

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-card)', padding: '14px 20px', marginBottom: 16,
      boxShadow: 'var(--shadow-xs)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          This Week's Pillar Balance
        </span>
        <span style={{ fontSize: '0.71rem', color: 'var(--text-light)' }}>
          {total} posts planned
        </span>
      </div>

      {/* Stacked bar */}
      <div style={{
        display: 'flex', height: 10, borderRadius: 20, overflow: 'hidden',
        background: 'var(--border)', marginBottom: 10,
      }}>
        {PILLARS.map(p => percents[p] > 0 ? (
          <div
            key={p}
            style={{
              width: `${percents[p]}%`, background: PILLAR_COLORS[p],
              transition: 'width 0.5s ease',
            }}
            title={`${p}: ${percents[p]}%`}
          />
        ) : null)}
      </div>

      {/* Percentage labels */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {PILLARS.map(p => (
          <span key={p} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: '0.75rem',
            color: percents[p] === 0 ? 'var(--text-light)' : 'var(--text-muted)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: PILLAR_COLORS[p],
              flexShrink: 0, opacity: percents[p] === 0 ? 0.35 : 1,
              display: 'inline-block',
            }} />
            {p} <strong style={{ color: percents[p] === 0 ? 'var(--text-light)' : 'var(--text)' }}>
              {percents[p]}%
            </strong>
          </span>
        ))}
      </div>

      {/* Soft warnings */}
      {warnings.map(p => (
        <div key={p} style={{
          marginTop: 8, fontSize: '0.73rem', color: 'var(--text-muted)', fontStyle: 'italic',
        }}>
          💭 Light on {p} this week — consider adding a {p.replace('ADHD', 'Real Life/ADHD')} post
        </div>
      ))}
    </div>
  )
}
