'use strict'

const { clearTTSession } = require('../_utils/tiktok-cookies')

/**
 * POST /api/tiktok/disconnect
 * Expires the tt_session cookie.
 */
module.exports = function handler(req, res) {
  clearTTSession(res)
  res.json({ success: true })
}
