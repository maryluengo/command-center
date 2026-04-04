'use strict'

const { getSession } = require('../_utils/cookies')
const { withAuth }   = require('../_utils/graph')

const BASE = 'https://graph.facebook.com/v18.0'

/**
 * GET /api/instagram/media
 * Returns the 20 most recent posts with per-post insights (reach, impressions, saved).
 * All Graph API calls include appsecret_proof via withAuth().
 */
module.exports = async function handler(req, res) {
  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not connected. Please reconnect Instagram.' })

  const { accessToken, igUserId } = session

  try {
    // ── Fetch recent media ────────────────────────────────────────────────
    const mediaRes = await fetch(
      withAuth(
        `${BASE}/${igUserId}/media` +
        `?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count` +
        `&limit=20`,
        accessToken
      )
    )
    const media = await mediaRes.json()

    if (media.error) {
      if (media.error.code === 190) {
        return res.status(401).json({ error: 'Session expired. Please reconnect Instagram.' })
      }
      return res.status(400).json({ error: media.error.message })
    }

    // ── Enrich each post with insights (reach, impressions, saved) ────────
    const enriched = await Promise.all(
      (media.data || []).map(async post => {
        try {
          const insRes = await fetch(
            withAuth(
              `${BASE}/${post.id}/insights?metric=reach,impressions,saved`,
              accessToken
            )
          )
          const ins = await insRes.json()
          const m   = {}
          ins.data?.forEach(i => { m[i.name] = i.values?.[0]?.value ?? 0 })
          return { ...post, ...m }
        } catch {
          return post // Return post without insights if that individual call fails
        }
      })
    )

    res.json({ data: enriched })
  } catch (err) {
    console.error('[instagram:media]', err)
    res.status(500).json({ error: err.message })
  }
}
