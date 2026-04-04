'use strict'

const { getSession }   = require('../_utils/cookies')
const { withAuth }     = require('../_utils/graph')
const { getTTSession } = require('../_utils/tiktok-cookies')

const CLAUDE_MODEL = 'claude-opus-4-5'
const IG_BASE      = 'https://graph.facebook.com/v18.0'

// ─────────────────────────────────────────────────────────────────────────────
// Data fetchers — read tokens from cookies and call the platform APIs directly
// (avoids internal HTTP hops between Vercel functions)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchIGData(req) {
  const session = getSession(req)
  if (!session) return null
  const { accessToken, igUserId } = session

  try {
    // Profile
    const profileRes = await fetch(
      withAuth(`${IG_BASE}/${igUserId}?fields=name,username,followers_count,media_count`, accessToken)
    )
    const profile = await profileRes.json()
    if (profile.error) return null

    // Recent media + insights
    const mediaRes = await fetch(
      withAuth(
        `${IG_BASE}/${igUserId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count&limit=20`,
        accessToken
      )
    )
    const media = await mediaRes.json()
    if (media.error) return { profile, media: { data: [] } }

    // Enrich with reach/saves
    const enriched = await Promise.all(
      (media.data || []).map(async post => {
        try {
          const ins = await fetch(
            withAuth(`${IG_BASE}/${post.id}/insights?metric=reach,saved`, accessToken)
          )
          const insData = await ins.json()
          const m = {}
          insData.data?.forEach(i => { m[i.name] = i.values?.[0]?.value ?? 0 })
          return { ...post, ...m }
        } catch { return post }
      })
    )

    return { profile, media: { data: enriched } }
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
    const fields   = 'open_id,avatar_url,display_name,follower_count,likes_count,video_count'
    const profRes  = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
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
// Prompt builders
// ─────────────────────────────────────────────────────────────────────────────

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

  return `You are analyzing real performance data for María Luengo (@maryluengog), a Miami-based lifestyle and fashion creator who also owns the swimwear brand María Swim.

Here is her recent content performance data:

${igSummary}

${ttSummary}

Please analyze this data and provide specific, actionable insights structured as follows:

## What's Working
- Which content themes or topics are getting the most engagement (reference specific posts)
- Which formats (video vs static, post types) perform best
- Best days/times to post based on when high-performing posts went live
- Caption length or style that correlates with better engagement

## What's Not Working
- Patterns in underperforming posts
- What to avoid or reduce

## Top 3 Actionable Recommendations
Specific, concrete things she should do this week — based purely on her data, not generic advice.

Reference actual numbers from the data. Be direct, specific, and data-driven.`
}

function buildTrendingPrompt() {
  return `You are a social media strategist advising María Luengo (@maryluengog), a Miami-based lifestyle, fashion, and beauty creator who also owns a swimwear brand called María Swim. She posts on both Instagram and TikTok.

Her content pillars are: Fashion, Beauty, Real Life (lifestyle/Miami), and María Swim.

Give her a specific, current trend report she can act on immediately:

## Trending TikTok Formats Right Now
3-4 specific video formats or trends performing well in fashion, beauty, and lifestyle niches — with a hook/concept she can execute

## Trending Instagram Reel Formats
3-4 specific reel formats trending right now for lifestyle and fashion creators, especially ones working for Miami-based creators

## Trending Topics in Her Niches
- **Fashion:** specific aesthetics, moments, or micro-trends to tap into
- **Beauty:** trending routines, products, looks, or techniques
- **Swimwear/Beach:** seasonal and evergreen content performing well
- **Miami Lifestyle:** what's trending locally and resonating globally

## Content Hooks That Are Working Right Now
5 specific opening hooks or video concepts (first 1-3 seconds) that are performing well in her niche

## What Similar Creators Are Doing Successfully
What creators in fashion/beauty/lifestyle at the 10k–150k follower range are doing right now that's working

Be specific and practical — give her real concepts she can film next week, not vague categories.`
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
    !igData && !ttData ? 'No analytics connected — base ideas on best practices for her niche and audience size.' : null,
  ].filter(Boolean).join('\n')

  return `Generate 6 specific, fresh content ideas for María Luengo (@maryluengog).

Creator profile:
- Name: María Luengo
- Instagram + TikTok: @maryluengog
- Location: Miami, Florida
- Brand: María Swim (swimwear line)
- Content pillars: Fashion, Beauty, Real Life (Miami lifestyle), María Swim
- Analytics context:
${dataContext}

Generate exactly 6 ideas. Use this EXACT format for each:

### Idea [number]: [Specific, catchy title]
**Platform:** [Instagram Reel / Instagram Carousel / TikTok / Both]
**Pillar:** [Fashion / Beauty / Real Life / María Swim]
**Effort:** [Quick (under 1hr) / Half Day / Full Day]
**Script Outline:**
[3-5 bullet points describing the video or post structure]
**What I Need:** [specific props, outfits, locations, people needed]
**Why It Works:** [one specific reason tied to her data or a current trend — 1-2 sentences max]

Rules:
- Mix platforms: include at least 2 Instagram-only, 2 TikTok-only, 2 that work on both
- Mix pillars: all 4 pillars should appear at least once
- Mix effort levels: at least 2 Quick ideas
- Make every idea specific and immediately filmable — no vague concepts
- Ideas should feel fresh and native to each platform's current style`
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/analyze
 * Body: { type: 'working' | 'trending' | 'ideas' }
 *
 * Reads ig_session / tt_session cookies, fetches real platform data,
 * builds the appropriate prompt, calls Claude, and returns { text }.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured.' })
  }

  const { type } = req.body || {}
  if (!['working', 'trending', 'ideas'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be: working, trending, or ideas.' })
  }

  console.log(`[ai:analyze] type=${type}`)

  try {
    // ── Fetch platform data (only needed for working + ideas) ─────────────
    let igData = null
    let ttData = null

    if (type === 'working' || type === 'ideas') {
      ;[igData, ttData] = await Promise.all([fetchIGData(req), fetchTTData(req)])
      console.log(`[ai:analyze] Data fetched — IG: ${!!igData}, TT: ${!!ttData}`)
    }

    // ── Build prompt ──────────────────────────────────────────────────────
    let prompt
    if (type === 'working')  prompt = buildWhatsWorkingPrompt(igData, ttData)
    if (type === 'trending') prompt = buildTrendingPrompt()
    if (type === 'ideas')    prompt = buildIdeasPrompt(igData, ttData)

    // ── Call Claude ───────────────────────────────────────────────────────
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
        max_tokens: 4096,
        system:     'You are a sharp, direct social media strategist who gives María Luengo (@maryluengog) specific, data-driven advice. She is a Miami-based lifestyle, fashion, and beauty creator who also owns María Swim. You know her well. Always be concrete, reference real numbers when available, and skip generic filler.',
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

    res.json({ text })

  } catch (err) {
    console.error('[ai:analyze] ERROR:', err.message)
    res.status(500).json({ error: err.message })
  }
}
