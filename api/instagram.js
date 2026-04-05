'use strict'

/**
 * /api/instagram?action=status|profile|media|disconnect
 *
 * Consolidates all Instagram data routes into one serverless function.
 * Action is passed via query param: ?action=status|profile|media|disconnect
 * Disconnect uses POST; all others use GET.
 */

const { getSession, setSession, clearSession } = require('./_utils/cookies')
const { withAuth } = require('./_utils/graph')

const BASE = 'https://graph.facebook.com/v18.0'

// ── action: status ────────────────────────────────────────────────────────────
function handleStatus(req, res) {
  const session = getSession(req)
  res.json({ connected: !!session })
}

// ── action: disconnect ────────────────────────────────────────────────────────
function handleDisconnect(req, res) {
  clearSession(res)
  res.json({ success: true })
}

// ── action: profile ───────────────────────────────────────────────────────────
async function handleProfile(req, res) {
  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not connected. Please reconnect Instagram.' })
  const { accessToken, igUserId } = session

  try {
    const data = await fetch(
      withAuth(
        `${BASE}/${igUserId}?fields=name,username,followers_count,follows_count,media_count,profile_picture_url`,
        accessToken
      )
    ).then(r => r.json())

    if (data.error) {
      if (data.error.code === 190) return res.status(401).json({ error: 'Session expired. Please reconnect Instagram.' })
      return res.status(400).json({ error: data.error.message })
    }
    res.json(data)
  } catch (err) {
    console.error('[instagram] profile error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

// ── action: media ─────────────────────────────────────────────────────────────
async function handleMedia(req, res) {
  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not connected. Please reconnect Instagram.' })
  const { accessToken, igUserId } = session

  try {
    const media = await fetch(
      withAuth(
        `${BASE}/${igUserId}/media` +
        `?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink,media_product_type,is_shared_to_feed` +
        `&limit=30`,
        accessToken
      )
    ).then(r => r.json())

    if (media.error) {
      if (media.error.code === 190) return res.status(401).json({ error: 'Session expired. Please reconnect Instagram.' })
      return res.status(400).json({ error: media.error.message })
    }

    // Log fields of first few posts so we can debug trial reel detection in Vercel logs
    const sample = (media.data || []).slice(0, 4).map(p => ({
      id:                 p.id,
      media_type:         p.media_type,
      media_product_type: p.media_product_type,
      is_shared_to_feed:  p.is_shared_to_feed,
      has_permalink:      !!p.permalink,
      caption_start:      (p.caption || '').slice(0, 40),
    }))
    console.log('[instagram] media sample for trial-reel debug:', JSON.stringify(sample))

    // Enrich each post with per-post insights
    const enriched = await Promise.all(
      (media.data || []).map(async post => {
        try {
          const ins = await fetch(
            withAuth(`${BASE}/${post.id}/insights?metric=reach,impressions,saved`, accessToken)
          ).then(r => r.json())
          const m = {}
          ins.data?.forEach(i => { m[i.name] = i.values?.[0]?.value ?? 0 })
          return { ...post, ...m }
        } catch { return post }
      })
    )

    // Filter out trial reels before returning.
    // Trial reels: is_shared_to_feed is explicitly false, OR a VIDEO with no permalink.
    const filtered = enriched.filter(p => {
      const shared = p.is_shared_to_feed
      if (shared === false || String(shared).toLowerCase() === 'false') {
        console.log(`[instagram] filtering trial reel (is_shared_to_feed=false): ${p.id} "${(p.caption||'').slice(0,40)}"`)
        return false
      }
      if (p.media_type === 'VIDEO' && !p.permalink) {
        console.log(`[instagram] filtering trial reel (VIDEO, no permalink): ${p.id} "${(p.caption||'').slice(0,40)}"`)
        return false
      }
      return true
    })
    console.log(`[instagram] media: ${enriched.length} total → ${filtered.length} after trial-reel filter`)
    res.json({ data: filtered })
  } catch (err) {
    console.error('[instagram] media error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

// ── action: stories ───────────────────────────────────────────────────────────
async function handleStories(req, res) {
  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not connected. Please reconnect Instagram.' })
  const { accessToken, igUserId } = session

  try {
    const data = await fetch(
      withAuth(
        `${BASE}/${igUserId}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp`,
        accessToken
      )
    ).then(r => r.json())

    if (data.error) {
      // Stories may not be available for all account types — return empty gracefully
      console.warn('[instagram] stories warning:', data.error.message)
      return res.json({ data: [] })
    }
    res.json(data)
  } catch (err) {
    console.error('[instagram] stories error:', err.message)
    res.json({ data: [] }) // Non-fatal: return empty array
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  const action = req.query.action

  if (action === 'status')     return handleStatus(req, res)
  if (action === 'disconnect') return handleDisconnect(req, res)
  if (action === 'profile')    return handleProfile(req, res)
  if (action === 'media')      return handleMedia(req, res)
  if (action === 'stories')    return handleStories(req, res)

  res.status(400).json({ error: `Unknown action "${action}". Use: status, profile, media, stories, disconnect` })
}
