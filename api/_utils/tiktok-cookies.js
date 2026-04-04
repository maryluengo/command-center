'use strict'

/**
 * TikTok session cookie helpers.
 * Mirrors the Instagram cookie pattern but uses tt_session and tt_pkce cookies.
 * tt_session  — stores { accessToken, openId, connectedAt }
 * tt_pkce     — temporarily stores the PKCE code_verifier across the redirect
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

function getTTSession(req) {
  const cookies = parseCookies(req)
  if (!cookies.tt_session) return null
  try { return JSON.parse(cookies.tt_session) } catch { return null }
}

function setTTSession(res, data) {
  const val    = encodeURIComponent(JSON.stringify(data))
  const maxAge = 60 * 60 * 24 * 30 // 30 days (TikTok tokens expire sooner)
  // Set session cookie — keep existing ig_session if present
  const existing = res.getHeader('Set-Cookie') || []
  const cookies  = Array.isArray(existing) ? existing : [existing].filter(Boolean)
  cookies.push(`tt_session=${val}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`)
  res.setHeader('Set-Cookie', cookies)
}

function clearTTSession(res) {
  const existing = res.getHeader('Set-Cookie') || []
  const cookies  = Array.isArray(existing) ? existing : [existing].filter(Boolean)
  cookies.push('tt_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/')
  res.setHeader('Set-Cookie', cookies)
}

/** Store PKCE verifier in a short-lived cookie for the callback to read */
function setPKCECookie(res, verifier) {
  const existing = res.getHeader('Set-Cookie') || []
  const cookies  = Array.isArray(existing) ? existing : [existing].filter(Boolean)
  cookies.push(`tt_pkce=${encodeURIComponent(verifier)}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`)
  res.setHeader('Set-Cookie', cookies)
}

function getPKCEVerifier(req) {
  const cookies = parseCookies(req)
  return cookies.tt_pkce ? decodeURIComponent(cookies.tt_pkce) : null
}

function clearPKCECookie(res) {
  const existing = res.getHeader('Set-Cookie') || []
  const cookies  = Array.isArray(existing) ? existing : [existing].filter(Boolean)
  cookies.push('tt_pkce=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/')
  res.setHeader('Set-Cookie', cookies)
}

module.exports = { getTTSession, setTTSession, clearTTSession, setPKCECookie, getPKCEVerifier, clearPKCECookie }
