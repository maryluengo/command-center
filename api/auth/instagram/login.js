'use strict'

const REDIRECT_URI = 'https://command-center-sigma-sable.vercel.app/api/auth/instagram/callback'
const SCOPE = 'pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights,business_management'

/**
 * GET /api/auth/instagram/login
 * Redirects the user to the Facebook OAuth dialog.
 * auth_type=rerequest forces Facebook to re-show ALL permission steps
 * including the page-selection dialog, even if the user previously authorized.
 */
module.exports = function handler(req, res) {
  const appId = process.env.META_APP_ID
  if (!appId) {
    return res.status(500).send('META_APP_ID environment variable is not configured.')
  }

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
  authUrl.searchParams.set('client_id',     appId)
  authUrl.searchParams.set('redirect_uri',  REDIRECT_URI)
  authUrl.searchParams.set('scope',         SCOPE)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('auth_type',     'rerequest') // Force re-show permissions + page selection

  res.redirect(302, authUrl.toString())
}
