'use strict'

const crypto = require('crypto')

/**
 * Generate the appsecret_proof required for all server-side Facebook Graph API calls.
 * Formula: HMAC-SHA256(access_token, app_secret) — returned as a hex string.
 *
 * Meta requires this whenever the Graph API is called from a server (not a browser),
 * controlled via App Dashboard → Settings → Advanced → "Require App Secret".
 */
function appSecretProof(accessToken) {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) throw new Error('META_APP_SECRET environment variable is not set')
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex')
}

/**
 * Append access_token and appsecret_proof as query params to a Graph API URL.
 * Accepts either a full URL string or a URLSearchParams-compatible base.
 *
 * @param {string} url          – Graph API URL (may already have query params)
 * @param {string} accessToken  – Page or user access token
 * @returns {string}            – URL with &access_token=...&appsecret_proof=... appended
 */
function withAuth(url, accessToken) {
  const proof = appSecretProof(accessToken)
  const sep   = url.includes('?') ? '&' : '?'
  return `${url}${sep}access_token=${accessToken}&appsecret_proof=${proof}`
}

module.exports = { appSecretProof, withAuth }
