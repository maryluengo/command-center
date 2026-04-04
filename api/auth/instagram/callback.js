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
    console.log('[instagram:callback] Step 1: exchanging code for short-lived token')
    const tokenUrl = (
      `https://graph.facebook.com/v18.0/oauth/access_token` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${appSecret}` +
      `&code=${code}`
    )
    const tokenRes  = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()
    console.log('[instagram:callback] Step 1 response:', JSON.stringify({ hasToken: !!tokenData.access_token, error: tokenData.error }))
    if (tokenData.error) throw new Error(`[Step 1 – token exchange] ${tokenData.error.message} (code ${tokenData.error.code})`)
    if (!tokenData.access_token) throw new Error('[Step 1] No access_token in response: ' + JSON.stringify(tokenData))

    // ── 2. Exchange for a long-lived token (60 days) ──────────────────────
    console.log('[instagram:callback] Step 2: exchanging for long-lived token')
    const llRes  = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${tokenData.access_token}`
    )
    const llData = await llRes.json()
    console.log('[instagram:callback] Step 2 response:', JSON.stringify({ hasToken: !!llData.access_token, error: llData.error }))
    if (llData.error) throw new Error(`[Step 2 – long-lived token] ${llData.error.message} (code ${llData.error.code})`)
    if (!llData.access_token) throw new Error('[Step 2] No access_token in long-lived response: ' + JSON.stringify(llData))
    const userToken = llData.access_token

    // ── 3. Get Facebook Pages + Instagram account in ONE call ─────────────
    // fields=instagram_business_account avoids a separate per-page API call
    console.log('[instagram:callback] Step 3: fetching Facebook pages with IG account')
    const pagesRes  = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts` +
      `?fields=id,name,access_token,instagram_business_account` +
      `&access_token=${userToken}`
    )
    const pagesData = await pagesRes.json()
    console.log('[instagram:callback] Step 3 response:', JSON.stringify({
      error:     pagesData.error,
      pageCount: pagesData.data?.length,
      pages:     pagesData.data?.map(p => ({ id: p.id, name: p.name, hasToken: !!p.access_token, hasIG: !!p.instagram_business_account })),
    }))

    if (pagesData.error) {
      throw new Error(`[Step 3 – get pages] ${pagesData.error.message} (code ${pagesData.error.code})`)
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error(
        'No Facebook Pages returned. During the Facebook login dialog, ' +
        'make sure you click "Continue as María" and then SELECT your "Mary L" page ' +
        'when Facebook asks which pages to share. ' +
        'Try clicking "Connect Instagram" again — this time make sure to grant access to the Mary L page.'
      )
    }

    // ── 4. Find the page that has an Instagram Business Account ───────────
    console.log('[instagram:callback] Step 4: finding page with Instagram account')
    const pageWithIG = pagesData.data.find(p => p.instagram_business_account?.id)
    const page       = pageWithIG || pagesData.data[0]
    const pageToken  = page.access_token

    if (!pageToken) {
      throw new Error(
        `[Step 4] Page "${page.name}" has no access_token. ` +
        'This usually means the pages_read_engagement permission was not granted.'
      )
    }

    // If the IG account came back inline (best case), use it directly
    let igId = page.instagram_business_account?.id

    // Otherwise fall back to a separate lookup on the page
    if (!igId) {
      console.log('[instagram:callback] Step 4b: no IG account inline, trying separate page lookup')
      const pageRes  = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}` +
        `?fields=instagram_business_account` +
        `&access_token=${pageToken}`
      )
      const pageData = await pageRes.json()
      console.log('[instagram:callback] Step 4b response:', JSON.stringify(pageData))
      if (pageData.error) throw new Error(`[Step 4b] ${pageData.error.message}`)
      igId = pageData.instagram_business_account?.id
    }

    if (!igId) {
      throw new Error(
        `No Instagram Professional account found linked to the "${page.name}" Page. ` +
        'Go to Instagram → Settings → Account → Switch to Professional Account, ' +
        'then go to Instagram → Settings → Account → Linked accounts and link the "Mary L" Facebook Page.'
      )
    }

    // ── 5. Store in httpOnly cookie ───────────────────────────────────────
    console.log('[instagram:callback] Step 5: saving session for igUserId:', igId)
    setSession(res, { accessToken: pageToken, igUserId: igId, connectedAt: Date.now() })

    res.redirect(302, `${APP_ORIGIN}/?instagram_connected=1`)
  } catch (err) {
    console.error('[instagram:callback] ERROR:', err.message)
    res.redirect(302, `${APP_ORIGIN}/?instagram_error=${encodeURIComponent(err.message)}`)
  }
}
