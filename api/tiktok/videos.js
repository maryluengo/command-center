'use strict'

const { getTTSession } = require('../_utils/tiktok-cookies')

/**
 * GET /api/tiktok/videos
 * Returns up to 20 recent videos with metrics.
 * Sandbox note: only returns videos from sandbox test accounts.
 */
module.exports = async function handler(req, res) {
  const session = getTTSession(req)
  if (!session) return res.status(401).json({ error: 'Not connected. Please reconnect TikTok.' })

  const { accessToken } = session

  try {
    const fields = 'id,title,cover_image_url,share_url,video_description,duration,create_time,like_count,comment_count,share_count,view_count'
    const ttRes  = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${fields}`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 20 }),
    })
    const data = await ttRes.json()

    console.log('[tiktok:videos] HTTP status:', ttRes.status)
    console.log('[tiktok:videos] Response error field:', data.error?.code || 'none')

    if (data.error?.code && data.error.code !== 'ok') {
      if (data.error.code === 'access_token_invalid') {
        return res.status(401).json({ error: 'Session expired. Please reconnect TikTok.' })
      }
      return res.status(400).json({ error: data.error.message || data.error.code })
    }

    res.json(data.data?.videos || [])
  } catch (err) {
    console.error('[tiktok:videos]', err)
    res.status(500).json({ error: err.message })
  }
}
