'use strict'

const { getSession } = require('../_utils/cookies')

/**
 * GET /api/instagram/profile
 * Proxies the Instagram profile request using the stored page token.
 * Returns: name, username, followers_count, follows_count, media_count, profile_picture_url
 */
module.exports = async function handler(req, res) {
  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not connected. Please reconnect Instagram.' })

  const { accessToken, igUserId } = session

  try {
    const url    = `https://graph.facebook.com/v18.0/${igUserId}?fields=name,username,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`
    const igRes  = await fetch(url)
    const data   = await igRes.json()

    if (data.error) {
      // Token may be expired
      if (data.error.code === 190) {
        return res.status(401).json({ error: 'Session expired. Please reconnect Instagram.' })
      }
      return res.status(400).json({ error: data.error.message })
    }

    res.json(data)
  } catch (err) {
    console.error('[instagram:profile]', err)
    res.status(500).json({ error: err.message })
  }
}
