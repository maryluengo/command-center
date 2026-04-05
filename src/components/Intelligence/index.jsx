import { useState, useCallback } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useCustomOptions } from '../../hooks/useCustomOptions'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI
const isWeb      = typeof window !== 'undefined' && !window.electronAPI

// ─────────────── Full markdown → HTML renderer ───────────────

// Escape HTML special chars in raw text (applied before inline markdown)
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Convert inline markdown inside an already-escaped string
function inlineMd(raw) {
  return escHtml(raw)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    .replace(/`([^`]+)`/g,         '<code>$1</code>')
}

// Parse a block of table rows into an HTML table string
function buildTableHtml(rows) {
  const isSep     = r => /^\|[\s\-:|]+\|$/.test(r)
  const parseCells = r => r.split('|').slice(1, -1).map(c => c.trim())
  const dataRows  = rows.filter(r => !isSep(r))
  const hasThead  = rows.length >= 2 && isSep(rows[1])

  if (dataRows.length === 0) return ''

  let html = '<div class="md-table-wrap"><table class="md-table">'
  if (hasThead) {
    html += `<thead><tr>${parseCells(dataRows[0]).map(c => `<th>${inlineMd(c)}</th>`).join('')}</tr></thead>`
    html += `<tbody>${dataRows.slice(1).map(r =>
      `<tr>${parseCells(r).map(c => `<td>${inlineMd(c)}</td>`).join('')}</tr>`
    ).join('')}</tbody>`
  } else {
    html += `<tbody>${dataRows.map(r =>
      `<tr>${parseCells(r).map(c => `<td>${inlineMd(c)}</td>`).join('')}</tr>`
    ).join('')}</tbody>`
  }
  html += '</table></div>'
  return html
}

// Full block-level markdown → HTML
function renderMarkdown(text) {
  if (!text) return ''
  const lines = text.split('\n')
  const out   = []
  let i = 0

  while (i < lines.length) {
    const t = lines[i].trim()

    if (!t) { i++; continue }

    // ── Markdown table (consecutive lines starting with |) ──
    if (t.startsWith('|') && t.endsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim()); i++
      }
      out.push(buildTableHtml(rows))
      continue
    }

    // ── ATX headings — check ##### → # in order so we don't mismatch ──
    if (t.startsWith('#### ')) { out.push(`<h5 class="md-h5">${inlineMd(t.slice(5))}</h5>`); i++; continue }
    if (t.startsWith('### '))  { out.push(`<h4 class="md-h4">${inlineMd(t.slice(4))}</h4>`); i++; continue }
    if (t.startsWith('## '))   { out.push(`<h3 class="md-h3">${inlineMd(t.slice(3))}</h3>`); i++; continue }
    if (t.startsWith('# '))    { out.push(`<h2 class="md-h2">${inlineMd(t.slice(2))}</h2>`); i++; continue }

    // ── Horizontal rule ──
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(t)) { out.push('<hr class="md-hr" />'); i++; continue }

    // ── Unordered list ──
    if (/^[-*•+]\s/.test(t)) {
      const items = []
      while (i < lines.length && /^[-*•+]\s/.test(lines[i].trim())) {
        items.push(`<li>${inlineMd(lines[i].trim().replace(/^[-*•+]\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ul class="md-ul">${items.join('')}</ul>`)
      continue
    }

    // ── Ordered list ──
    if (/^\d+[.)]\s/.test(t)) {
      const items = []
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        items.push(`<li>${inlineMd(lines[i].trim().replace(/^\d+[.)]\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ol class="md-ol">${items.join('')}</ol>`)
      continue
    }

    // ── Default paragraph ──
    out.push(`<p class="md-p">${inlineMd(t)}</p>`)
    i++
  }

  return out.join('\n')
}

function RichText({ text }) {
  if (!text) return null
  return (
    <div
      className="md-content"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  )
}

// ─────────────── Loading animation ───────────────
function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '40px 0', justifyContent: 'center', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? 'var(--pink)' : i === 1 ? 'var(--lavender)' : 'var(--mint)', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Claude is thinking…</p>
      <style>{`@keyframes bounce { 0%,80%,100% { transform: translateY(0) } 40% { transform: translateY(-10px) } }`}</style>
    </div>
  )
}

// ─────────────── Idea Card (from Claude) ───────────────
function IdeaCard({ idea, onSave }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ height: 5, background: 'linear-gradient(90deg, var(--pink), var(--lavender))' }} />
      <div style={{ padding: 'var(--space-md)' }}>
        <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>{idea.title}</div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {idea.platform && <span style={{ background: '#FFE8F2', color: '#B83060', padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: '0.7rem', fontWeight: 600 }}>{idea.platform}</span>}
          {idea.pillar   && <span style={{ background: '#EEE0FF', color: '#6030B0', padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: '0.7rem', fontWeight: 600 }}>{idea.pillar}</span>}
          {idea.effort   && <span style={{ background: '#E8FFE8', color: '#287028', padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: '0.7rem', fontWeight: 600 }}>{idea.effort}</span>}
        </div>

        {idea.outline && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 10 }}>
            <strong style={{ color: 'var(--text)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Script Outline</strong>
            <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{idea.outline}</div>
          </div>
        )}

        {idea.whatINeed && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            <strong style={{ color: 'var(--text)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What I Need</strong>
            <div style={{ marginTop: 4 }}>{idea.whatINeed}</div>
          </div>
        )}

        {idea.whyItWorks && (
          <div style={{ background: 'var(--sage-light)', borderRadius: 'var(--r-sm)', padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text)', marginBottom: 10, lineHeight: 1.5 }}>
            💡 {idea.whyItWorks}
          </div>
        )}

        <button className="btn btn-ghost btn-xs" onClick={() => onSave(idea)} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
          + Save to Ideas Board
        </button>
      </div>
    </div>
  )
}

// ─────────────── Parse Claude's idea response ───────────────
function parseIdeas(text) {
  // Try to extract structured idea blocks from Claude's response
  const ideas = []
  const sections = text.split(/(?=###?\s+Idea\s*\d|(?:^|\n)#{1,3}\s+\d+\.|(?:^|\n)\d+\.\s+\*\*)/im)

  sections.forEach(section => {
    const titleMatch = section.match(/(?:###?\s+Idea\s*\d+:?\s*|###?\s+|^#+\s+\d+\.\s+\*\*?|^\d+\.\s+\*\*?)(.+?)(?:\*\*)?(?:\n|$)/i)
    if (!titleMatch) return

    const title      = titleMatch[1].replace(/\*\*/g, '').trim()
    const platMatch  = section.match(/platform[:\s]+(.+)/i)
    const pillarMatch= section.match(/pillar[:\s]+(.+)/i)
    const effortMatch= section.match(/(?:effort|filming time)[:\s]+(.+)/i)
    const needMatch  = section.match(/(?:what i need|props|you need)[:\s]+([\s\S]+?)(?:\n\n|\n\*\*|$)/i)
    const whyMatch   = section.match(/why[:\s]+([\s\S]+?)(?:\n\n|\n\*\*|$)/i)
    const outlineMatch = section.match(/(?:script|outline|talking points)[:\s]+([\s\S]+?)(?:\n\n|\n\*\*|$)/i)

    ideas.push({
      title:     title,
      platform:  platMatch?.[1]?.trim().replace(/\*\*/g,'') || '',
      pillar:    pillarMatch?.[1]?.trim().replace(/\*\*/g,'') || '',
      effort:    effortMatch?.[1]?.trim().replace(/\*\*/g,'') || '',
      whatINeed: needMatch?.[1]?.trim().replace(/\*\*/g,'') || '',
      whyItWorks:whyMatch?.[1]?.trim().replace(/\*\*/g,'') || '',
      outline:   outlineMatch?.[1]?.trim().replace(/\*\*/g,'') || '',
    })
  })

  return ideas.filter(i => i.title && i.title.length > 2)
}

// ─────────────── Build prompts (Electron / desktop mode) ───────────────
function todayStr() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

const PILLARS_TEXT = `- **Fashion (35%)**: OOTD, styling, aesthetics, trends
- **Beauty (30%)**: makeup, skincare, hair (incl. Blonde Rehab Diaries hair-recovery series)
- **Real Life / ADHD (20%)**: relatable ADHD content, Miami lifestyle, founder journey, day-in-the-life
- **María Swim (15%)**: swimwear brand founder content, new arrivals, beach & pool lifestyle`

function buildWhatsWorkingPrompt(igData, ttData) {
  const ig = igData?.media?.data?.slice(0, 15) || []
  const tt = ttData?.videos?.slice(0, 15) || []

  const igSummary = ig.length > 0
    ? `Instagram (${igData.profile?.followers_count?.toLocaleString()} followers, @${igData.profile?.username}):\n` +
      ig.map(p =>
        `- ${p.media_type} on ${new Date(p.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ` +
        `${p.like_count||0} likes, ${p.comments_count||0} comments, ${p.saved||0} saves, ${p.reach||0} reach` +
        (p.caption ? ` | Caption: "${p.caption.slice(0, 100).replace(/\n/g, ' ')}…"` : '')
      ).join('\n')
    : 'No Instagram data available.'

  const ttSummary = tt.length > 0
    ? `TikTok (${ttData.profile?.follower_count?.toLocaleString()} followers, @${ttData.profile?.display_name}):\n` +
      tt.map(v =>
        `- Video on ${new Date((v.create_time||0)*1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ` +
        `${(v.view_count||0).toLocaleString()} views, ${v.like_count||0} likes, ${v.comment_count||0} comments, ${v.share_count||0} shares` +
        (v.title || v.video_description ? ` | "${(v.title||v.video_description||'').slice(0, 80)}"` : '')
      ).join('\n')
    : 'No TikTok data available.'

  const isoDate  = new Date().toISOString()
  const weekDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const dateHdr  = `[CURRENT DATE: ${isoDate} — ${todayStr()}]\n[WEEK OF: ${weekDate}]\nIMPORTANT: Use ${weekDate} as today's date in your response.\n`

  return `${dateHdr}
You are analyzing real performance data for María Luengo (@maryluengog), a Miami-based lifestyle and fashion creator who also owns the swimwear brand María Swim.

Her content pillars:
${PILLARS_TEXT}

She also runs an ongoing series called **Blonde Rehab Diaries** documenting her hair recovery journey.

Here is her recent content performance data (trial reels have already been excluded):

${igSummary}

${ttSummary}

Please analyze and provide:

## What's Working
- Which pillars (Fashion / Beauty / Real Life+ADHD / María Swim) are getting the most engagement — reference specific posts
- Which formats (Reels vs static, carousels) perform best
- Best days/times to post based on high-performing posts
- Caption length or style that correlates with better engagement
- Any patterns in the Blonde Rehab Diaries or ADHD content if present

## What's Not Working
- Patterns in underperforming posts
- Pillars or formats that are underdelivering
- What to avoid or reduce

## Top 3 Actionable Recommendations
Specific, concrete things she should do THIS WEEK — based purely on her data, not generic advice.

Reference actual numbers. Be direct and specific.`
}

function buildTrendingPrompt() {
  const isoDate  = new Date().toISOString()
  const today    = todayStr()
  const weekDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const dateHdr  = `[CURRENT DATE: ${isoDate} — ${today}]\n[WEEK OF: ${weekDate}]\nIMPORTANT: Use ${weekDate} as today's date. Do NOT reference any earlier date. If your training predates this, give your best forward-looking analysis without citing a past date.\n`

  return `${dateHdr}
You are generating a trend report for the week of ${weekDate}.

You are a social media strategist advising María Luengo (@maryluengog), a Miami-based lifestyle, fashion, and beauty creator who also owns a swimwear brand called María Swim. She posts on both Instagram and TikTok.

Her content pillars:
${PILLARS_TEXT}

She also runs an ongoing series: **Blonde Rehab Diaries** (hair recovery journey) and creates ADHD/relatable content.

Give her a specific, current trend report she can act on THIS WEEK:

## Trending TikTok Formats Right Now
3-4 specific video formats or trends performing well right now in fashion, beauty, and lifestyle — with a hook or concept she can execute

## Trending Instagram Reel Formats
3-4 specific reel formats trending right now for Miami-based lifestyle and fashion creators

## Trending Topics in Her Niches
- **Fashion (35%):** specific aesthetics, styling moments, or micro-trends
- **Beauty (30%):** trending routines, products, looks — especially hair content (relevant to Blonde Rehab Diaries)
- **Real Life / ADHD (20%):** trending relatable content formats, ADHD topics performing well
- **María Swim (15%):** swimwear/beach content performing well right now

## Content Hooks Working Right Now
5 specific opening lines or first-3-second hooks performing well in her niche this week

## What Similar Creators Are Doing
What creators in fashion/beauty/lifestyle at 10k–150k followers are doing right now that's gaining traction

Be specific and immediately actionable — give her real concepts she can film this week.`
}

function buildIdeasPrompt(igData, ttData) {
  const followers   = igData?.profile?.followers_count || 0
  const igPostCount = igData?.media?.data?.length || 0
  const avgER = igData && igPostCount > 0
    ? ((igData.media.data.reduce((a, p) => a + (p.like_count||0) + (p.comments_count||0), 0) / igPostCount / (followers||1)) * 100).toFixed(1)
    : null

  const ttAvgViews = ttData?.videos?.length > 0
    ? Math.round(ttData.videos.reduce((a, v) => a + (v.view_count||0), 0) / ttData.videos.length)
    : null

  const dataContext = [
    igData  ? `Instagram: ${followers.toLocaleString()} followers${avgER ? `, ~${avgER}% avg engagement rate` : ''}` : null,
    ttData  ? `TikTok: ${(ttData.profile?.follower_count||0).toLocaleString()} followers${ttAvgViews ? `, ~${ttAvgViews.toLocaleString()} avg views per video` : ''}` : null,
    !igData && !ttData ? 'No analytics connected — base ideas on best practices for her niche.' : null,
  ].filter(Boolean).join('\n')

  const isoDate2  = new Date().toISOString()
  const weekDate2 = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const dateHdr2  = `[CURRENT DATE: ${isoDate2} — ${todayStr()}]\n[WEEK OF: ${weekDate2}]\nIMPORTANT: Use ${weekDate2} as today's date.\n`

  return `${dateHdr2}
Generate 6 specific, fresh, immediately filmable content ideas for María Luengo (@maryluengog).

Creator profile:
- Name: María Luengo
- Instagram + TikTok: @maryluengog
- Location: Miami, Florida
- Brand: María Swim (swimwear line she founded)
- Content pillars:
${PILLARS_TEXT}

Ongoing series & recurring themes to weave in:
- **Blonde Rehab Diaries**: documenting hair recovery/bleach damage journey — beauty storytelling, vulnerability, transformation
- **ADHD content**: relatable "ADHD brain" moments, productivity hacks, day-in-the-life chaos, neurodivergent creator content
- **Miami aesthetic**: beach, pool, Art Deco architecture, vibrant city lifestyle
- **Founder journey**: behind-the-scenes of running María Swim — design, production, social media strategy

Analytics context:
${dataContext}

Generate exactly 6 ideas covering these themes:
1. One Fashion/styling idea
2. One Beauty idea (hair/makeup/skincare — can tie to Blonde Rehab Diaries)
3. One ADHD/relatable Real Life idea
4. One María Swim / founder journey idea
5. One Miami lifestyle / aesthetic idea
6. One "wildcard" — creative format that bridges 2+ pillars

Use this EXACT format for each idea:

### Idea [number]: [Specific, catchy title]
**Platform:** [Instagram Reel / Instagram Carousel / TikTok / Both]
**Pillar:** [pillar name]
**Effort:** [Quick (under 1 hr) / Half Day / Full Day]
**Script Outline:**
[3-5 bullet points describing the video or post structure, including opening hook]
**What I Need:** [specific props, outfits, locations, people needed]
**Why It Works:** [one specific reason tied to her data or a current trend — 1-2 sentences]

Rules:
- Every idea must feel specific and immediately filmable — no vague concepts
- Include at least 2 Quick ideas
- Ideas should feel native to each platform's current style
- Reference her specific context (Miami, María Swim brand, ADHD, Blonde Rehab Diaries) naturally`
}

// ─────────────── Main Intelligence Section ───────────────
export default function Intelligence() {
  const [tab, setTab]   = useState('working')
  const [igData]        = useLocalStorage('analytics-ig', null)
  const [ttData]        = useLocalStorage('analytics-tt', null)
  const [ideas, setIdeas] = useLocalStorage('content-ideas-brand', [])

  const { options: pillars } = useCustomOptions('ideas-pillars', ['Fashion', 'Beauty', 'Real Life', 'María Swim'])

  const [workingText,  setWorkingText]  = useLocalStorage('intel-working',  '')
  const [trendingText, setTrendingText] = useLocalStorage('intel-trending', '')
  const [ideasText,    setIdeasText]    = useLocalStorage('intel-ideas',    '')
  const [parsedIdeas,  setParsedIdeas]  = useState([])

  const [loading, setLoading] = useState({})
  const [error,   setError]   = useState({})

  const ask = async (key) => {
    setLoading(p => ({ ...p, [key]: true }))
    setError(p => ({ ...p, [key]: null }))
    try {
      let text

      if (isElectron) {
        // Desktop: build prompt locally and call Claude via IPC
        let prompt
        if (key === 'working')  prompt = buildWhatsWorkingPrompt(igData, ttData)
        if (key === 'trending') prompt = buildTrendingPrompt()
        if (key === 'ideas')    prompt = buildIdeasPrompt(igData, ttData)
        text = await window.electronAPI.claudeAI({ prompt })
      } else {
        // Web: call server-side route — it fetches data + calls Claude itself
        const res = await fetch('/api/ai/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ type: key }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
        text = data.text
      }

      if (key === 'working')  setWorkingText(text)
      if (key === 'trending') setTrendingText(text)
      if (key === 'ideas')    { setIdeasText(text); setParsedIdeas(parseIdeas(text)) }
    } catch (e) {
      setError(p => ({ ...p, [key]: e.message }))
    } finally {
      setLoading(p => ({ ...p, [key]: false }))
    }
  }

  const refreshWorking  = () => ask('working')
  const refreshTrending = () => ask('trending')
  const refreshIdeas    = () => ask('ideas')

  // Parse ideas whenever ideasText changes (on load)
  useState(() => { if (ideasText) setParsedIdeas(parseIdeas(ideasText)) }, [ideasText])

  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

  const saveIdea = (idea) => {
    const card = {
      id: genId(),
      title:       idea.title || '',
      description: idea.outline || '',
      pillar:      idea.pillar  || 'Fashion',
      platform:    idea.platform?.includes('TikTok') ? 'TikTok' : 'Instagram',
      effort:      idea.effort  || 'Quick',
      status:      'Just an Idea',
      files:       [],
      links:       [''],
      client:      '',
    }
    setIdeas(prev => [card, ...prev])
    alert(`✨ Saved "${idea.title}" to your Personal Brand Ideas board!`)
  }

  const TabHeader = ({ tabKey, onRefresh, loading: isLoading }) => (
    <div className="flex items-center justify-between mb-lg" style={{ flexWrap: 'wrap', gap: 10 }}>
      <div className="flex items-center gap-sm">
        <span style={{ background: 'linear-gradient(135deg, var(--pink), var(--lavender))', borderRadius: 'var(--r-full)', padding: '3px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'white', letterSpacing: '0.05em' }}>
          ✦ POWERED BY CLAUDE
        </span>
        {(igData || ttData) && (
          <span style={{ fontSize: '0.72rem', color: 'var(--sage)', fontWeight: 600 }}>✓ Using your analytics data</span>
        )}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={isLoading}>
        {isLoading ? <ThinkingDots /> : '✦ Refresh Insights'}
      </button>
    </div>
  )

  const ErrorBanner = ({ msg }) => msg ? (
    <div style={{ background: '#FFE8E8', border: '1px solid #F8CECE', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--priority-high)' }}>
      ⚠️ {msg}
    </div>
  ) : null

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">AI Intelligence</h1>
          <p className="section-subtitle">Claude-powered content strategy & insights</p>
        </div>
      </div>

      {isWeb && (igData || ttData) && (
        <div style={{ background: 'var(--sage-light)', border: '1px solid var(--sage)', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: 'var(--text)' }}>
          ✓ <strong>Analytics connected</strong> — Claude will use your real Instagram and TikTok data for analysis.
        </div>
      )}
      {isWeb && !igData && !ttData && (
        <div style={{ background: 'var(--lavender-light)', border: '1px solid var(--lavender)', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: 'var(--text)' }}>
          💡 <strong>Tip:</strong> Connect your Instagram or TikTok in the Analytics section to get data-backed insights. Trending Now and general advice work without connecting.
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'working'  ? 'active' : ''}`} onClick={() => setTab('working')}>📊 What's Working</button>
        <button className={`tab ${tab === 'trending' ? 'active' : ''}`} onClick={() => setTab('trending')}>🔥 Trending Now</button>
        <button className={`tab ${tab === 'ideas'    ? 'active' : ''}`} onClick={() => setTab('ideas')}>✨ Content Ideas</button>
      </div>

      {/* What's Working */}
      {tab === 'working' && (
        <div className="card">
          <TabHeader tabKey="working" onRefresh={refreshWorking} loading={loading.working} />
          <ErrorBanner msg={error.working} />
          {loading.working ? (
            <ThinkingDots />
          ) : workingText ? (
            <RichText text={workingText} />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No insights yet</h3>
              <p>{igData || ttData ? 'Hit "Refresh Insights" — Claude will analyze your real data and tell you what\'s actually working.' : 'Connect your Instagram or TikTok in the Analytics section first, then come back here for data-backed insights.'}</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={refreshWorking}>Analyze My Content</button>
            </div>
          )}
        </div>
      )}

      {/* Trending Now */}
      {tab === 'trending' && (
        <div className="card">
          <TabHeader tabKey="trending" onRefresh={refreshTrending} loading={loading.trending} />
          <ErrorBanner msg={error.trending} />
          {loading.trending ? (
            <ThinkingDots />
          ) : trendingText ? (
            <RichText text={trendingText} />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔥</div>
              <h3>No trends loaded</h3>
              <p>Hit "Refresh Insights" to get Claude's analysis of trending content formats, sounds, and topics in your niches.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={refreshTrending}>Get Trend Report</button>
            </div>
          )}
        </div>
      )}

      {/* Content Ideas */}
      {tab === 'ideas' && (
        <div className="card">
          <TabHeader tabKey="ideas" onRefresh={refreshIdeas} loading={loading.ideas} />
          <ErrorBanner msg={error.ideas} />
          {loading.ideas ? (
            <ThinkingDots />
          ) : parsedIdeas.length > 0 ? (
            <>
              <p className="text-sm text-muted mb-md">Claude generated {parsedIdeas.length} ideas tailored to you. Save any to your Content Ideas board!</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 'var(--space-md)' }}>
                {parsedIdeas.map((idea, i) => (
                  <IdeaCard key={i} idea={idea} onSave={saveIdea} />
                ))}
              </div>
              {ideasText && !parsedIdeas.length && <RichText text={ideasText} />}
            </>
          ) : ideasText ? (
            <RichText text={ideasText} />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✨</div>
              <h3>No ideas generated yet</h3>
              <p>Claude will create 6 specific content ideas tailored to you, based on your analytics data and current trends.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={refreshIdeas}>Generate My Ideas</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
