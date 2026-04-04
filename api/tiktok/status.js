'use strict'

const { getTTSession } = require('../_utils/tiktok-cookies')

/**
 * GET /api/tiktok/status
 * Returns { connected: true/false } so the frontend can check
 * whether a tt_session cookie exists without exposing the token.
 */
module.exports = function handler(req, res) {
  const session = getTTSession(req)
  res.json({ connected: !!session })
}
