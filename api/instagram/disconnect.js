'use strict'

const { clearSession } = require('../_utils/cookies')

/**
 * POST /api/instagram/disconnect
 * Expires the ig_session cookie.
 */
module.exports = function handler(req, res) {
  clearSession(res)
  res.json({ success: true })
}
