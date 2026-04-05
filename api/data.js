'use strict'

/**
 * GET  /api/data  — returns all synced app data
 * POST /api/data  — saves all synced app data
 *
 * Storage backend: GitHub Gist (free, private, reliable)
 *
 * Setup (one-time):
 *   1. Go to https://github.com/settings/tokens/new
 *      → give it "Gist" scope only → copy the token
 *   2. Go to https://gist.github.com → New gist (secret) →
 *      filename: command-center-data.json, content: {}  → Create
 *      → copy the Gist ID from the URL
 *   3. In Vercel dashboard → Project → Settings → Environment Variables:
 *        GITHUB_TOKEN  =  ghp_xxxxxxxxxxxx
 *        GITHUB_GIST_ID = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   4. Redeploy. Sync will activate automatically.
 */

const TOKEN   = process.env.GITHUB_TOKEN
const GIST_ID = process.env.GITHUB_GIST_ID
const FILE    = 'command-center-data.json'

async function gistFetch(path, opts = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization:  `token ${TOKEN}`,
      Accept:         'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent':   'command-center-app',
      ...(opts.headers || {}),
    },
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // If env vars are not set, signal "not configured" — app still works locally
  if (!TOKEN || !GIST_ID) {
    if (req.method === 'GET') return res.json({ data: null, configured: false })
    return res.status(503).json({ error: 'Sync not configured. Set GITHUB_TOKEN and GITHUB_GIST_ID.' })
  }

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const r = await gistFetch(`/gists/${GIST_ID}`)
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        console.error('[data] GET gist error:', r.status, e.message)
        return res.json({ data: null, configured: true, error: `GitHub ${r.status}` })
      }
      const gist    = await r.json()
      const file    = gist.files?.[FILE]
      if (!file)    return res.json({ data: null, configured: true })
      // Handle truncated files (> 1MB — unlikely for this app)
      const content = file.truncated
        ? await (await fetch(file.raw_url)).text()
        : (file.content || '{}')
      const data = JSON.parse(content)
      return res.json({ data, configured: true })
    } catch (err) {
      console.error('[data] GET error:', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { data } = req.body || {}
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Missing or invalid data object.' })
      }
      const r = await gistFetch(`/gists/${GIST_ID}`, {
        method: 'PATCH',
        body:   JSON.stringify({
          files: { [FILE]: { content: JSON.stringify(data) } },
        }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        console.error('[data] POST gist error:', r.status, e.message)
        return res.status(r.status).json({ error: e.message || `GitHub ${r.status}` })
      }
      console.log('[data] saved successfully')
      return res.json({ ok: true })
    } catch (err) {
      console.error('[data] POST error:', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
