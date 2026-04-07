import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import PrepThisWeek           from './PrepThisWeek'
import PillarBalance          from './PillarBalance'
import WeekContext            from './WeekContext'
import WeeklySchedule, { DAYS } from './WeeklySchedule'
import StoriesWeek            from './StoriesWeek'
import CalendarEvents         from './CalendarEvents'

// Context key → human label map (must match WeekContext.jsx QUICK_CONTEXTS keys)
const CTX_LABELS = {
  'traveling':       'Traveling',
  'launching':       'Launching something',
  'multiple-events': 'Multiple events',
  'low-energy':      'Low energy week',
  'sick':            'Sick day',
  'vacation':        'Vacation mode',
  'client-work':     'Heavy client work',
  'big-moment':      'Big life moment',
  'photoshoot':      'Photoshoot',
  'slow-week':       'Slow content week',
}

const APPLY_PHASES = ['Adapting your week to your context…', 'Generating posts…', 'Generating stories…']

function genId() { return `sf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` }

// ─────────────── Helpers ─────────────────────────────────────────────────────

function getWeekMonday(date) {
  const d = new Date(date), day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0, 0, 0, 0); return d
}
function dateFmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtLastUpdated(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─────────────── Main Component ──────────────────────────────────────────────

export default function ContentStrategy() {
  const [data, setData] = useLocalStorage('commandCenter_contentStrategy', { weeks: {} })

  // Shared week key — used by Weekly Schedule, Stories Week, and Add-to-Schedule
  const [weekKey, setWeekKey] = useState(() => dateFmt(getWeekMonday(new Date())))

  // Cross-section communication
  const [highlightCell,    setHighlightCell]    = useState(null)  // { day, platformKey }
  const [highlightEventId, setHighlightEventId] = useState(null)  // string event id
  const [addToastMsg,      setAddToastMsg]      = useState(null)  // string

  // WeekContext — combined sequential generation
  const [contextApplying, setContextApplying] = useState(false)
  const [contextPhase,    setContextPhase]    = useState(0)

  // Section refs for scroll-to
  const weeklyScheduleRef  = useRef(null)
  const calendarEventsRef  = useRef(null)

  const todayMonday  = dateFmt(getWeekMonday(new Date()))
  const lastUpdated  = fmtLastUpdated(data.lastUpdated)
  const weekData     = data.weeks?.[weekKey] || {}

  // Auto-clear highlight cell after 4s
  useEffect(() => {
    if (!highlightCell) return
    const t = setTimeout(() => setHighlightCell(null), 4000)
    return () => clearTimeout(t)
  }, [highlightCell])

  // Auto-dismiss add-toast after 5s
  useEffect(() => {
    if (!addToastMsg) return
    const t = setTimeout(() => setAddToastMsg(null), 5000)
    return () => clearTimeout(t)
  }, [addToastMsg])

  // ── "Jump to event" from PrepThisWeek ───────────────────────────────────

  const handleJumpToEvent = (eventId) => {
    setHighlightEventId(eventId)
    setTimeout(() => {
      calendarEventsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    // Auto-clear after 6s
    setTimeout(() => setHighlightEventId(null), 6000)
  }

  // ── Week context (apply → save + sequential AI regen) ───────────────────

  const handleApplyContext = async ({ activeContexts, contextNote }) => {
    // 1. Save context to localStorage immediately
    setData(prev => ({
      ...prev,
      weekContext: { ...(prev.weekContext || {}), [weekKey]: { activeContexts, contextNote } },
    }))

    // 2. Build userContext string
    const parts = []
    if (activeContexts?.length) {
      parts.push(activeContexts.map(k => CTX_LABELS[k] || k).join(', '))
    }
    if (contextNote?.trim()) parts.push(contextNote.trim())
    const userContext = parts.length ? parts.join('. ') : null
    if (!userContext) return

    setContextApplying(true)
    setContextPhase(0)

    try {
      // 3a. Generate weekly posts schedule
      setContextPhase(1)
      const postsRes = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'strategy', subMode: 'weeklySchedule',
          weekContext: { weekStartDate: weekKey },
          userContext,
        }),
      })
      if (postsRes.ok) {
        const postsJson = await postsRes.json()
        if (postsJson.data) {
          setData(prev => {
            const merged = { ...(prev.weeks?.[weekKey] || {}) }
            for (const day of Object.keys(postsJson.data)) {
              if (!postsJson.data[day]) continue
              merged[day] = { ...(merged[day] || {}) }
              for (const platKey of Object.keys(postsJson.data[day])) {
                if (merged[day][platKey]?.manuallyEdited) continue
                if (postsJson.data[day][platKey]) {
                  merged[day][platKey] = { ...postsJson.data[day][platKey], aiGenerated: true }
                }
              }
            }
            return {
              ...prev,
              lastUpdated: new Date().toISOString(),
              weeks: { ...prev.weeks, [weekKey]: merged },
            }
          })
        }
      }

      // 3b. Generate stories week
      setContextPhase(2)
      const storiesRes = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'strategy', subMode: 'storiesWeek',
          weekContext: { weekStartDate: weekKey },
          userContext,
        }),
      })
      if (storiesRes.ok) {
        const storiesJson = await storiesRes.json()
        if (storiesJson.data) {
          const withIds = {}
          for (const day of Object.keys(storiesJson.data)) {
            if (!storiesJson.data[day]) continue
            withIds[day] = {
              ...storiesJson.data[day],
              frames: (storiesJson.data[day].frames || []).map(f => ({ ...f, id: f.id || genId() })),
            }
          }
          setData(prev => ({
            ...prev,
            storiesWeek: {
              ...(prev.storiesWeek || {}),
              weeks: { ...(prev.storiesWeek?.weeks || {}), [weekKey]: withIds },
            },
          }))
        }
      }

      setAddToastMsg('Week adapted to your context ✨')
    } catch (err) {
      console.error('[handleApplyContext]', err)
      setAddToastMsg('Something went wrong — try again')
    } finally {
      setContextApplying(false)
      setContextPhase(0)
    }
  }

  const handleClearContext = () => {
    setData(prev => {
      const wc = { ...(prev.weekContext || {}) }
      delete wc[weekKey]
      return { ...prev, weekContext: wc }
    })
  }

  // ── "Add to weekly schedule" from CalendarEvents ─────────────────────────

  const handleAddToSchedule = ({ day, platformKey, cellData }) => {
    const existing = data.weeks?.[weekKey]?.[day]?.[platformKey]
    if (existing?.title) {
      const ok = confirm(`"${existing.title}" is already in ${day} ${platformKey}. Replace it?`)
      if (!ok) return
    }

    // Navigate to current week
    setWeekKey(todayMonday)

    setData(prev => ({
      ...prev,
      lastUpdated: new Date().toISOString(),
      weeks: {
        ...prev.weeks,
        [todayMonday]: {
          ...(prev.weeks?.[todayMonday] || {}),
          [day]: {
            ...(prev.weeks?.[todayMonday]?.[day] || {}),
            [platformKey]: { ...cellData, manuallyEdited: true },
          },
        },
      },
    }))

    const dayLabel  = day.charAt(0).toUpperCase() + day.slice(1)
    const platLabel = platformKey === 'instagramFeed'    ? 'IG Feed'
                    : platformKey === 'instagramReel'    ? 'IG Reel'
                    : platformKey === 'instagramStories' ? 'IG Stories'
                    : platformKey === 'youtubeShorts'    ? 'YT Shorts'
                    : platformKey.charAt(0).toUpperCase() + platformKey.slice(1)

    setAddToastMsg(`Added to ${dayLabel} · ${platLabel} ✨`)
    setHighlightCell({ day, platformKey })

    setTimeout(() => {
      weeklyScheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 className="section-title">Content Strategy</h1>
          <p className="section-subtitle">Your weekly plan and content calendar</p>
        </div>
        {lastUpdated && (
          <span style={{ fontSize: '0.74rem', color: 'var(--text-light)', paddingBottom: 4 }}>
            Last updated: {lastUpdated}
          </span>
        )}
      </div>

      {/* Thing 1 — Prep This Week */}
      <PrepThisWeek
        calendarEventsData={data.calendarEvents}
        onJumpToEvent={handleJumpToEvent}
      />

      {/* Thing 2 — Pillar Balance */}
      <PillarBalance weekData={weekData} />

      {/* Week Context — AI context input (positions between Pillar Balance and Weekly Schedule) */}
      <WeekContext
        weekKey={weekKey}
        contextData={data.weekContext?.[weekKey] || null}
        onApplyContext={handleApplyContext}
        onClearContext={handleClearContext}
        isApplying={contextApplying}
        applyPhase={contextPhase}
      />

      {/* Weekly Posting Schedule */}
      <WeeklySchedule
        data={data}
        setData={setData}
        weekKey={weekKey}
        setWeekKey={setWeekKey}
        highlightCell={highlightCell}
        sectionRef={weeklyScheduleRef}
        weekContextData={data.weekContext?.[weekKey] || null}
      />

      {/* Stories Week */}
      <StoriesWeek
        data={data}
        setData={setData}
        weekKey={weekKey}
      />

      {/* Thing 5 — Content Calendar Events (with wired "Add to schedule") */}
      <div ref={calendarEventsRef}>
        <CalendarEvents
          data={data}
          setData={setData}
          weekKey={weekKey}
          currentWeekData={weekData}
          highlightEventId={highlightEventId}
          onAddToSchedule={handleAddToSchedule}
        />
      </div>

      {/* Add-to-schedule toast */}
      {addToastMsg && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--surface)',
          borderRadius: 24, padding: '10px 22px',
          fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          zIndex: 9999, animation: 'fadeInUp 0.25s ease',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span>{addToastMsg}</span>
          <button
            onClick={() => {
              setAddToastMsg(null)
              weeklyScheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              color: 'var(--surface)', borderRadius: 12, padding: '3px 10px',
              fontSize: '0.76rem', cursor: 'pointer',
            }}
          >
            View schedule ↑
          </button>
        </div>
      )}
    </div>
  )
}
