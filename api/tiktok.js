'use strict'

/**
 * /api/tiktok?action=status|profile|videos|disconnect
 *
 * Consolidates all TikTok data routes into one serverless function.
 * Action is passed via query param: ?action=status|profile|videos|disconnect
 * Disconnect uses POST; all others use GET.
 */

const { getTTSession, clearTTSession } = require('./_utils/tiktok-cookies')

// ── action: status ─────────────────────────────────────────────────────────
function handleStatus(req, res) {
  const session = getTTSession(req)
  res.json({ connected: !!session })
}

// ── action: disconnect ─────────────────────────────────────────────────────
function handleDisconnect(req, res) {
  clearTTSession(res)
  res.json({ success: true })
}

// ── action: profile ────────────────────────────────────────────────────────
async function handleProfile(req, res) {
  const session = getTTSession(req)
  if (!session) return res.status(401).json({ error: 'Not connected. Please reconnect TikTok.' })
  const { accessToken } = session

  try {
    const fields = 'open_id,union_id,avatar_url,display_name,bio_description,follower_count,following_count,likes_count,video_count'
    const data   = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json())

    if (data.error?.code && data.error.code !== 'ok') {
      if (data.error.code === 'access_token_invalid') return res.status(401).json({ error: 'Session expired. Please reconnect TikTok.' })
      return res.status(400).json({ error: data.error.message || data.error.code })
    }
    res.json(data.data?.user || null)
  } catch (err) {
    console.error('[tiktok] profile error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

// ── action: videos ─────────────────────────────────────────────────────────
async function handleVideos(req, res) {
  const session = getTTSession(req)
  if (!session) return res.status(401).json({ error: 'Not connected. Please reconnect TikTok.' })
  const { accessToken } = session

  try {
    const fields = 'id,title,cover_image_url,share_url,video_description,duration,create_time,like_count,comment_count,share_count,view_count'
    const data   = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${fields}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ max_count: 20 }),
    }).then(r => r.json())

    if (data.error?.code && data.error.code !== 'ok') {
      if (data.error.code === 'access_token_invalid') return res.status(401).json({ error: 'Session expired. Please reconnect TikTok.' })
      return res.status(400).json({ error: data.error.message || data.error.code })
    }
    res.json(data.data?.videos || [])
  } catch (err) {
    console.error('[tiktok] videos error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

// ── Main handler ───────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  const action = req.query.action

  if (action === 'status')     return handleStatus(req, res)
  if (action === 'disconnect') return handleDisconnect(req, res)
  if (action === 'profile')    return handleProfile(req, res)
  if (action === 'videos')     return handleVideos(req, res)

  res.status(400).json({ error: `Unknown action "${action}". Use: status, profile, videos, disconnect` })
}
