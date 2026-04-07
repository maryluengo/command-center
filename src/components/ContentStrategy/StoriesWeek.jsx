import { useState, useEffect, useRef, useMemo } from 'react'
import Modal from '../common/Modal'

// ─────────────── Constants ────────────────────────────────────────────────────

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_MOODS = {
  monday:    'fresh start energy',
  tuesday:   'wellness vibes',
  wednesday: 'shopmy day',
  thursday:  'connection day',
  friday:    'weekend incoming',
  saturday:  'wishlist drop',
  sunday:    'plan the week',
}

const TAG_STYLES = {
  POLL:     { bg: '#FFE8D0', color: '#9A5000', border: '#FFCFA8' },
  MUSIC:    { bg: '#F9D8EA', color: '#8A1F5A', border: '#F0AEC4' },
  QUESTION: { bg: '#EAE0FC', color: '#5B3FA0', border: '#C4AAED' },
  LINK:     { bg: '#D8F0E8', color: '#1A6A4A', border: '#9ED8C6' },
  SLIDER:   { bg: '#D4EBF8', color: '#1A5080', border: '#A8C8EC' },
}
const TAG_OPTIONS = ['POLL', 'MUSIC', 'QUESTION', 'LINK', 'SLIDER']

const BADGE_STYLES = {
  'OUTFIT DAY':     { bg: '#FFE8D0', color: '#9A5000' },
  'WELLNESS DAY':   { bg: '#D8F0E8', color: '#1A6A4A' },
  'SHOPMY DAY':     { bg: '#F9D8EA', color: '#8A1F5A' },
  'QUESTION DAY':   { bg: '#EAE0FC', color: '#5B3FA0' },
  'COLLECTION DROP':{ bg: '#F0AEC4', color: '#7A2050' },
  'SERIES DAY':     { bg: '#FFCFA8', color: '#7A4A1A' },
  'RESET DAY':      { bg: '#D4EBF8', color: '#1A5080' },
  'STORIES DAY':    { bg: 'var(--surface-2)', color: 'var(--text-muted)' },
}

const AI_PHASES = ['Pulling your analytics…', 'Writing your Stories rhythm…', 'Adding frame details…']

// ─────────────── Helpers ─────────────────────────────────────────────────────

function getWeekMonday(date) {
  const d = new Date(date), day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0, 0, 0, 0); return d
}
function dateFmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function addDays(dateStr, n) { const d = new Date(dateStr); d.setDate(d.getDate()+n); return d }
function fmtMonthDay(d) { return d.toLocaleDateString('default', { month: 'short', day: 'numeric' }) }

function getTimeOfDay(timeStr) {
  if (!timeStr) return ''
  const match = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
  if (!match) return ''
  let h = parseInt(match[1]); const period = match[3].toUpperCase()
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  if (h < 12) return 'MORNING'
  if (h < 17) return 'AFTERNOON'
  return 'EVENING'
}

function genId() { return `sf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` }

// ─────────────── Preloaded starter content ───────────────────────────────────

function makeStarterStoriesWeek() {
  return {
    monday: {
      dayMood: DAY_MOODS.monday, dayBadge: 'OUTFIT DAY',
      frames: [
        {
          id: genId(), time: '8:30 AM', title: 'Outfit poll: ayúdenme a decidir 🥺',
          frameCount: 3,
          frameDetails: [
            'Frame 1: Flat lay of two complete outfits on white bedding — soft morning light, no filter needed',
            'Frame 2: Option A styled on body — full-length mirror selfie, neutral expression',
            'Frame 3: Option B styled on body — same angle + "which one?" poll sticker at the bottom',
          ],
          notes: 'Post before 9 AM for max morning engagement. Screenshot poll results to share at 2 PM.',
          tags: ['POLL'],
        },
        {
          id: genId(), time: '2:00 PM', title: 'Poll results + real-time reaction ✨',
          frameCount: 1,
          frameDetails: [
            'Frame 1: Screenshot of poll results with "you chose…" text + quick mirror selfie in the winning outfit — add a cheeky caption',
          ],
          notes: 'One tap, done. Add something upbeat. People love the continuity.',
          tags: ['MUSIC'],
        },
        {
          id: genId(), time: '8:30 PM', title: 'Book of the night 📚',
          frameCount: 1,
          frameDetails: [
            'Frame 1: Aesthetic flat lay — current read on nightstand or couch, cozy warm lighting, maybe a candle or tea in frame',
          ],
          notes: 'Consistent daily touchpoint. Question sticker: "what are you reading this week?"',
          tags: ['QUESTION'],
        },
      ],
    },
    tuesday: {
      dayMood: DAY_MOODS.tuesday, dayBadge: 'WELLNESS DAY',
      frames: [
        {
          id: genId(), time: '9:00 AM', title: 'Morning gym aesthetic ✨',
          frameCount: 2,
          frameDetails: [
            'Frame 1: Pre-workout selfie in gym fit — good lighting, minimal makeup, hair up, energy is everything',
            'Frame 2: Gym mirror boomerang or walking shot — dynamic movement, candid feel',
          ],
          notes: 'The "I actually showed up" energy is what resonates. Don\'t over-edit.',
          tags: ['MUSIC'],
        },
        {
          id: genId(), time: '1:30 PM', title: 'Post-workout matcha situation ☁️',
          frameCount: 2,
          frameDetails: [
            'Frame 1: Matcha latte close-up — foam art detail, clean light background, soft morning palette',
            'Frame 2: Boomerang taking a sip + question sticker: "post-workout drink of choice? I need to know"',
          ],
          notes: 'This content always lands. Make it cozy, not curated. People relate to the ritual.',
          tags: ['QUESTION', 'MUSIC'],
        },
        {
          id: genId(), time: '8:30 PM', title: 'Book of the night 📚',
          frameCount: 1,
          frameDetails: [
            'Frame 1: Tonight\'s read in a cozy setup — warm light, maybe share a quote from the page you\'re on',
          ],
          notes: 'Low effort, high warmth. Keep it consistent — that\'s the point.',
          tags: ['QUESTION'],
        },
      ],
    },
    wednesday: {
      dayMood: DAY_MOODS.wednesday, dayBadge: 'SHOPMY DAY',
      frames: [
        {
          id: genId(), time: '9:00 AM', title: 'Morning OOTD + slider rating 😏',
          frameCount: 2,
          frameDetails: [
            'Frame 1: Full-length mirror selfie — today\'s OOTD, good natural light, clean background',
            'Frame 2: Close-up of the best detail (shoes, bag, jewelry, the fit) + emoji slider: "rate this look"',
          ],
          notes: 'Tag ShopMy items directly on both frames. Easy tap-through engagement.',
          tags: ['SLIDER', 'LINK'],
        },
        {
          id: genId(), time: '2:00 PM', title: 'ShopMy product drop of the week 🛍️',
          frameCount: 3,
          frameDetails: [
            'Frame 1: Opening slide — "okay I found things and I can\'t keep them to myself" + aesthetic product collage',
            'Frame 2: First 2 picks with lifestyle photo or flat lay, visible price, link sticker in top-right corner',
            'Frame 3: Last 2 picks + closing CTA: "everything is linked in my ShopMy — save this so you don\'t forget"',
          ],
          notes: 'Always show the price on frame. Saves = commission. Remind them explicitly to save the story.',
          tags: ['LINK', 'MUSIC'],
        },
        {
          id: genId(), time: '8:30 PM', title: 'Book of the night 📚',
          frameCount: 1,
          frameDetails: [
            'Frame 1: Cozy reading corner or bed setup — book propped up, warm light, maybe a chamomile tea',
          ],
          notes: 'Short and sweet. Habit content — show up consistently.',
          tags: ['QUESTION'],
        },
      ],
    },
    thursday: {
      dayMood: DAY_MOODS.thursday, dayBadge: 'QUESTION DAY',
      frames: [
        {
          id: genId(), time: '9:00 AM', title: 'OOTD + ask me anything 💬',
          frameCount: 2,
          frameDetails: [
            'Frame 1: Mirror selfie in today\'s outfit — text overlay: "buenos días, pregúntenme lo que quieran" or "good morning, ask me anything"',
            'Frame 2: Question sticker open and waiting — something inviting like "what\'s on your mind this week?"',
          ],
          notes: 'Thursday is the best day for questions — people are reflective mid-week. Engage genuinely.',
          tags: ['QUESTION'],
        },
        {
          id: genId(), time: '2:30 PM', title: 'Real life / ADHD moment 😅',
          frameCount: 2,
          frameDetails: [
            'Frame 1: Relatable scene — messy desk, 12 open tabs, cold coffee — text overlay: "the ADHD experience, episode 47"',
            'Frame 2: Follow-up: "anyway, here\'s what I\'m actually getting done today" — aesthetic to-do list or planner page',
          ],
          notes: 'Be real. This content consistently outperforms polished stuff. It\'s the most "you" thing on your page.',
          tags: ['MUSIC'],
        },
        {
          id: genId(), time: '8:30 PM', title: 'Book of the night 📚',
          frameCount: 1,
          frameDetails: [
            'Frame 1: Bedside aesthetic — book + favorite candle + clean, minimal vibes. Feels like a deep exhale.',
          ],
          notes: 'Maybe share what page you\'re on or if you\'re actually finishing it lol',
          tags: ['QUESTION'],
        },
      ],
    },
    friday: {
      dayMood: DAY_MOODS.friday, dayBadge: 'COLLECTION DROP',
      frames: [
        {
          id: genId(), time: '9:00 AM', title: 'Replying to Thursday\'s questions ✉️',
          frameCount: 2,
          frameDetails: [
            'Frame 1: Screenshot of a meaningful or fun question from yesterday — your answer in text overlay, honest and warm',
            'Frame 2: Second Q&A — maybe something personal about María Swim or your content journey',
          ],
          notes: 'Pick the most engaging or heartfelt ones. Creates beautiful continuity from Thursday.',
          tags: ['QUESTION'],
        },
        {
          id: genId(), time: '4:00 PM', title: 'Weekly ShopMy collection drop 💗',
          frameCount: 4,
          frameDetails: [
            'Frame 1: Cover slide — "this week\'s picks are so good I can\'t" + aesthetic product collage',
            'Frame 2: Fashion picks (1-2 items) — lifestyle photo or flat lay, price visible, link sticker',
            'Frame 3: Beauty or accessories picks — same format, keep the energy moving',
            'Frame 4: Closing slide — "everything is in my ShopMy, tap to save" + strong CTA',
          ],
          notes: 'Friday afternoon = highest story views of the week. This is your ShopMy moment. Add music that fits the vibe.',
          tags: ['LINK', 'MUSIC'],
        },
        {
          id: genId(), time: '8:30 PM', title: 'Book of the night 📚',
          frameCount: 1,
          frameDetails: [
            'Frame 1: Friday night cozy — book, maybe a glass of wine or sparkling water, low warm lighting',
          ],
          notes: 'Friday energy. Can be a little extra. You deserve it.',
          tags: ['MUSIC'],
        },
      ],
    },
    saturday: {
      dayMood: DAY_MOODS.saturday, dayBadge: 'SERIES DAY',
      frames: [
        {
          id: genId(), time: '10:00 AM', title: 'Weekly wishlist dump 🛍️✨',
          frameCount: 6,
          frameDetails: [
            'Frame 1: Hook frame — "weekly wishlist dump, do NOT @ me" with playful energy + aesthetic collage',
            'Frame 2: Item 1 — lifestyle photo + price range + "obsessed / not sure / need it?" poll sticker',
            'Frame 3: Item 2 — same format. Build the momentum.',
            'Frame 4: Item 3 — maybe a splurge pick. "this one is unhinged but I stand by it"',
            'Frame 5: Item 4 — the budget-friendly balance pick. Show range.',
            'Frame 6: Close — "save this story + tell me your fav in my DMs" + ShopMy link sticker',
          ],
          notes: 'Saturday morning has the highest engagement window. Polls on every item — the interactivity is the whole point.',
          tags: ['POLL', 'LINK', 'MUSIC'],
        },
        {
          id: genId(), time: '7:30 PM', title: 'Going out or staying in? 🌙',
          frameCount: 2,
          frameDetails: [
            'Frame 1: Saturday night poll — "going out 🌆 or staying in 🛋️" with a current mood selfie — no filter, real lighting',
            'Frame 2: Quick update on what you\'re actually doing, casual and authentic. People love the realness.',
          ],
          notes: 'Always high engagement. The relatability of not knowing what you want to do is universal.',
          tags: ['POLL'],
        },
      ],
    },
    sunday: {
      dayMood: DAY_MOODS.sunday, dayBadge: 'RESET DAY',
      frames: [
        {
          id: genId(), time: '12:00 PM', title: 'Sunday reset aesthetic 🤍',
          frameCount: 1,
          frameDetails: [
            'Frame 1: Clean, bright photo mid-reset — open notebook, lemon water, face mask, sunlight through curtains. No overthinking.',
          ],
          notes: 'Minimal text. Let the vibe do the work. "Reset mode" is the whole caption.',
          tags: ['MUSIC'],
        },
        {
          id: genId(), time: '7:00 PM', title: 'Outfit planning for the week ahead 👗',
          frameCount: 3,
          frameDetails: [
            'Frame 1: Wardrobe or bed covered in pieces you\'re considering — "planning my week" text overlay, aspirational energy',
            'Frame 2: First-day look laid out flat — tag any ShopMy items in frame',
            'Frame 3: Second look + poll: "which aesthetic are we doing this week?" give two options — they\'ll feel invested in the week',
          ],
          notes: 'This content saves really well. It\'s aspirational and practical at once — double the value.',
          tags: ['POLL', 'LINK'],
        },
        {
          id: genId(), time: '8:30 PM', title: 'Book of the night — the Sunday stack 📚',
          frameCount: 1,
          frameDetails: [
            'Frame 1: Full nightstand stack — current read + books on deck + reading tea or chamomile. A little ceremony.',
          ],
          notes: 'Sunday deserves the extra setup. This one saves a lot. Make it cozy and intentional.',
          tags: ['QUESTION', 'MUSIC'],
        },
      ],
    },
  }
}

// ─────────────── Frame Edit Modal ────────────────────────────────────────────

function FrameEditModal({ frame, dayName, onSave, onDelete, onClose }) {
  const isNew = !frame
  const [time,         setTime]         = useState(frame?.time         ?? '')
  const [title,        setTitle]        = useState(frame?.title        ?? '')
  const [frameCount,   setFrameCount]   = useState(String(frame?.frameCount ?? 1))
  const [detailsText,  setDetailsText]  = useState((frame?.frameDetails ?? []).join('\n'))
  const [notes,        setNotes]        = useState(frame?.notes        ?? '')
  const [tags,         setTags]         = useState(frame?.tags         ?? [])

  const toggleTag = tag => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const save = () => {
    if (!title.trim()) return
    onSave({
      id:           frame?.id ?? genId(),
      time:         time.trim(),
      title:        title.trim(),
      frameCount:   Math.max(1, parseInt(frameCount) || 1),
      frameDetails: detailsText.split('\n').map(s => s.trim()).filter(Boolean),
      notes:        notes.trim(),
      tags,
    })
  }

  return (
    <Modal isOpen onClose={onClose} title={isNew ? `⭕ Add Stories Entry · ${dayName}` : `✏️ Edit Stories Entry · ${dayName}`}>
      <div className="form-row">
        <div className="form-group" style={{ flex: '0 0 140px' }}>
          <label className="form-label">Time</label>
          <input className="form-input" value={time} onChange={e => setTime(e.target.value)} placeholder="8:30 AM" />
        </div>
        <div className="form-group" style={{ flex: '0 0 100px' }}>
          <label className="form-label">Frame Count</label>
          <input type="number" className="form-input" value={frameCount} onChange={e => setFrameCount(e.target.value)} min={1} max={20} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Title / Theme</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What's this batch about?" autoFocus={isNew}
            onKeyDown={e => e.key === 'Enter' && save()} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Frame Breakdown (one per line)</label>
        <textarea className="form-input" value={detailsText} onChange={e => setDetailsText(e.target.value)}
          placeholder={'Frame 1: ...\nFrame 2: ...\nFrame 3: ...'}
          rows={5} style={{ resize: 'vertical', fontSize: '0.83rem', lineHeight: 1.6 }} />
      </div>

      <div className="form-group">
        <label className="form-label">Notes / Strategy</label>
        <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Timing tips, hashtags, CTA reminders…" rows={2} style={{ resize: 'vertical' }} />
      </div>

      <div className="form-group">
        <label className="form-label">Story Features / Stickers</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TAG_OPTIONS.map(tag => {
            const st = TAG_STYLES[tag]; const on = tags.includes(tag)
            return (
              <button key={tag} onClick={() => toggleTag(tag)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                background: on ? st.bg : 'transparent', color: on ? st.color : 'var(--text-muted)',
                border: `1.5px solid ${on ? st.border : 'var(--border)'}`, fontWeight: on ? 700 : 400,
                transition: 'all 0.15s',
              }}>{tag}</button>
            )
          })}
        </div>
      </div>

      <div className="modal-footer">
        {!isNew && <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>}
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save}>{isNew ? 'Add Entry' : 'Save Changes'}</button>
      </div>
    </Modal>
  )
}

// ─────────────── Story Frame Row ─────────────────────────────────────────────

function StoryFrameRow({ frame, onClick }) {
  const [hovered, setHovered] = useState(false)
  const tod = getTimeOfDay(frame.time)
  const TOD_COLORS = { MORNING: '#F0AEC4', AFTERNOON: '#FFCFA8', EVENING: '#C4AAED' }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '12px 14px', borderRadius: 12, margin: '4px 0', cursor: 'pointer',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        border: '1.5px solid transparent',
        borderColor: hovered ? 'var(--border)' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      {/* Left: time + count + tod label */}
      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 68 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#D86030', lineHeight: 1 }}>
          {frame.time || '—'}
        </div>
        <div style={{
          display: 'inline-block', marginTop: 4,
          background: '#FFE8D0', color: '#9A5000',
          borderRadius: 10, padding: '2px 7px',
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.03em',
        }}>
          {frame.frameCount || 1} {frame.frameCount === 1 ? 'FRAME' : 'FRAMES'}
        </div>
        {tod && (
          <div style={{
            marginTop: 4, fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.05em',
            color: TOD_COLORS[tod] ? 'var(--text-light)' : 'var(--text-light)',
            textTransform: 'uppercase',
          }}>
            {tod}
          </div>
        )}
      </div>

      {/* Center: title + frames + notes + tags */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>
          {frame.title}
        </div>

        {frame.frameDetails?.length > 0 && (
          <div style={{ marginBottom: 7 }}>
            {frame.frameDetails.map((fd, i) => (
              <div key={i} style={{
                fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.45,
                paddingLeft: 10, marginBottom: 3,
                borderLeft: '2px solid var(--border)',
              }}>
                {fd}
              </div>
            ))}
          </div>
        )}

        {frame.notes && (
          <div style={{
            fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic',
            borderLeft: '3px solid var(--lavender)', paddingLeft: 9,
            marginBottom: 7, lineHeight: 1.45,
          }}>
            {frame.notes}
          </div>
        )}

        {frame.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {frame.tags.map(tag => {
              const st = TAG_STYLES[tag] || { bg: 'var(--surface-2)', color: 'var(--text-muted)', border: 'var(--border)' }
              return (
                <span key={tag} style={{
                  background: st.bg, color: st.color,
                  border: `1px solid ${st.border}`,
                  borderRadius: 20, padding: '2px 8px',
                  fontSize: '0.62rem', fontWeight: 700,
                }}>{tag}</span>
              )
            })}
          </div>
        )}
      </div>

      {hovered && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', flexShrink: 0, marginTop: 2 }}>✏️</span>
      )}
    </div>
  )
}

// ─────────────── Story Day Card ───────────────────────────────────────────────

function StoryDayCard({ day, dayDate, dayData, onEditFrame, onAddFrame }) {
  const badge   = dayData?.dayBadge || 'STORIES DAY'
  const badgeSt = BADGE_STYLES[badge] || BADGE_STYLES['STORIES DAY']
  const frames  = dayData?.frames || []
  const isToday = (() => {
    const t = new Date()
    return t.getFullYear() === dayDate.getFullYear() && t.getMonth() === dayDate.getMonth() && t.getDate() === dayDate.getDate()
  })()

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', marginBottom: 12,
      border: isToday ? '2px solid var(--lavender)' : '1.5px solid var(--border)',
      boxShadow: isToday ? '0 4px 20px var(--lavender-light)' : 'var(--shadow-xs)',
    }}>
      {/* Day header */}
      <div style={{
        background: isToday ? 'var(--lavender-light)' : 'var(--surface-2)',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.65rem', fontWeight: 700, fontStyle: 'italic',
            color: 'var(--text)', lineHeight: 1,
          }}>
            {day.charAt(0).toUpperCase() + day.slice(1)}
          </div>
          <div style={{ fontSize: '0.72rem', fontStyle: 'italic', color: isToday ? '#6B4FBF' : 'var(--text-muted)', marginTop: 3 }}>
            {dayData?.dayMood || DAY_MOODS[day]} · {fmtMonthDay(dayDate)}
            {isToday && <span style={{ fontWeight: 700 }}> · Today</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{
            background: badgeSt.bg, color: badgeSt.color,
            borderRadius: 20, padding: '4px 11px',
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap',
          }}>
            {badge}
          </span>
          <span style={{
            background: frames.length > 0 ? 'var(--lavender)' : 'var(--border)',
            color: frames.length > 0 ? 'white' : 'var(--text-light)',
            borderRadius: 20, padding: '4px 10px',
            fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            {frames.reduce((s, f) => s + (f.frameCount || 1), 0)} FRAMES
          </span>
        </div>
      </div>

      {/* Frame rows */}
      <div style={{ background: 'var(--surface)', padding: '6px 6px 4px' }}>
        {frames.length === 0 ? (
          <div style={{ padding: '16px 14px', color: 'var(--text-light)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            No stories planned yet — add an entry or generate with AI ✨
          </div>
        ) : (
          frames.map((frame, i) => (
            <StoryFrameRow key={frame.id || i} frame={frame} onClick={() => onEditFrame(i)} />
          ))
        )}

        {/* Add frame button */}
        <button
          onClick={onAddFrame}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            margin: '4px 14px 10px', padding: '7px 0',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.78rem', color: 'var(--text-light)', fontStyle: 'italic',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--lavender)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-light)' }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
          <span>Add a frame entry</span>
        </button>
      </div>
    </div>
  )
}

// ─────────────── Main Component ──────────────────────────────────────────────

export default function StoriesWeek({ data, setData, weekKey }) {
  const [frameModal,  setFrameModal]  = useState(null) // { day, frameIndex: number | null }
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiPhase,     setAiPhase]     = useState(0)
  const [aiError,     setAiError]     = useState(null)
  const [aiToast,     setAiToast]     = useState(null)
  const phaseRef = useRef(null)

  const todayMonday = dateFmt(getWeekMonday(new Date()))

  // Inject starter data for current week on first load
  useEffect(() => {
    setData(prev => {
      const existing = prev.storiesWeek?.weeks?.[todayMonday]
      if (existing && Object.keys(existing).length > 0) return prev
      return {
        ...prev,
        storiesWeek: {
          ...(prev.storiesWeek || {}),
          weeks: {
            ...(prev.storiesWeek?.weeks || {}),
            [todayMonday]: makeStarterStoriesWeek(),
          },
        },
      }
    })
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!aiToast) return
    const t = setTimeout(() => setAiToast(null), 4000)
    return () => clearTimeout(t)
  }, [aiToast])

  useEffect(() => {
    if (!aiLoading) { clearInterval(phaseRef.current); setAiPhase(0); return }
    phaseRef.current = setInterval(() => setAiPhase(p => (p + 1) % AI_PHASES.length), 2200)
    return () => clearInterval(phaseRef.current)
  }, [aiLoading])

  // ── Computed values ─────────────────────────────────────────────────────

  const weekDays  = useMemo(() => DAYS.map((_, i) => addDays(weekKey, i)), [weekKey])
  const storyData = data.storiesWeek?.weeks?.[weekKey] || {}

  // ── AI generation ────────────────────────────────────────────────────────

  const generateStoriesWithAI = async () => {
    if (aiLoading) return
    setAiLoading(true); setAiError(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'strategy', subMode: 'storiesWeek',
          weekContext: { weekStartDate: weekKey },
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'AI request failed')

      const aiData = json.data // { monday: { dayMood, dayBadge, frames: [...] }, ... }
      setData(prev => {
        // Ensure all frames have IDs
        const withIds = {}
        for (const day of DAYS) {
          if (!aiData[day]) continue
          withIds[day] = {
            ...aiData[day],
            frames: (aiData[day].frames || []).map(f => ({ ...f, id: f.id || genId() })),
          }
        }
        return {
          ...prev,
          storiesWeek: {
            ...(prev.storiesWeek || {}),
            weeks: {
              ...(prev.storiesWeek?.weeks || {}),
              [weekKey]: withIds,
            },
          },
        }
      })
      setAiToast('✨ Stories Week generated!')
    } catch (err) {
      console.error('[StoriesWeek] AI error:', err.message)
      setAiError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  const updateDay = (day, fn) => {
    setData(prev => ({
      ...prev,
      storiesWeek: {
        ...(prev.storiesWeek || {}),
        weeks: {
          ...(prev.storiesWeek?.weeks || {}),
          [weekKey]: {
            ...(prev.storiesWeek?.weeks?.[weekKey] || {}),
            [day]: fn(prev.storiesWeek?.weeks?.[weekKey]?.[day] || {}),
          },
        },
      },
    }))
  }

  const saveFrame = (day, frameIndex, frameData) => {
    updateDay(day, dayData => {
      const frames = [...(dayData.frames || [])]
      if (frameIndex === null || frameIndex === undefined) {
        frames.push(frameData)
      } else {
        frames[frameIndex] = frameData
      }
      return { ...dayData, frames }
    })
    setFrameModal(null)
  }

  const deleteFrame = (day, frameIndex) => {
    if (!confirm('Delete this stories entry?')) return
    updateDay(day, dayData => {
      const frames = (dayData.frames || []).filter((_, i) => i !== frameIndex)
      return { ...dayData, frames }
    })
    setFrameModal(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const editingFrame = frameModal ? (() => {
    const dayD  = storyData[frameModal.day] || {}
    const fr    = frameModal.frameIndex != null ? (dayD.frames || [])[frameModal.frameIndex] : null
    return { dayD, fr }
  })() : null

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            📖 Stories Week
          </h2>
          <p style={{ fontSize: '0.79rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Your daily Instagram Stories rhythm — frame by frame
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={generateStoriesWithAI}
            disabled={aiLoading}
            style={{ opacity: aiLoading ? 0.65 : 1 }}
          >
            {aiLoading ? AI_PHASES[aiPhase] : '✨ Generate Stories ideas with AI'}
          </button>
        </div>
      </div>

      {/* AI error */}
      {aiError && (
        <div style={{
          background: '#FFF0F0', border: '1px solid #FFCACA', borderRadius: 8,
          padding: '10px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: '#B00',
        }}>
          <span style={{ flex: 1 }}>{aiError}</span>
          <button className="btn btn-ghost btn-sm" onClick={generateStoriesWithAI} style={{ fontSize: '0.75rem', padding: '3px 10px' }}>Retry</button>
          <button onClick={() => setAiError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B00', fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.entries(TAG_STYLES).map(([tag, st]) => (
          <span key={tag} style={{
            background: st.bg, color: st.color, border: `1px solid ${st.border}`,
            borderRadius: 20, padding: '2px 9px', fontSize: '0.68rem', fontWeight: 600,
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Day cards */}
      {DAYS.map((day, i) => (
        <StoryDayCard
          key={day}
          day={day}
          dayDate={weekDays[i]}
          dayData={storyData[day]}
          onEditFrame={frameIndex => setFrameModal({ day, frameIndex })}
          onAddFrame={() => setFrameModal({ day, frameIndex: null })}
        />
      ))}

      {/* Toast */}
      {aiToast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--surface)',
          borderRadius: 24, padding: '10px 22px',
          fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          zIndex: 9999, pointerEvents: 'none', animation: 'fadeInUp 0.25s ease',
        }}>
          {aiToast}
        </div>
      )}

      {/* Frame edit modal */}
      {frameModal && editingFrame && (
        <FrameEditModal
          frame={editingFrame.fr}
          dayName={frameModal.day.charAt(0).toUpperCase() + frameModal.day.slice(1)}
          onSave={fd => saveFrame(frameModal.day, frameModal.frameIndex, fd)}
          onDelete={() => deleteFrame(frameModal.day, frameModal.frameIndex)}
          onClose={() => setFrameModal(null)}
        />
      )}
    </div>
  )
}
