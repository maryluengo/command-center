'use strict'

const { getSession } = require('../_utils/cookies')

/**
 * GET /api/instagram/status
 * Returns { connected: true/false } – used by the frontend to check
 * whether an ig_session cookie exists without exposing the token.
 */
module.exports = function handler(req, res) {
  const session = getSession(req)
  res.json({ connected: !!session })
}
