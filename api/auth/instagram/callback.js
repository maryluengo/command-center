'use strict'

const { setSession } = require('../../_utils/cookies')
const { withAuth }   = require('../../_utils/graph')

const REDIRECT_URI = 'https://command-center-sigma-sable.vercel.app/api/auth/instagram/callback'
const APP_ORIGIN   = 'https://command-center-sigma-sable.vercel.app'

module.exports = async function handler(req, res) {
  const { code, error, error_description } = req.query

  // ── Log every incoming request ───────────────────────────────────────────
  console.log('[callback] ▶ Request received')
  console.log('[callback] Query params:', JSON.stringify({
    hasCode:           !!code,
    codePrefix:        code ? code.slice(0, 12) + '...' : null,
    error:             error             || null,
    error_description: error_description || null,
  }))

  if (error || !code) {
    const msg = encodeURIComponent(error_description || error || 'Instagram auth failed')
    console.log('[callback] ✗ No code / OAuth error, redirecting with error')
    return res.redirect(302, `${APP_ORIGIN}/?instagram_error=${msg}`)
  }

  const appId     = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  console.log('[callback] Env check:', { hasAppId: !!appId, hasAppSecret: !!appSecret })

  if (!appId || !appSecret) {
    return res.redirect(302, `${APP_ORIGIN}/?instagram_error=${encodeURIComponent('Server credentials not configured')}`)
  }

  try {
    // ── STEP 1: Exchange code → short-lived user token ───────────────────
    console.log('[callback] ── Step 1: short-lived token exchange')
    const step1Url = (
      `https://graph.facebook.com/v18.0/oauth/access_token` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${appSecret}` +
      `&code=${code}`
    )
    const tokenRes  = await fetch(step1Url)
    const tokenData = await tokenRes.json()
    console.log('[callback] Step 1 HTTP status:', tokenRes.status)
    console.log('[callback] Step 1 response:', JSON.stringify({
      ...tokenData,
      access_token: tokenData.access_token ? tokenData.access_token.slice(0, 20) + '…[redacted]' : undefined,
    }))

    if (tokenData.error) {
      console.log('[callback] ✗ Step 1 error:', JSON.stringify(tokenData.error))
      throw new Error(`[Step 1] ${tokenData.error.message} (code ${tokenData.error.code}, subcode ${tokenData.error.error_subcode})`)
    }
    if (!tokenData.access_token) throw new Error('[Step 1] Response has no access_token: ' + JSON.stringify(tokenData))

    // ── STEP 2: Exchange short-lived → long-lived token (60 days) ────────
    console.log('[callback] ── Step 2: long-lived token exchange')
    const llRes  = await fetch(
      withAuth(
        `https://graph.facebook.com/v18.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${tokenData.access_token}`,
        tokenData.access_token
      )
    )
    const llData = await llRes.json()
    console.log('[callback] Step 2 HTTP status:', llRes.status)
    console.log('[callback] Step 2 response:', JSON.stringify({
      ...llData,
      access_token: llData.access_token ? llData.access_token.slice(0, 20) + '…[redacted]' : undefined,
    }))

    if (llData.error) {
      console.log('[callback] ✗ Step 2 error:', JSON.stringify(llData.error))
      throw new Error(`[Step 2] ${llData.error.message} (code ${llData.error.code})`)
    }
    if (!llData.access_token) throw new Error('[Step 2] Response has no access_token: ' + JSON.stringify(llData))
    const userToken = llData.access_token

    // ── STEP 3: /me/accounts — get Facebook Pages ─────────────────────────
    console.log('[callback] ── Step 3: GET /me/accounts')
    const pagesUrl = withAuth(
      `https://graph.facebook.com/v18.0/me/accounts` +
      `?fields=id,name,access_token,instagram_business_account`,
      userToken
    )
    const pagesRes  = await fetch(pagesUrl)
    const pagesData = await pagesRes.json()
    console.log('[callback] Step 3 HTTP status:', pagesRes.status)
    // Log the FULL response (redact page tokens)
    console.log('[callback] Step 3 FULL response:', JSON.stringify({
      ...pagesData,
      data: pagesData.data?.map(p => ({
        id:                        p.id,
        name:                      p.name,
        hasAccessToken:            !!p.access_token,
        accessTokenPrefix:         p.access_token ? p.access_token.slice(0, 15) + '…' : null,
        instagram_business_account: p.instagram_business_account ?? null,
        tasks:                     p.tasks ?? null,
        category:                  p.category ?? null,
      })),
      paging: pagesData.paging ?? null,
    }))

    if (pagesData.error) {
      console.log('[callback] ✗ Step 3 error:', JSON.stringify(pagesData.error))
      throw new Error(`[Step 3] ${pagesData.error.message} (code ${pagesData.error.code})`)
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('[callback] ✗ Step 3: pages array is empty — user did not select a page during OAuth')
      throw new Error(
        'No Facebook Pages returned. During the Facebook login dialog, ' +
        'make sure you SELECT your "Mary L" page when Facebook asks which pages to share. ' +
        'Try connecting again and grant access to the Mary L page.'
      )
    }

    // ── STEP 4: Resolve Instagram Business Account ID ─────────────────────
    console.log('[callback] ── Step 4: resolving Instagram account')
    const pageWithIG = pagesData.data.find(p => p.instagram_business_account?.id)
    const page       = pageWithIG || pagesData.data[0]
    const pageToken  = page.access_token
    console.log('[callback] Selected page:', { id: page.id, name: page.name, hasToken: !!pageToken, igInline: !!page.instagram_business_account?.id })

    if (!pageToken) {
      throw new Error(`[Step 4] Page "${page.name}" has no access_token (pages_read_engagement may not have been granted)`)
    }

    let igId = page.instagram_business_account?.id

    if (!igId) {
      console.log('[callback] Step 4b: IG account not inline, doing separate lookup')
      const pageRes  = await fetch(
        withAuth(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account`, pageToken)
      )
      const pageData = await pageRes.json()
      console.log('[callback] Step 4b HTTP status:', pageRes.status)
      console.log('[callback] Step 4b response:', JSON.stringify(pageData))
      if (pageData.error) throw new Error(`[Step 4b] ${pageData.error.message} (code ${pageData.error.code})`)
      igId = pageData.instagram_business_account?.id
    }

    if (!igId) {
      console.log('[callback] ✗ Step 4: no Instagram Professional account found on page:', page.name)
      throw new Error(
        `No Instagram Professional account linked to "${page.name}". ` +
        'Go to Instagram → Settings → Account → Switch to Professional Account, ' +
        'then link it to your Mary L Facebook Page.'
      )
    }

    // ── STEP 5: Save session ──────────────────────────────────────────────
    console.log('[callback] ── Step 5: saving session, igUserId:', igId)
    setSession(res, { accessToken: pageToken, igUserId: igId, connectedAt: Date.now() })
    console.log('[callback] ✓ Success — redirecting to app')
    res.redirect(302, `${APP_ORIGIN}/?instagram_connected=1`)

  } catch (err) {
    console.error('[callback] ✗ FATAL ERROR:', err.message)
    res.redirect(302, `${APP_ORIGIN}/?instagram_error=${encodeURIComponent(err.message)}`)
  }
}
