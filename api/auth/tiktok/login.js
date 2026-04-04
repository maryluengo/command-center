'use strict'

const crypto = require('crypto')
const { setPKCECookie } = require('../../_utils/tiktok-cookies')

const REDIRECT_URI = 'https://command-center-sigma-sable.vercel.app/api/auth/tiktok/callback'
// video.list is the only scope needed to read video metrics
// user.info.basic gives us profile (display name, avatar, follower count)
// NOTE: In Sandbox mode TikTok only grants scopes pre-approved in the dev portal
const SCOPE = 'user.info.basic,video.list'

/**
 * GET /api/auth/tiktok/login
 *
 * Builds a PKCE challenge, stores the verifier in a short-lived httpOnly cookie,
 * then redirects to TikTok's OAuth dialog.
 *
 * TikTok requires PKCE for all OAuth flows (even server-side).
 * code_verifier  = 32 random bytes as base64url
 * code_challenge = SHA-256(verifier) as base64url
 */
module.exports = function handler(req, res) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  if (!clientKey) {
    return res.status(500).send('TIKTOK_CLIENT_KEY environment variable is not configured.')
  }

  // ── PKCE ──────────────────────────────────────────────────────────────────
  const codeVerifier  = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  const state         = crypto.randomBytes(16).toString('hex')

  // Store verifier + state in a short-lived httpOnly cookie (expires in 5 min)
  setPKCECookie(res, JSON.stringify({ verifier: codeVerifier, state }))

  // ── Build auth URL ─────────────────────────────────────────────────────────
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/')
  authUrl.searchParams.set('client_key',             clientKey)
  authUrl.searchParams.set('response_type',          'code')
  authUrl.searchParams.set('scope',                  SCOPE)
  authUrl.searchParams.set('redirect_uri',           REDIRECT_URI)
  authUrl.searchParams.set('state',                  state)
  authUrl.searchParams.set('code_challenge',         codeChallenge)
  authUrl.searchParams.set('code_challenge_method',  'S256')

  console.log('[tiktok:login] Redirecting to TikTok OAuth, state:', state)
  res.redirect(302, authUrl.toString())
}
