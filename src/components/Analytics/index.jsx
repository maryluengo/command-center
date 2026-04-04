import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'

// ── Environment detection (module-level, stable across renders) ────────────
const isElectron = typeof window !== 'undefined' && !!window.electronAPI
const isWeb      = typeof window !== 'undefined' && !window.electronAPI

// ─────────────── SVG Chart Components ───────────────
function BarChart({ data = [], height = 140, color = 'var(--lavender)', labelKey = 'label', valueKey = 'value' }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1)
  const w   = 100 / data.length

  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = ((d[valueKey] || 0) / max) * (height - 28)
        const x    = i * w + w * 0.12
        const y    = height - barH - 22
        return (
          <g key={i}>
            <rect x={x} y={y} width={w * 0.76} height={barH} fill={color} rx="2" opacity="0.85" />
            <text x={x + w * 0.38} y={height - 8} textAnchor="middle" fontSize="4.5" fill="var(--text-muted)" fontFamily="DM Sans,sans-serif">
              {String(d[labelKey]).length > 5 ? String(d[labelKey]).slice(0, 5) : d[labelKey]}
            </text>
            {barH > 18 && (
              <text x={x + w * 0.38} y={y - 2} textAnchor="middle" fontSize="4" fill="var(--text-muted)" fontFamily="DM Sans,sans-serif">
                {d[valueKey] > 999 ? `${(d[valueKey]/1000).toFixed(1)}k` : d[valueKey]}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function LineChart({ data = [], height = 100, color = 'var(--pink)' }) {
  if (data.length < 2) return null
  const vals = data.map(d => d.value || 0)
  const max  = Math.max(...vals, 1)
  const min  = Math.min(...vals, 0)
  const range = max - min || 1

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 96 + 2
    const y = ((max - (d.value || 0)) / range) * (height - 20) + 6
    return `${x},${y}`
  }).join(' ')

  const areaBottom = `${(data.length - 1) / (data.length - 1) * 96 + 2},${height - 4} 2,${height - 4}`
  const areaPts    = pts + ' ' + areaBottom

  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#areaGrad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * 96 + 2
        const y = ((max - (d.value || 0)) / range) * (height - 20) + 6
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />
      })}
    </svg>
  )
}

function StatCard({ label, value, sub, color = 'var(--lavender-light)', icon }) {
  return (
    <div style={{ background: color, borderRadius: 'var(--r-md)', padding: '14px 18px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{icon}</div>
      <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.7rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function PostCard({ post, followers = 1 }) {
  const likes    = post.like_count     || post.likes    || 0
  const comments = post.comments_count || post.comments || 0
  const saves    = post.saved          || 0
  const reach    = post.reach          || 0
  const views    = post.view_count     || post.views    || 0
  const er       = followers > 0 ? (((likes + comments + saves) / followers) * 100).toFixed(2) : 0
  const thumb    = post.thumbnail_url || post.media_url || post.cover_image_url

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
      {thumb && (
        <div style={{ height: 120, background: 'var(--surface-2)', overflow: 'hidden' }}>
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
        </div>
      )}
      <div style={{ padding: '10px 12px' }}>
        {post.caption && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {post.caption || post.video_description || post.title}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {[
            ['❤️', likes],
            ['💬', comments],
            views ? ['👁️', views] : ['💾', saves],
            reach ? ['📊', reach] : ['📈', `${er}%`],
          ].map(([ic, val], i) => (
            <div key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {ic} {typeof val === 'number' ? (val > 9999 ? `${(val/1000).toFixed(1)}k` : val.toLocaleString()) : val}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: '0.68rem', background: 'var(--lavender-light)', color: 'var(--text)', borderRadius: 'var(--r-full)', padding: '2px 8px', display: 'inline-block', fontWeight: 600 }}>
          {er}% ER
        </div>
      </div>
    </div>
  )
}

// ─────────────── Connect Prompt ───────────────
function ConnectPrompt({ platform, onConnect, loading }) {
  const cfg = {
    instagram: { color: 'var(--pink-light)',     emoji: '📸', name: 'Instagram', desc: 'Connect your Instagram Professional account to see analytics' },
    tiktok:    { color: 'var(--lavender-light)', emoji: '🎵', name: 'TikTok',    desc: 'Connect your TikTok account to see video analytics' },
  }[platform]

  // Both Instagram and TikTok now work in web mode via server-side OAuth
  const canConnect = isElectron || isWeb

  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', background: cfg.color, borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>{cfg.emoji}</div>
      <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.5rem', marginBottom: 8 }}>Connect {cfg.name}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 20px' }}>{cfg.desc}</p>

      {canConnect ? (
        <button className="btn btn-primary" onClick={onConnect} disabled={loading}>
          {loading ? '⏳ Connecting...' : `Connect ${cfg.name}`}
        </button>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          <strong>⚡ Electron Required</strong><br />
          OAuth and API features only work in the desktop app. Run{' '}
          <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>npm run electron</code>{' '}
          to start in desktop mode.
        </div>
      )}
    </div>
  )
}

// ─────────────── Instagram Dashboard ───────────────
function InstagramDashboard({ data, onRefresh, refreshing }) {
  const { profile, media } = data
  const followers = profile?.followers_count || 1
  const posts     = (media?.data || []).filter(p => p.like_count !== undefined || p.reach !== undefined)

  const avgER = posts.length
    ? (posts.reduce((acc, p) => acc + ((p.like_count || 0) + (p.comments_count || 0) + (p.saved || 0)), 0) / posts.length / followers * 100).toFixed(2)
    : 0

  const avgReach = posts.length ? Math.round(posts.reduce((a, p) => a + (p.reach || 0), 0) / posts.length) : 0

  // Best day of week by avg engagement
  const dayAgg = Array(7).fill(0).map((_, i) => ({ label: ['Su','Mo','Tu','We','Th','Fr','Sa'][i], value: 0, count: 0 }))
  posts.forEach(p => {
    const d = new Date(p.timestamp).getDay()
    dayAgg[d].value += (p.like_count || 0) + (p.comments_count || 0)
    dayAgg[d].count++
  })
  const dayData = dayAgg.map(d => ({ ...d, value: d.count ? Math.round(d.value / d.count) : 0 }))

  const topPosts = [...posts].sort((a, b) => {
    const erA = ((a.like_count || 0) + (a.comments_count || 0) + (a.saved || 0)) / followers
    const erB = ((b.like_count || 0) + (b.comments_count || 0) + (b.saved || 0)) / followers
    return erB - erA
  }).slice(0, 6)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-md" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center gap-sm">
          {profile?.profile_picture_url && (
            <img src={profile.profile_picture_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--pink)' }} onError={e => e.target.style.display = 'none'} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>@{profile?.username || 'instagram'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile?.followers_count?.toLocaleString()} followers</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? '⏳ Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard icon="👥" label="Followers"      value={(profile?.followers_count || 0).toLocaleString()} color="var(--pink-light)" />
        <StatCard icon="📸" label="Posts"           value={profile?.media_count || 0}                        color="var(--lavender-light)" />
        <StatCard icon="📈" label="Avg Engagement"  value={`${avgER}%`}                                      color="var(--sage-light)" />
        <StatCard icon="👁️" label="Avg Reach"       value={avgReach > 999 ? `${(avgReach/1000).toFixed(1)}k` : avgReach} color="var(--peach-light)" />
      </div>

      {/* Best posting day */}
      {posts.length > 3 && (
        <div className="card mb-md">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 4 }}>Best Posting Days</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>Average engagement by day of week</p>
          <BarChart data={dayData} color="var(--pink)" height={130} />
        </div>
      )}

      {/* Top posts */}
      {topPosts.length > 0 && (
        <div className="card mb-md">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 4 }}>Top Performing Posts</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>Ranked by engagement rate</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {topPosts.map(p => <PostCard key={p.id} post={p} followers={followers} />)}
          </div>
        </div>
      )}

      {/* All recent posts */}
      {posts.length > 6 && (
        <div className="card">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 14 }}>Recent Posts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {posts.slice(0, 12).map(p => <PostCard key={p.id} post={p} followers={followers} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────── TikTok Dashboard ───────────────
function TikTokDashboard({ data, onRefresh, refreshing }) {
  const { profile, videos = [] } = data
  const followers = profile?.follower_count || 1

  const avgViews = videos.length ? Math.round(videos.reduce((a, v) => a + (v.view_count || 0), 0) / videos.length) : 0
  const avgER    = videos.length ? (videos.reduce((a, v) => a + (v.like_count || 0) + (v.comment_count || 0), 0) / videos.length / followers * 100).toFixed(2) : 0

  const topVideos = [...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 6)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-md" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center gap-sm">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--lavender)' }} onError={e => e.target.style.display = 'none'} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>@{profile?.display_name || 'tiktok'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile?.follower_count?.toLocaleString()} followers</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? '⏳ Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard icon="👥" label="Followers"   value={(profile?.follower_count || 0).toLocaleString()} color="var(--lavender-light)" />
        <StatCard icon="🎵" label="Videos"      value={profile?.video_count || 0}                        color="var(--pink-light)" />
        <StatCard icon="❤️" label="Total Likes" value={(profile?.likes_count || 0) > 999 ? `${((profile?.likes_count || 0)/1000).toFixed(1)}k` : profile?.likes_count || 0} color="var(--peach-light)" />
        <StatCard icon="👁️" label="Avg Views"   value={avgViews > 999 ? `${(avgViews/1000).toFixed(1)}k` : avgViews} color="var(--sage-light)" />
      </div>

      {/* Top videos */}
      {topVideos.length > 0 && (
        <div className="card mb-md">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 4 }}>Top Videos by Views</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>Most viewed recent videos</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {topVideos.map(v => <PostCard key={v.id} post={v} followers={followers} />)}
          </div>
        </div>
      )}

      {/* Views bar chart */}
      {videos.length > 3 && (
        <div className="card">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 4 }}>Recent Video Views</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>Views per video (most recent {Math.min(videos.length, 12)})</p>
          <BarChart
            data={videos.slice(0, 12).map((v, i) => ({ label: `V${i+1}`, value: v.view_count || 0 }))}
            color="var(--lavender)"
            height={130}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────── Main Analytics Section ───────────────
export default function Analytics() {
  const [tab,         setTab]     = useState('instagram')
  const [igData,      setIgData]  = useLocalStorage('analytics-ig', null)
  const [ttData,      setTtData]  = useLocalStorage('analytics-tt', null)
  const [igConnected, setIgConn]  = useState(false)
  const [ttConnected, setTtConn]  = useState(false)
  const [loading,     setLoading] = useState({})
  const [error,       setError]   = useState({})

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }))
  const setErr  = (key, val) => setError(p => ({ ...p, [key]: val }))

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchInstagram = useCallback(async () => {
    setLoad('ig-refresh', true)
    setErr('ig', null)
    try {
      if (isElectron) {
        const [profile, media] = await Promise.all([
          window.electronAPI.instagramFetch('profile'),
          window.electronAPI.instagramFetch('media'),
        ])
        setIgData({ profile, media, fetchedAt: Date.now() })
      } else {
        const [profileRes, mediaRes] = await Promise.all([
          fetch('/api/instagram/profile'),
          fetch('/api/instagram/media'),
        ])
        if (!profileRes.ok) {
          const e = await profileRes.json().catch(() => ({}))
          // Token expired — mark as disconnected
          if (profileRes.status === 401) setIgConn(false)
          throw new Error(e.error || 'Failed to fetch Instagram profile')
        }
        if (!mediaRes.ok) {
          const e = await mediaRes.json().catch(() => ({}))
          throw new Error(e.error || 'Failed to fetch Instagram media')
        }
        const [profile, media] = await Promise.all([profileRes.json(), mediaRes.json()])
        setIgData({ profile, media, fetchedAt: Date.now() })
      }
    } catch (e) {
      setErr('ig', e.message)
    } finally {
      setLoad('ig-refresh', false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTikTok = useCallback(async () => {
    setLoad('tt-refresh', true)
    setErr('tt', null)
    try {
      if (isElectron) {
        const [profile, videos] = await Promise.all([
          window.electronAPI.tiktokFetch('profile'),
          window.electronAPI.tiktokFetch('videos'),
        ])
        setTtData({ profile, videos, fetchedAt: Date.now() })
      } else {
        const [profileRes, videosRes] = await Promise.all([
          fetch('/api/tiktok/profile'),
          fetch('/api/tiktok/videos'),
        ])
        if (!profileRes.ok) {
          const e = await profileRes.json().catch(() => ({}))
          if (profileRes.status === 401) setTtConn(false)
          throw new Error(e.error || 'Failed to fetch TikTok profile')
        }
        if (!videosRes.ok) {
          const e = await videosRes.json().catch(() => ({}))
          throw new Error(e.error || 'Failed to fetch TikTok videos')
        }
        const [profile, videos] = await Promise.all([profileRes.json(), videosRes.json()])
        setTtData({ profile, videos, fetchedAt: Date.now() })
      }
    } catch (e) {
      setErr('tt', e.message)
    } finally {
      setLoad('tt-refresh', false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connection status on mount ───────────────────────────────────────────
  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getTokens().then(tokens => {
        setIgConn(!!tokens?.instagram)
        setTtConn(!!tokens?.tiktok)
      }).catch(() => {})
      return
    }

    // ── Web mode: handle OAuth redirect params ─────────────────────────
    const params            = new URLSearchParams(window.location.search)
    const igJustConnected   = params.get('instagram_connected') === '1'
    const igAuthError       = params.get('instagram_error')
    const ttJustConnected   = params.get('tiktok_connected') === '1'
    const ttAuthError       = params.get('tiktok_error')

    if (igJustConnected || igAuthError || ttJustConnected || ttAuthError) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (igAuthError) setErr('ig', decodeURIComponent(igAuthError))
    if (ttAuthError) setErr('tt', decodeURIComponent(ttAuthError))

    // Switch to the TikTok tab automatically if that's what just connected
    if (ttJustConnected) setTab('tiktok')

    // ── Web mode: check both cookie-based sessions in parallel ─────────
    Promise.all([
      fetch('/api/instagram/status').then(r => r.json()).catch(() => ({ connected: false })),
      fetch('/api/tiktok/status').then(r => r.json()).catch(() => ({ connected: false })),
    ]).then(([igStatus, ttStatus]) => {
      if (igStatus.connected) {
        setIgConn(true)
        if (igJustConnected) fetchInstagram()
      }
      if (ttStatus.connected) {
        setTtConn(true)
        if (ttJustConnected) fetchTikTok()
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connect handlers ─────────────────────────────────────────────────────
  const connectInstagram = useCallback(async () => {
    if (isElectron) {
      setLoad('ig-connect', true)
      setErr('ig', null)
      try {
        await window.electronAPI.instagramAuth()
        setIgConn(true)
        await fetchInstagram()
      } catch (e) {
        setErr('ig', e.message)
      } finally {
        setLoad('ig-connect', false)
      }
    } else {
      // Web: full-page redirect to the server-side OAuth login route
      window.location.href = '/api/auth/instagram/login'
    }
  }, [fetchInstagram])

  const connectTikTok = useCallback(async () => {
    if (isElectron) {
      setLoad('tt-connect', true)
      setErr('tt', null)
      try {
        await window.electronAPI.tiktokAuth()
        setTtConn(true)
        await fetchTikTok()
      } catch (e) {
        setErr('tt', e.message)
      } finally {
        setLoad('tt-connect', false)
      }
    } else {
      // Web: full-page redirect to server-side PKCE OAuth login route
      window.location.href = '/api/auth/tiktok/login'
    }
  }, [fetchTikTok])

  const disconnect = async (platform) => {
    if (!confirm(`Disconnect ${platform}?`)) return
    if (isElectron) {
      await window.electronAPI.clearToken(platform)
    } else {
      if (platform === 'instagram') await fetch('/api/instagram/disconnect', { method: 'POST' }).catch(() => {})
      if (platform === 'tiktok')    await fetch('/api/tiktok/disconnect',    { method: 'POST' }).catch(() => {})
    }
    if (platform === 'instagram') { setIgConn(false); setIgData(null) }
    if (platform === 'tiktok')    { setTtConn(false); setTtData(null) }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="section-title">Analytics</h1>
          <p className="section-subtitle">Instagram & TikTok performance insights</p>
        </div>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          {igConnected && <button className="btn btn-ghost btn-sm" onClick={() => disconnect('instagram')}>Disconnect IG</button>}
          {ttConnected && <button className="btn btn-ghost btn-sm" onClick={() => disconnect('tiktok')}>Disconnect TT</button>}
        </div>
      </div>

      {/* Platform tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'instagram' ? 'active' : ''}`} onClick={() => setTab('instagram')}>📸 Instagram</button>
        <button className={`tab ${tab === 'tiktok'    ? 'active' : ''}`} onClick={() => setTab('tiktok')}>🎵 TikTok</button>
      </div>

      {/* ── Instagram tab ───────────────────────────────────────────────── */}
      {tab === 'instagram' && (
        <div>
          {error.ig && (
            <div style={{ background: '#FFE8E8', border: '1px solid #F8CECE', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--priority-high)' }}>
              ⚠️ {error.ig}
              {error.ig.toLowerCase().includes('reconnect') && (
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }} onClick={connectInstagram}>
                  Reconnect
                </button>
              )}
            </div>
          )}
          {!igConnected ? (
            <ConnectPrompt platform="instagram" onConnect={connectInstagram} loading={loading['ig-connect']} />
          ) : igData ? (
            <InstagramDashboard data={igData} onRefresh={fetchInstagram} refreshing={loading['ig-refresh']} />
          ) : (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <button className="btn btn-primary" onClick={fetchInstagram} disabled={loading['ig-refresh']}>
                {loading['ig-refresh'] ? '⏳ Loading...' : 'Load Instagram Data'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TikTok tab ──────────────────────────────────────────────────── */}
      {tab === 'tiktok' && (
        <div>
          {error.tt && (
            <div style={{ background: '#FFE8E8', border: '1px solid #F8CECE', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--priority-high)' }}>
              ⚠️ {error.tt}
              {error.tt.toLowerCase().includes('reconnect') && (
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }} onClick={connectTikTok}>
                  Reconnect
                </button>
              )}
            </div>
          )}
          {!ttConnected ? (
            <ConnectPrompt platform="tiktok" onConnect={connectTikTok} loading={loading['tt-connect']} />
          ) : ttData ? (
            <TikTokDashboard data={ttData} onRefresh={fetchTikTok} refreshing={loading['tt-refresh']} />
          ) : (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <button className="btn btn-primary" onClick={fetchTikTok} disabled={loading['tt-refresh']}>
                {loading['tt-refresh'] ? '⏳ Loading...' : 'Load TikTok Data'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
