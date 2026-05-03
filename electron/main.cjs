'use strict'

const { app, BrowserWindow, ipcMain } = require('electron')
const path   = require('path')
const fs     = require('fs')
const http   = require('http')
const urlMod = require('url')
const crypto = require('crypto')

const isDev = !app.isPackaged

// ─────────────── Token Storage ───────────────
function tokensFilePath() {
  return path.join(app.getPath('userData'), 'tokens.json')
}
function loadTokens() {
  try {
    const p = tokensFilePath()
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {}
  return {}
}
function saveTokens(tokens) {
  fs.writeFileSync(tokensFilePath(), JSON.stringify(tokens, null, 2))
}

// ─────────────── Credentials (loaded from config.json — never commit that file) ───────────────
let _cfg = {}
try {
  _cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'))
} catch (e) {
  console.warn('[config] Could not load electron/config.json:', e.message)
}

const IG_APP_ID     = _cfg.instagram?.appId     || ''
const IG_APP_SECRET = _cfg.instagram?.appSecret || ''
const IG_PORT       = 8788
const IG_REDIRECT   = `http://127.0.0.1:${IG_PORT}/callback`

const TT_CLIENT_KEY    = _cfg.tiktok?.clientKey    || ''
const TT_CLIENT_SECRET = _cfg.tiktok?.clientSecret || ''
const TT_PORT          = 8789
const TT_REDIRECT      = `http://127.0.0.1:${TT_PORT}/callback`

const CLAUDE_API_KEY = _cfg.claude?.apiKey || ''
const CLAUDE_MODEL   = 'claude-opus-4-7'

// ─────────────── Helpers ───────────────
async function apiFetch(url, opts = {}) {
  const res  = await fetch(url, opts)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data
}

function successPage() {
  return '<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#FBF7FF"><h2 style="color:#C4AAED">✨ Connected!</h2><p style="color:#7A6A90">You can close this window.</p><script>setTimeout(()=>window.close(),1000)</script></body></html>'
}

// ─────────────── Window ───────────────
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    center: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#FBF7FF',
    title: 'Command Center',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL('https://command-center-sigma-sable.vercel.app')
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─────────────── IPC: Tokens ───────────────
ipcMain.handle('tokens:get', () => {
  const t = loadTokens()
  // Return only metadata (not secrets) to renderer
  return {
    instagram: t.instagram ? { connected: true, connectedAt: t.instagram.connectedAt } : null,
    tiktok:    t.tiktok    ? { connected: true, connectedAt: t.tiktok.connectedAt }    : null,
  }
})

ipcMain.handle('tokens:clear', (_, platform) => {
  const t = loadTokens()
  delete t[platform]
  saveTokens(t)
  return true
})

// ─────────────── IPC: Instagram OAuth ───────────────
ipcMain.handle('instagram:auth', () => {
  return new Promise((resolve, reject) => {
    let authWindow = null

    const server = http.createServer(async (req, res) => {
      const parsed = urlMod.parse(req.url, true)
      if (parsed.pathname !== '/callback') return

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(successPage())
      server.close()
      if (authWindow && !authWindow.isDestroyed()) authWindow.close()

      const code = parsed.query.code
      if (!code) return reject(new Error(parsed.query.error_description || 'Instagram auth failed'))

      try {
        // Short-lived token
        const tokenData = await apiFetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(IG_REDIRECT)}&client_secret=${IG_APP_SECRET}&code=${code}`
        )
        // Long-lived token
        const llData = await apiFetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${IG_APP_ID}&client_secret=${IG_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
        )
        const accessToken = llData.access_token

        // Get Facebook pages
        const pages = await apiFetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`)
        if (!pages.data || pages.data.length === 0) {
          throw new Error('No Facebook Page found. Please connect a Facebook Page to your account in Meta Business settings.')
        }

        // Use first page token for Instagram access
        const page       = pages.data[0]
        const pageToken  = page.access_token

        // Get Instagram Business Account ID
        const pageData = await apiFetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`)
        const igId     = pageData.instagram_business_account?.id
        if (!igId) throw new Error('No Instagram Professional account found linked to this Page. Go to Instagram → Settings → Account type → Switch to Professional Account.')

        const tokens = loadTokens()
        tokens.instagram = { accessToken: pageToken, igUserId: igId, connectedAt: Date.now() }
        saveTokens(tokens)
        resolve({ success: true })
      } catch (err) {
        reject(err)
      }
    })

    server.on('error', err => reject(new Error(`OAuth server error: ${err.message}`)))

    server.listen(IG_PORT, '127.0.0.1', () => {
      const scope   = 'pages_show_list,instagram_basic,instagram_manage_insights,pages_read_engagement'
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(IG_REDIRECT)}&scope=${scope}&response_type=code`

      authWindow = new BrowserWindow({ width: 920, height: 720, parent: mainWindow, modal: true, title: 'Connect Instagram' })
      authWindow.loadURL(authUrl)
      authWindow.on('closed', () => { server.close(); reject(new Error('Window closed')) })
    })
  })
})

// ─────────────── IPC: Instagram Data ───────────────
ipcMain.handle('instagram:fetch', async (_, endpoint) => {
  const tokens = loadTokens()
  if (!tokens.instagram) throw new Error('Instagram not connected')
  const { accessToken, igUserId } = tokens.instagram
  const base = 'https://graph.facebook.com/v18.0'

  if (endpoint === 'profile') {
    return apiFetch(`${base}/${igUserId}?fields=name,username,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`)
  }

  if (endpoint === 'media') {
    const media = await apiFetch(`${base}/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&access_token=${accessToken}&limit=20`)
    // Fetch insights per post
    const enriched = await Promise.all((media.data || []).map(async post => {
      try {
        const ins = await apiFetch(`${base}/${post.id}/insights?metric=reach,impressions,saved&access_token=${accessToken}`)
        const m   = {}
        ins.data?.forEach(i => { m[i.name] = i.values?.[0]?.value ?? 0 })
        return { ...post, ...m }
      } catch { return post }
    }))
    return { data: enriched }
  }

  if (endpoint === 'audience_online') {
    return apiFetch(`${base}/${igUserId}/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`)
  }

  if (endpoint === 'account_insights') {
    const since = Math.floor(Date.now() / 1000) - 28 * 86400
    const until = Math.floor(Date.now() / 1000)
    return apiFetch(`${base}/${igUserId}/insights?metric=reach,impressions,profile_views&period=day&since=${since}&until=${until}&access_token=${accessToken}`)
  }

  throw new Error(`Unknown endpoint: ${endpoint}`)
})

// ─────────────── IPC: TikTok OAuth ───────────────
ipcMain.handle('tiktok:auth', () => {
  return new Promise((resolve, reject) => {
    const codeVerifier  = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    const state         = crypto.randomBytes(16).toString('hex')
    let authWindow      = null

    const server = http.createServer(async (req, res) => {
      const parsed = urlMod.parse(req.url, true)
      if (parsed.pathname !== '/callback') return

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(successPage())
      server.close()
      if (authWindow && !authWindow.isDestroyed()) authWindow.close()

      const code = parsed.query.code
      if (!code) return reject(new Error(parsed.query.error || 'TikTok auth failed'))

      try {
        const body = new URLSearchParams({
          client_key:    TT_CLIENT_KEY,
          client_secret: TT_CLIENT_SECRET,
          code,
          grant_type:    'authorization_code',
          redirect_uri:  TT_REDIRECT,
          code_verifier: codeVerifier,
        })
        const tokenRes  = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
        const tokenData = await tokenRes.json()
        if (!tokenData.access_token) throw new Error(`TikTok token error: ${JSON.stringify(tokenData)}`)

        const tokens = loadTokens()
        tokens.tiktok = {
          accessToken:  tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          openId:       tokenData.open_id,
          connectedAt:  Date.now(),
        }
        saveTokens(tokens)
        resolve({ success: true })
      } catch (err) {
        reject(err)
      }
    })

    server.on('error', err => reject(new Error(`OAuth server error: ${err.message}`)))

    server.listen(TT_PORT, '127.0.0.1', () => {
      const scope   = 'user.info.basic,video.list'
      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TT_CLIENT_KEY}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(TT_REDIRECT)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`

      authWindow = new BrowserWindow({ width: 920, height: 720, parent: mainWindow, modal: true, title: 'Connect TikTok' })
      authWindow.loadURL(authUrl)
      authWindow.on('closed', () => { server.close(); reject(new Error('Window closed')) })
    })
  })
})

// ─────────────── IPC: TikTok Data ───────────────
ipcMain.handle('tiktok:fetch', async (_, endpoint) => {
  const tokens = loadTokens()
  if (!tokens.tiktok) throw new Error('TikTok not connected')
  const { accessToken } = tokens.tiktok
  const headers = { Authorization: `Bearer ${accessToken}` }

  if (endpoint === 'profile') {
    const res  = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,follower_count,following_count,likes_count,video_count', { headers })
    const data = await res.json()
    return data.data?.user || null
  }

  if (endpoint === 'videos') {
    const res  = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,share_url,video_description,duration,create_time,like_count,comment_count,share_count,view_count', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_count: 20 }),
    })
    const data = await res.json()
    return data.data?.videos || []
  }

  throw new Error(`Unknown endpoint: ${endpoint}`)
})

// ─────────────── IPC: Claude AI ───────────────
ipcMain.handle('claude:ai', async (_, { prompt, systemPrompt }) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':          CLAUDE_API_KEY,
      'anthropic-version':  '2023-06-01',
      'content-type':       'application/json',
    },
    body: JSON.stringify({
      model:      CLAUDE_MODEL,
      max_tokens: 4096,
      system:     systemPrompt || 'You are a social media content strategist helping María Luengo (@maryluengog on Instagram/TikTok, owner of María Swim brand). She creates content in Fashion, Beauty, Real Life, and María Swim pillars. Be specific, actionable, and tailored — not generic.',
      messages:   [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.content?.[0]?.text || ''
})
