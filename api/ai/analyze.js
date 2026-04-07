'use strict'

const { getSession }   = require('../_utils/cookies')
const { withAuth }     = require('../_utils/graph')
const { getTTSession } = require('../_utils/tiktok-cookies')

const CLAUDE_MODEL = 'claude-opus-4-5'
const IG_BASE      = 'https://graph.facebook.com/v18.0'

// ─────────────────────────────────────────────────────────────────────────────
// Content pillars with weights
// ─────────────────────────────────────────────────────────────────────────────
const PILLARS = [
  { name: 'Fashion',          pct: 35, notes: 'OOTD, styling, aesthetics, trends' },
  { name: 'Beauty',           pct: 30, notes: 'makeup, skincare, hair (incl. Blonde Rehab Diaries hair-recovery series)' },
  { name: 'Real Life / ADHD', pct: 20, notes: 'relatable ADHD content, Miami lifestyle, founder journey, day-in-the-life' },
  { name: 'María Swim',       pct: 15, notes: 'swimwear brand founder content, new arrivals, beach & pool lifestyle' },
]

const PILLARS_SUMMARY = PILLARS
  .map(p => `- **${p.name} (${p.pct}%)**: ${p.notes}`)
  .join('\n')

// ─────────────────────────────────────────────────────────────────────────────
// Data fetchers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchIGData(req) {
  const session = getSession(req)
  if (!session) return null
  const { accessToken, igUserId } = session

  try {
    const profileRes = await fetch(
      withAuth(`${IG_BASE}/${igUserId}?fields=name,username,followers_count,media_count`, accessToken)
    )
    const profile = await profileRes.json()
    if (profile.error) return null

    const mediaRes = await fetch(
      withAuth(
        `${IG_BASE}/${igUserId}/media` +
        `?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink,media_product_type,is_shared_to_feed` +
        `&limit=25`,
        accessToken
      )
    )
    const media = await mediaRes.json()
    if (media.error) return { profile, media: { data: [] } }

    // Enrich with reach/saves
    const enriched = await Promise.all(
      (media.data || []).map(async post => {
        try {
          const ins     = await fetch(withAuth(`${IG_BASE}/${post.id}/insights?metric=reach,saved`, accessToken))
          const insData = await ins.json()
          const m = {}
          insData.data?.forEach(i => { m[i.name] = i.values?.[0]?.value ?? 0 })
          return { ...post, ...m }
        } catch { return post }
      })
    )

    // Filter trial reels (same logic as instagram.js)
    // Only remove: low-reach reels (< 50) or no-permalink + no-reach reels
    // Do NOT use is_shared_to_feed alone — regular reels can also have it false
    const filtered = enriched.filter(p => {
      if (p.media_type !== 'VIDEO') return true
      const reach = typeof p.reach === 'number' ? p.reach : null
      if (reach !== null && reach > 0 && reach < 50) return false
      if ((reach === 0 || reach === null) && !p.permalink) return false
      return true
    })

    return { profile, media: { data: filtered } }
  } catch (err) {
    console.error('[ai:analyze] IG fetch error:', err.message)
    return null
  }
}

async function fetchTTData(req) {
  const session = getTTSession(req)
  if (!session) return null
  const { accessToken } = session

  try {
    const fields  = 'open_id,avatar_url,display_name,follower_count,likes_count,video_count'
    const profRes = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const profData = await profRes.json()
    if (profData.error?.code && profData.error.code !== 'ok') return null
    const profile  = profData.data?.user || null

    const vidFields = 'id,title,video_description,create_time,view_count,like_count,comment_count,share_count'
    const vidRes    = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${vidFields}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ max_count: 20 }),
    })
    const vidData = await vidRes.json()
    const videos  = vidData.data?.videos || []

    return { profile, videos }
  } catch (err) {
    console.error('[ai:analyze] TikTok fetch error:', err.message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON helper for strategy mode
// ─────────────────────────────────────────────────────────────────────────────

function parseJsonFromClaude(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw    = fenced ? fenced[1].trim() : text.trim()
  return JSON.parse(raw)
}

// Concise analytics summary used in strategy prompts
function buildAnalyticsSummary(igData, ttData) {
  const ig          = igData?.media?.data || []
  const tt          = ttData?.videos      || []
  const igFollowers = igData?.profile?.followers_count || 0
  const ttFollowers = ttData?.profile?.follower_count  || 0

  const topIG = [...ig]
    .sort((a, b) =>
      (b.like_count + b.comments_count + (b.saved || 0)) -
      (a.like_count + a.comments_count + (a.saved || 0))
    )
    .slice(0, 8)

  const topTT = [...tt]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 8)

  let out = ''
  if (igFollowers || topIG.length) {
    out += `Instagram: ${igFollowers.toLocaleString()} followers (@${igData?.profile?.username || 'maryluengog'})\n`
    if (topIG.length) {
      out += 'Top posts (by engagement):\n'
      topIG.forEach(p => {
        const cap = p.caption ? ` | "${p.caption.slice(0, 65).replace(/\n/g, ' ')}"` : ''
        out += `  - ${p.media_type}${cap}: ${p.like_count || 0} likes, ${p.comments_count || 0} comments, ${p.saved || 0} saves, ${p.reach || 0} reach\n`
      })
    }
  } else {
    out += 'Instagram: no analytics available\n'
  }
  if (ttFollowers || topTT.length) {
    out += `\nTikTok: ${ttFollowers.toLocaleString()} followers (@${ttData?.profile?.display_name || 'maryluengog'})\n`
    if (topTT.length) {
      out += 'Top videos (by views):\n'
      topTT.forEach(v => {
        const ttl = (v.title || v.video_description || '').slice(0, 65)
        out += `  - ${ttl ? `"${ttl}" ` : ''}${(v.view_count || 0).toLocaleString()} views, ${v.like_count || 0} likes, ${v.share_count || 0} shares\n`
      })
    }
  } else {
    out += '\nTikTok: no analytics available\n'
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy prompt builders
// ─────────────────────────────────────────────────────────────────────────────

function buildStrategyWeeklyPrompt(igData, ttData, weekContext, userContext) {
  const analytics = buildAnalyticsSummary(igData, ttData)
  const { weekStartDate, existingCells } = weekContext || {}

  const existingNote = existingCells && Object.keys(existingCells).length > 0
    ? `\nThe creator has already manually planned these slots — leave them EXACTLY as-is (do not change them):\n${JSON.stringify(existingCells, null, 2)}\n`
    : ''

  const contextNote = userContext
    ? `\nThis week's context (use this to shape tone, energy, and content themes — plan around it):\n${userContext}\n`
    : ''

  return `${dateHeader()}
You are generating a weekly content schedule for María Luengo (@maryluengog), a Miami-based lifestyle, fashion, and beauty creator who also owns the swimwear brand María Swim.

Her content pillars:
${PILLARS_SUMMARY}

Ongoing series: Blonde Rehab Diaries (hair recovery) | ADHD/relatable content | Miami lifestyle | Founder journey at María Swim.

Analytics context (use this to inform which pillars and formats to prioritize):
${analytics}
${contextNote}${existingNote}
Generate a full 7-day posting schedule for the week starting ${weekStartDate || 'this Monday'}.

Return ONLY valid JSON — no markdown, no explanation — in this exact shape:
{
  "monday":    { "instagramFeed": {...}, "instagramReel": {...}, "instagramStories": {...}, "tiktok": {...}, "pinterest": {...}, "youtubeShorts": {...} },
  "tuesday":   { ... },
  "wednesday": { ... },
  "thursday":  { ... },
  "friday":    { ... },
  "saturday":  { ... },
  "sunday":    { ... }
}

Each platform slot must be either null (skip that day/platform) or an object with EXACTLY these fields:
{
  "postType": "Carousel" | "Photo" | "Reel" | "Stories" | "TikTok" | "Pin" | "Short",
  "title": "A short, specific post title (max 8 words)",
  "idea": "One vivid sentence describing the actual content concept",
  "pillar": "Fashion" | "Beauty" | "Real Life / ADHD" | "María Swim",
  "brief": {
    "duration": "e.g. 30-45 sec (for video) or N/A (for photos/pins)",
    "format": "e.g. talking-head tutorial | voiceover b-roll | carousel slide deck | static photo | pin grid",
    "hook": "The exact first line or visual the viewer sees — make it magnetic and specific to María's voice",
    "structure": ["Step/clip 1: ...", "Step/clip 2: ...", "Step/clip 3: ...", "Outro: ..."],
    "clipCount": "e.g. 6-8 quick clips (for reels/TikToks) or N/A",
    "voiceStyle": "e.g. warm voiceover storytime | on-camera energetic | text-overlay aesthetic | casual BTS",
    "seoKeywords": ["keyword1", "keyword2", "keyword3"],
    "captionDirection": "One sentence on tone + hook for the caption (e.g. 'Start with a question, end with CTA to ShopMy')",
    "callToAction": "Exact CTA to use (e.g. 'Link in bio to shop', 'Save this for later', 'Comment your answer below')"
  }
}

Scheduling rules:
- Instagram Feed: 3-4 days/week (Mon, Wed, Fri, + 1 weekend day)
- Instagram Reel: 4-5 days/week (skip Sundays)
- Instagram Stories: 5-7 days/week (daily or near-daily)
- TikTok: 4-5 days/week
- Pinterest: 3 days/week (Mon, Wed, Fri)
- YouTube Shorts: 2-3 days/week
- Balance pillars across the week using approximate weights: Fashion 35%, Beauty 30%, Real Life/ADHD 20%, María Swim 15%
- Vary formats and themes so the week feels fresh, not repetitive
- Lean into what the analytics show is working
- Write briefs in María's voice: warm, real, slightly humorous, occasionally bilingual (Spanish) when natural
- Make hooks and structure vivid and specific — reference Miami, ADHD, hair recovery, María Swim where relevant

Return ONLY the JSON object. No commentary.`
}

function buildStrategyStoriesWeekPrompt(igData, ttData, weekContext, userContext) {
  const analytics = buildAnalyticsSummary(igData, ttData)
  const { weekStartDate } = weekContext || {}
  const contextNote = userContext
    ? `\nThis week's context (adapt the Stories rhythm to reflect it — energy, topics, and timing):\n${userContext}\n`
    : ''

  return `${dateHeader()}
You are generating a weekly Instagram Stories content plan for María Luengo (@maryluengog), a Miami-based lifestyle, fashion, and beauty creator who also owns the swimwear brand María Swim.

Her content pillars:
${PILLARS_SUMMARY}

Ongoing series: Blonde Rehab Diaries (hair recovery) | ADHD/relatable content | Miami lifestyle | Founder journey at María Swim.

Analytics (use to inform what resonates and what to prioritize):
${analytics}
${contextNote}
Generate a full 7-day Instagram Stories rhythm for the week starting ${weekStartDate || 'this Monday'}.

Stories format: short daily sessions posted at consistent times. Each day has 2-3 "frame entries" — a batch of Story frames posted around the same time. Think of each entry as one "Stories moment" (e.g., a morning OOTD post = 2-3 frames, an evening ShopMy drop = 3-4 frames).

Daily rhythm should follow this loose template (adapt naturally):
- Morning (~8:30-9:30 AM): OOTD, gym, or vibe post
- Afternoon (~1-4 PM): Engagement content (polls, Q&A, product drops, ShopMy)
- Evening (~7:30-8:30 PM): Wind-down content (books, night aesthetic, planning)

Return ONLY valid JSON — no markdown, no explanation:
{
  "monday":    { "dayMood": "fresh start energy",  "dayBadge": "OUTFIT DAY",      "frames": [...] },
  "tuesday":   { "dayMood": "wellness vibes",      "dayBadge": "WELLNESS DAY",    "frames": [...] },
  "wednesday": { "dayMood": "shopmy day",          "dayBadge": "SHOPMY DAY",      "frames": [...] },
  "thursday":  { "dayMood": "connection day",      "dayBadge": "QUESTION DAY",    "frames": [...] },
  "friday":    { "dayMood": "weekend incoming",    "dayBadge": "COLLECTION DROP", "frames": [...] },
  "saturday":  { "dayMood": "wishlist drop",       "dayBadge": "SERIES DAY",      "frames": [...] },
  "sunday":    { "dayMood": "plan the week",       "dayBadge": "RESET DAY",       "frames": [...] }
}

Each frame entry must have exactly these fields:
{
  "time": "8:30 AM",
  "title": "Short title for this batch of frames (max 8 words)",
  "frameCount": 3,
  "frameDetails": ["Frame 1: specific visual description", "Frame 2: ...", "Frame 3: ..."],
  "notes": "One strategy tip or timing note",
  "tags": ["POLL"]
}

Tag options (use only these): POLL, MUSIC, QUESTION, LINK, SLIDER

Rules:
- Every day should have 2-3 frame entries
- Include at least one engagement mechanic (POLL, QUESTION, SLIDER) per day
- Wednesday + Friday should feature ShopMy/LINK content
- "Book of the night" appears 4-5 evenings/week as a consistent daily touchpoint
- Write in María's voice: warm, real, slightly humorous, occasionally bilingual (Spanish) when natural
- Make frameDetails vivid and specific — not generic. Reference Miami, ADHD, hair recovery, María Swim where relevant.
- Return ONLY the JSON object.`
}

function buildStrategyEventAnglesPrompt(igData, ttData, eventData) {
  const analytics = buildAnalyticsSummary(igData, ttData)
  const { name, date, category, description, suggestedAngles, suggestedPlatforms, suggestedPillars } = eventData || {}

  return `${dateHeader()}
You are generating 5 personalized content angles for María Luengo (@maryluengog) to cover an upcoming event or moment on her content calendar.

Her content pillars:
${PILLARS_SUMMARY}

Ongoing series: Blonde Rehab Diaries (hair recovery) | ADHD/relatable content | Miami lifestyle | Founder journey at María Swim.

Analytics (use this to tailor angles toward formats and pillars performing best):
${analytics}

Event details:
- Name: ${name || 'Unknown event'}
- Date: ${date || 'TBD'}
- Category: ${category || 'General'}
- Description: ${description || ''}
- Suggested angles (from template — expand and personalize these): ${(suggestedAngles || []).join(', ')}
- Suggested platforms: ${(suggestedPlatforms || []).join(', ')}
- Suggested pillars: ${(suggestedPillars || []).join(', ')}

Generate exactly 5 content angles that feel specific to María, her Miami lifestyle, and her analytics insights.

Return ONLY valid JSON — no markdown, no explanation:
{
  "angles": [
    {
      "title": "Short punchy angle title (max 8 words)",
      "description": "2-3 sentence description of the specific content concept, hook, and why it fits her audience",
      "platform": "Instagram Reel" | "Instagram Feed" | "Instagram Stories" | "TikTok" | "Pinterest" | "YouTube Shorts" | "Both IG & TikTok",
      "pillar": "Fashion" | "Beauty" | "Real Life / ADHD" | "María Swim",
      "postType": "Reel" | "Carousel" | "Photo" | "Stories" | "TikTok" | "Pin" | "Short"
    }
  ]
}

Rules:
- Each angle must be immediately filmable and specific to this event
- Vary platforms and pillars across the 5 angles
- At least 1 angle should tie to her top-performing pillar based on analytics
- Reference her Miami context, María Swim, or Blonde Rehab Diaries naturally when relevant
- Return ONLY the JSON object.`
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────────────────────────────────────

function todayContext() {
  const now = new Date()
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// Shared date-header block injected at the top of every prompt so Claude
// cannot default to its training-data priors when citing "current" dates.
function dateHeader() {
  const iso      = new Date().toISOString()
  const human    = todayContext()
  const weekDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return `[CURRENT DATE: ${iso} — ${human}]
[WEEK OF: ${weekDate}]
IMPORTANT: Use ${weekDate} as today's date in your response. Do NOT reference any earlier date (e.g. "January 2025" or "early 2024"). If your training data predates this, give your best forward-looking analysis without citing a past date.
`
}

function buildWhatsWorkingPrompt(igData, ttData) {
  const ig = igData?.media?.data?.slice(0, 15) || []
  const tt = ttData?.videos?.slice(0, 15) || []

  const igSummary = ig.length > 0
    ? `Instagram (${igData.profile?.followers_count?.toLocaleString()} followers, @${igData.profile?.username}):\n` +
      ig.map(p =>
        `- ${p.media_type} on ${new Date(p.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ` +
        `${p.like_count || 0} likes, ${p.comments_count || 0} comments, ${p.saved || 0} saves, ${p.reach || 0} reach` +
        (p.caption ? ` | Caption: "${p.caption.slice(0, 100).replace(/\n/g, ' ')}…"` : '')
      ).join('\n')
    : 'No Instagram data available.'

  const ttSummary = tt.length > 0
    ? `TikTok (${ttData.profile?.follower_count?.toLocaleString()} followers, @${ttData.profile?.display_name}):\n` +
      tt.map(v =>
        `- Video on ${new Date((v.create_time || 0) * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ` +
        `${(v.view_count || 0).toLocaleString()} views, ${v.like_count || 0} likes, ${v.comment_count || 0} comments, ${v.share_count || 0} shares` +
        (v.title || v.video_description ? ` | "${(v.title || v.video_description || '').slice(0, 80)}"` : '')
      ).join('\n')
    : 'No TikTok data available.'

  return `${dateHeader()}
You are analyzing real performance data for María Luengo (@maryluengog), a Miami-based lifestyle and fashion creator who also owns the swimwear brand María Swim.

Her content pillars:
${PILLARS_SUMMARY}

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
  const weekDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return `${dateHeader()}
You are a social media strategist advising María Luengo (@maryluengog), a Miami-based lifestyle, fashion, and beauty creator who also owns a swimwear brand called María Swim. She posts on both Instagram and TikTok.

Her content pillars:
${PILLARS_SUMMARY}

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
    ? ((igData.media.data.reduce((a, p) => a + (p.like_count || 0) + (p.comments_count || 0), 0) / igPostCount / (followers || 1)) * 100).toFixed(1)
    : null

  const ttAvgViews = ttData?.videos?.length > 0
    ? Math.round(ttData.videos.reduce((a, v) => a + (v.view_count || 0), 0) / ttData.videos.length)
    : null

  const dataContext = [
    igData  ? `Instagram: ${followers.toLocaleString()} followers${avgER ? `, ~${avgER}% avg engagement rate` : ''}` : null,
    ttData  ? `TikTok: ${(ttData.profile?.follower_count || 0).toLocaleString()} followers${ttAvgViews ? `, ~${ttAvgViews.toLocaleString()} avg views per video` : ''}` : null,
    !igData && !ttData ? 'No analytics connected — base ideas on best practices for her niche.' : null,
  ].filter(Boolean).join('\n')

  return `${dateHeader()}
Generate 6 specific, fresh, immediately filmable content ideas for María Luengo (@maryluengog).

Creator profile:
- Name: María Luengo
- Instagram + TikTok: @maryluengog
- Location: Miami, Florida
- Brand: María Swim (swimwear line she founded)
- Content pillars:
${PILLARS_SUMMARY}

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

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured.' })
  }

  const { type, subMode, weekContext, eventData, userContext } = req.body || {}
  if (!['working', 'trending', 'ideas', 'strategy'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be: working, trending, ideas, or strategy.' })
  }
  if (type === 'strategy' && !['weeklySchedule', 'eventAngles', 'storiesWeek'].includes(subMode)) {
    return res.status(400).json({ error: 'Strategy type requires subMode: weeklySchedule, eventAngles, or storiesWeek.' })
  }

  console.log(`[ai:analyze] type=${type}${subMode ? ` subMode=${subMode}` : ''} date=${todayContext()}`)

  try {
    let igData = null
    let ttData = null

    if (type === 'working' || type === 'ideas' || type === 'strategy') {
      ;[igData, ttData] = await Promise.all([fetchIGData(req), fetchTTData(req)])
      console.log(`[ai:analyze] data — IG: ${!!igData} (${igData?.media?.data?.length || 0} posts), TT: ${!!ttData}`)
    }

    let prompt
    if (type === 'working')                          prompt = buildWhatsWorkingPrompt(igData, ttData)
    if (type === 'trending')                         prompt = buildTrendingPrompt()
    if (type === 'ideas')                            prompt = buildIdeasPrompt(igData, ttData)
    if (type === 'strategy' && subMode === 'weeklySchedule') prompt = buildStrategyWeeklyPrompt(igData, ttData, weekContext, userContext)
    if (type === 'strategy' && subMode === 'eventAngles')    prompt = buildStrategyEventAnglesPrompt(igData, ttData, eventData)
    if (type === 'strategy' && subMode === 'storiesWeek')    prompt = buildStrategyStoriesWeekPrompt(igData, ttData, weekContext, userContext)

    console.log(`[ai:analyze] Calling Claude (${CLAUDE_MODEL})…`)
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: type === 'strategy' ? 8192 : 4096,
        system:     `You are a sharp, direct social media strategist who knows María Luengo (@maryluengog) extremely well. She is a Miami-based lifestyle, fashion, and beauty creator who also owns María Swim. Her content pillars are Fashion (35%), Beauty (30%), Real Life/ADHD (20%), and María Swim (15%). She runs the Blonde Rehab Diaries hair-recovery series and creates relatable ADHD content. Always be concrete, reference real numbers when available, and skip generic filler. CURRENT DATE: ${new Date().toISOString()} — that is ${todayContext()}. Use this as your current date for all references to trends, "this week", "right now", etc.`,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    const claudeData = await claudeRes.json()
    console.log(`[ai:analyze] Claude HTTP status: ${claudeRes.status}`)

    if (claudeData.error) {
      console.error('[ai:analyze] Claude error:', claudeData.error)
      throw new Error(claudeData.error.message || JSON.stringify(claudeData.error))
    }

    const text = claudeData.content?.[0]?.text || ''
    if (!text) throw new Error('Claude returned an empty response.')

    // Strategy mode: parse JSON and return structured data
    if (type === 'strategy') {
      try {
        const parsed = parseJsonFromClaude(text)
        return res.json({ data: parsed })
      } catch (parseErr) {
        console.error('[ai:analyze] JSON parse error:', parseErr.message, '\nRaw:', text.slice(0, 300))
        return res.status(500).json({ error: 'Claude returned malformed JSON. Please try again.' })
      }
    }

    res.json({ text })
  } catch (err) {
    console.error('[ai:analyze] ERROR:', err.message)
    res.status(500).json({ error: err.message })
  }
}
