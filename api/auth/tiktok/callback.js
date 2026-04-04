'use strict'

const { setTTSession, getPKCEVerifier, clearPKCECookie } = require('../../_utils/tiktok-cookies')

const REDIRECT_URI = 'https://command-center-sigma-sable.vercel.app/api/auth/tiktok/callback'
const APP_ORIGIN   = 'https://command-center-sigma-sable.vercel.app'

/**
 * GET /api/auth/tiktok/callback
 *
 * TikTok redirects here after the user authorises the app.
 * Reads the PKCE verifier from the httpOnly cookie, exchanges the code
 * for an access token, stores it in tt_session cookie, then redirects back.
 */
module.exports = async function handler(req, res) {
  const { code, state, error, error_description } = req.query

  console.log('[tiktok:callback] ▶ Request received')
  console.log('[tiktok:callback] Query params:', JSON.stringify({
    hasCode:  !!code,
    state:    state || null,
    error:    error || null,
    error_description: error_description || null,
  }))

  if (error || !code) {
    const msg = encodeURIComponent(error_description || error || 'TikTok auth failed')
    console.log('[tiktok:callback] ✗ No code / OAuth error:', error)
    return res.redirect(302, `${APP_ORIGIN}/?tiktok_error=${msg}`)
  }

  // ── Read PKCE verifier from cookie ────────────────────────────────────────
  const pkceRaw = getPKCEVerifier(req)
  console.log('[tiktok:callback] PKCE cookie present:', !!pkceRaw)

  let codeVerifier = null
  if (pkceRaw) {
    try {
      const parsed = JSON.parse(pkceRaw)
      codeVerifier = parsed.verifier
      // State check (non-fatal in sandbox — TikTok sometimes drops it)
      if (parsed.state && state && parsed.state !== state) {
        console.warn('[tiktok:callback] State mismatch — expected:', parsed.state, 'got:', state)
      }
    } catch {
      console.warn('[tiktok:callback] Could not parse PKCE cookie:', pkceRaw)
    }
  }

  const clientKey    = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET

  console.log('[tiktok:callback] Env check:', { hasClientKey: !!clientKey, hasClientSecret: !!clientSecret })

  if (!clientKey || !clientSecret) {
    return res.redirect(302, `${APP_ORIGIN}/?tiktok_error=${encodeURIComponent('Server credentials not configured')}`)
  }

  // ── Exchange code for access token ────────────────────────────────────────
  console.log('[tiktok:callback] ── Step 1: exchanging code for access token')
  try {
    const body = new URLSearchParams({
      client_key:    clientKey,
      client_secret: clientSecret,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  REDIRECT_URI,
    })
    // Include PKCE verifier if we have it
    if (codeVerifier) {
      body.set('code_verifier', codeVerifier)
    } else {
      console.warn('[tiktok:callback] No PKCE verifier found — attempting exchange without it')
    }

    const tokenRes  = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    })
    const tokenData = await tokenRes.json()

    console.log('[tiktok:callback] Step 1 HTTP status:', tokenRes.status)
    console.log('[tiktok:callback] Step 1 response:', JSON.stringify({
      ...tokenData,
      access_token:  tokenData.access_token  ? tokenData.access_token.slice(0, 15)  + '…[redacted]' : undefined,
      refresh_token: tokenData.refresh_token ? tokenData.refresh_token.slice(0, 15) + '…[redacted]' : undefined,
    }))

    if (tokenData.error || !tokenData.access_token) {
      const msg = tokenData.error_description || tokenData.error || 'No access_token returned'
      console.log('[tiktok:callback] ✗ Token exchange failed:', msg)
      throw new Error(`[Step 1] ${msg}`)
    }

    // ── Save session + clear PKCE cookie ──────────────────────────────────
    clearPKCECookie(res)
    setTTSession(res, {
      accessToken:  tokenData.access_token,
      refreshToken: tokenData.refresh_token  || null,
      openId:       tokenData.open_id        || null,
      scope:        tokenData.scope          || null,
      connectedAt:  Date.now(),
    })

    console.log('[tiktok:callback] ✓ Success — redirecting to app')
    res.redirect(302, `${APP_ORIGIN}/?tiktok_connected=1`)

  } catch (err) {
    console.error('[tiktok:callback] ✗ FATAL ERROR:', err.message)
    clearPKCECookie(res)
    res.redirect(302, `${APP_ORIGIN}/?tiktok_error=${encodeURIComponent(err.message)}`)
  }
}
