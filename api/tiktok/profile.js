'use strict'

const { getTTSession } = require('../_utils/tiktok-cookies')

/**
 * GET /api/tiktok/profile
 * Fetches the connected user's TikTok profile.
 * Sandbox note: only returns data for sandbox test accounts.
 */
module.exports = async function handler(req, res) {
  const session = getTTSession(req)
  if (!session) return res.status(401).json({ error: 'Not connected. Please reconnect TikTok.' })

  const { accessToken } = session

  try {
    const fields = 'open_id,union_id,avatar_url,display_name,bio_description,follower_count,following_count,likes_count,video_count'
    const ttRes  = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await ttRes.json()

    console.log('[tiktok:profile] HTTP status:', ttRes.status)
    if (data.error?.code && data.error.code !== 'ok') {
      if (data.error.code === 'access_token_invalid') {
        return res.status(401).json({ error: 'Session expired. Please reconnect TikTok.' })
      }
      return res.status(400).json({ error: data.error.message || data.error.code })
    }

    res.json(data.data?.user || null)
  } catch (err) {
    console.error('[tiktok:profile]', err)
    res.status(500).json({ error: err.message })
  }
}
