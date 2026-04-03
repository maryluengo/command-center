'use strict'

/**
 * Parse cookies from the request header into a key/value object.
 */
function parseCookies(req) {
  const header = req.headers.cookie || ''
  return Object.fromEntries(
    header
      .split(';')
      .map(c => c.trim().split('='))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k.trim(), decodeURIComponent(v.join('='))])
  )
}

/**
 * Read and parse the ig_session cookie (returns null if missing/invalid).
 */
function getSession(req) {
  const cookies = parseCookies(req)
  if (!cookies.ig_session) return null
  try { return JSON.parse(cookies.ig_session) } catch { return null }
}

/**
 * Write the ig_session cookie with secure flags.
 * @param {object} data – { accessToken, igUserId, connectedAt }
 */
function setSession(res, data) {
  const val    = encodeURIComponent(JSON.stringify(data))
  const maxAge = 60 * 60 * 24 * 60 // 60 days
  res.setHeader(
    'Set-Cookie',
    `ig_session=${val}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`
  )
}

/**
 * Expire the ig_session cookie.
 */
function clearSession(res) {
  res.setHeader(
    'Set-Cookie',
    'ig_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/'
  )
}

module.exports = { parseCookies, getSession, setSession, clearSession }
