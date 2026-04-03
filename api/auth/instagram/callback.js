'use strict'

const { setSession } = require('../../_utils/cookies')

const REDIRECT_URI = 'https://command-center-sigma-sable.vercel.app/api/auth/instagram/callback'
const APP_ORIGIN   = 'https://command-center-sigma-sable.vercel.app'

/**
 * GET /api/auth/instagram/callback
 * Facebook redirects here after the user authorises the app.
 * Exchanges the code for a long-lived token, resolves the IG business
 * account, stores everything in an httpOnly cookie, then redirects back.
 */
module.exports = async function handler(req, res) {
  const { code, error, error_description } = req.query

  if (error || !code) {
    const msg = encodeURIComponent(error_description || error || 'Instagram auth failed')
    return res.redirect(302, `${APP_ORIGIN}/?instagram_error=${msg}`)
  }

  const appId     = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    return res.redirect(302, `${APP_ORIGIN}/?instagram_error=${encodeURIComponent('Server credentials not configured')}`)
  }

  try {
    // ── 1. Exchange code for a short-lived user token ─────────────────────
    const tokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${appSecret}` +
      `&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)

    // ── 2. Exchange for a long-lived token (60 days) ──────────────────────
    const llRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${tokenData.access_token}`
    )
    const llData = await llRes.json()
    if (llData.error) throw new Error(llData.error.message)
    const userToken = llData.access_token

    // ── 3. Get Facebook Pages ─────────────────────────────────────────────
    const pagesRes  = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}`)
    const pagesData = await pagesRes.json()
    if (pagesData.error) throw new Error(pagesData.error.message)
    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook Page found. Please connect a Page to your account in Meta Business settings.')
    }

    const page      = pagesData.data[0]
    const pageToken = page.access_token

    // ── 4. Get Instagram Business Account ID ─────────────────────────────
    const pageRes  = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`)
    const pageData = await pageRes.json()
    if (pageData.error) throw new Error(pageData.error.message)

    const igId = pageData.instagram_business_account?.id
    if (!igId) {
      throw new Error(
        'No Instagram Professional account linked to this Page. ' +
        'Go to Instagram → Settings → Account type → Switch to Professional Account, then link it to your Facebook Page.'
      )
    }

    // ── 5. Store in httpOnly cookie ───────────────────────────────────────
    setSession(res, { accessToken: pageToken, igUserId: igId, connectedAt: Date.now() })

    res.redirect(302, `${APP_ORIGIN}/?instagram_connected=1`)
  } catch (err) {
    console.error('[instagram:callback]', err)
    res.redirect(302, `${APP_ORIGIN}/?instagram_error=${encodeURIComponent(err.message)}`)
  }
}
