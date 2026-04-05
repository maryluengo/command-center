import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from '../../hooks/useLocalStorage'

// ── Environment detection ────────────────────────────────────────────────────
const isElectron = typeof window !== 'undefined' && !!window.electronAPI
const isWeb      = typeof window !== 'undefined' && !window.electronAPI

// ─────────────── Helpers ───────────────
function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000)    return `${(n / 1_000).toFixed(0)}k`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return (n || 0).toLocaleString()
}

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('default', { month: 'short', day: 'numeric' })
}

// ─────────────── CSS Bar Chart (replaces broken SVG) ───────────────
function BarChart({ data = [], maxBarHeight = 90, color = 'var(--lavender)', labelKey = 'label', valueKey = 'value' }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
      {data.map((d, i) => {
        const val   = d[valueKey] || 0
        const barH  = Math.round((val / max) * maxBarHeight)
        const label = String(d[labelKey]).slice(0, 4)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
            {/* value above bar */}
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1, minHeight: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              {val > 0 ? fmtNum(val) : ''}
            </span>
            {/* bar */}
            <div style={{
              width: '72%',
              height: Math.max(barH, val > 0 ? 4 : 0),
              background: color,
              borderRadius: '4px 4px 0 0',
              opacity: 0.82,
              transition: 'height 0.3s ease',
              flexShrink: 0,
            }} />
            {/* day label */}
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', lineHeight: 1, paddingTop: 2 }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────── Stat Card ───────────────
function StatCard({ label, value, sub, color = 'var(--lavender-light)', icon }) {
  return (
    <div style={{ background: color, borderRadius: 'var(--r-md)', padding: '14px 18px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '1.1rem', marginBottom: 3 }}>{icon}</div>
      <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: 5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.69rem', color: 'var(--text-light)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─────────────── Post Card (clickable) ───────────────
function PostCard({ post, followers = 1, platform = 'instagram' }) {
  const likes    = post.like_count     || post.likes    || 0
  const comments = post.comments_count || post.comments || 0
  const saves    = post.saved          || 0
  const reach    = post.reach          || 0
  const views    = post.view_count     || post.views    || 0
  const er       = followers > 0 ? (((likes + comments + saves) / followers) * 100).toFixed(2) : '0.00'
  const thumb    = post.thumbnail_url || post.media_url || post.cover_image_url
  const link     = post.permalink     || post.share_url || null

  const stats = platform === 'tiktok'
    ? [['❤️', likes], ['💬', comments], ['👁️', views], ['🔗', post.share_count || 0]]
    : [['❤️', likes], ['💬', comments], saves ? ['💾', saves] : ['👁️', reach || views], ['📊', reach ? fmtNum(reach) : `${er}%`]]

  const handleClick = () => {
    if (link) window.open(link, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      onClick={link ? handleClick : undefined}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xs)',
        cursor: link ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => { if (link) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
      title={link ? 'Click to open post ↗' : undefined}
    >
      {/* Thumbnail */}
      {thumb ? (
        <div style={{ height: 130, background: 'var(--surface-2)', overflow: 'hidden', position: 'relative' }}>
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
          {link && (
            <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: '2px 6px', fontSize: '0.6rem', color: '#fff' }}>↗</div>
          )}
        </div>
      ) : (
        <div style={{ height: 80, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
          {platform === 'tiktok' ? '🎵' : '📸'}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '10px 12px 12px' }}>
        {(post.caption || post.video_description || post.title) && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {post.caption || post.video_description || post.title}
          </p>
        )}

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', marginBottom: 8 }}>
          {stats.map(([ic, val], i) => (
            <div key={i} style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>{ic}</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{typeof val === 'number' ? fmtNum(val) : val}</span>
            </div>
          ))}
        </div>

        {/* ER badge + date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.68rem', background: 'var(--lavender-light)', color: 'var(--text)', borderRadius: 'var(--r-full)', padding: '2px 9px', fontWeight: 700 }}>
            {er}% ER
          </span>
          {post.timestamp && (
            <span style={{ fontSize: '0.66rem', color: 'var(--text-light)' }}>{fmtDate(post.timestamp)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────── Stories Strip ───────────────
function StoriesStrip({ stories = [] }) {
  if (!stories.length) return (
    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active stories right now.</p>
  )

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
      {stories.map(s => {
        const thumb = s.thumbnail_url || s.media_url
        return (
          <div key={s.id} style={{ flexShrink: 0, width: 70 }}>
            <div style={{ width: 70, height: 115, borderRadius: 12, overflow: 'hidden', background: 'var(--surface-2)', border: '2px solid var(--pink)', position: 'relative' }}>
              {thumb
                ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📸</div>
              }
            </div>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>{fmtDate(s.timestamp)}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────── Best Times to Post ───────────────
function BestTimesSection({ posts = [], timestampKey = 'timestamp', engagementKeys = ['like_count', 'comments_count'] }) {
  const hourAgg = Array.from({ length: 24 }, (_, h) => ({
    h,
    label: h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`,
    total: 0,
    count: 0,
  }))

  posts.forEach(p => {
    const ts = p[timestampKey]
    if (!ts) return
    const msTs = typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts  // TikTok uses seconds
    const h = new Date(msTs).getHours()
    const eng = engagementKeys.reduce((sum, k) => sum + (p[k] || 0), 0)
    hourAgg[h].total += eng
    hourAgg[h].count++
  })

  const withData = hourAgg
    .filter(h => h.count > 0)
    .map(h => ({ ...h, avg: Math.round(h.total / h.count) }))
    .sort((a, b) => b.avg - a.avg)

  if (withData.length < 2) {
    return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not enough data yet — post more content to unlock best times.</p>
  }

  const top = withData.slice(0, 5)
  const maxAvg = top[0].avg || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {top.map((h, i) => (
        <div key={h.h} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 38, fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600, flexShrink: 0 }}>{h.label}</span>
          <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${(h.avg / maxAvg) * 100}%`,
              height: '100%',
              background: i === 0
                ? 'linear-gradient(90deg, var(--pink) 0%, var(--lavender) 100%)'
                : 'var(--lavender)',
              borderRadius: 999,
              opacity: 1 - i * 0.12,
            }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: 56, textAlign: 'right', flexShrink: 0 }}>{fmtNum(h.avg)} avg</span>
          {i === 0 && <span style={{ fontSize: '0.65rem', background: 'var(--pink-light)', color: 'var(--text)', borderRadius: 999, padding: '1px 7px', fontWeight: 700, flexShrink: 0 }}>Best</span>}
        </div>
      ))}
    </div>
  )
}

// ─────────────── Connect Prompt ───────────────
function ConnectPrompt({ platform, onConnect, loading }) {
  const cfg = {
    instagram: { color: 'var(--pink-light)',     emoji: '📸', name: 'Instagram', desc: 'Connect your Instagram Professional account to see analytics' },
    tiktok:    { color: 'var(--lavender-light)', emoji: '🎵', name: 'TikTok',    desc: 'Connect your TikTok account to see video analytics' },
  }[platform]

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
          Run <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>npm run electron</code> to use OAuth.
        </div>
      )}
    </div>
  )
}

// ─────────────── Instagram Dashboard ───────────────
function InstagramDashboard({ data, onRefresh, refreshing }) {
  const { profile, media, stories } = data
  const followers = profile?.followers_count || 1

  // Filter out trial reels — API already filters, but apply client-side safety net too.
  // Trial reels have is_shared_to_feed === false, or are VIDEO with no permalink.
  const allPosts = (media?.data || []).filter(p => {
    const shared = p.is_shared_to_feed
    if (shared === false || String(shared).toLowerCase() === 'false') return false
    if (p.media_type === 'VIDEO' && !p.permalink) return false
    return true
  })
  const posts = allPosts.filter(p => p.like_count !== undefined || p.reach !== undefined)

  const avgER = posts.length
    ? (posts.reduce((acc, p) => acc + ((p.like_count || 0) + (p.comments_count || 0) + (p.saved || 0)), 0) / posts.length / followers * 100).toFixed(2)
    : '0.00'

  const avgReach  = posts.length ? Math.round(posts.reduce((a, p) => a + (p.reach || 0), 0) / posts.length) : 0
  const totalLikes = posts.reduce((a, p) => a + (p.like_count || 0), 0)

  // Best day of week
  const dayAgg = Array(7).fill(null).map((_, i) => ({ label: ['Su','Mo','Tu','We','Th','Fr','Sa'][i], value: 0, count: 0 }))
  posts.forEach(p => {
    const d = new Date(p.timestamp).getDay()
    dayAgg[d].value += (p.like_count || 0) + (p.comments_count || 0)
    dayAgg[d].count++
  })
  const dayData = dayAgg.map(d => ({ ...d, value: d.count ? Math.round(d.value / d.count) : 0 }))

  const topPosts = [...posts]
    .sort((a, b) => {
      const erA = ((a.like_count || 0) + (a.comments_count || 0) + (a.saved || 0)) / followers
      const erB = ((b.like_count || 0) + (b.comments_count || 0) + (b.saved || 0)) / followers
      return erB - erA
    })
    .slice(0, 6)

  return (
    <div>
      {/* Profile header */}
      <div className="flex items-center justify-between mb-md" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center gap-sm">
          {profile?.profile_picture_url && (
            <img src={profile.profile_picture_url} alt="" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--pink)' }} onError={e => e.target.style.display = 'none'} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>@{profile?.username || 'instagram'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(profile?.followers_count || 0).toLocaleString()} followers · {profile?.media_count || 0} posts</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? '⏳' : '↻'} {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard icon="👥" label="Followers"     value={fmtNum(profile?.followers_count || 0)} color="var(--pink-light)" />
        <StatCard icon="📈" label="Avg ER"        value={`${avgER}%`}                            color="var(--lavender-light)" />
        <StatCard icon="👁️" label="Avg Reach"    value={fmtNum(avgReach)}                        color="var(--sage-light)" />
        <StatCard icon="❤️" label="Total Likes"  value={fmtNum(totalLikes)}                      color="var(--peach-light)" sub={`${posts.length} posts`} />
      </div>

      {/* Best Posting Days */}
      {posts.length > 2 && (
        <div className="card mb-md">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 3 }}>Best Posting Days</h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 14 }}>Average engagement by day of week</p>
          <BarChart data={dayData} color="var(--pink)" maxBarHeight={90} />
        </div>
      )}

      {/* Best Times to Post */}
      {posts.length > 2 && (
        <div className="card mb-md">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 3 }}>Best Times to Post</h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 14 }}>Hours with highest avg engagement on your posts</p>
          <BestTimesSection posts={posts} timestampKey="timestamp" engagementKeys={['like_count','comments_count','saved']} />
        </div>
      )}

      {/* Stories */}
      <div className="card mb-md">
        <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 3 }}>Active Stories</h3>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 12 }}>Stories live right now (last 24h)</p>
        <StoriesStrip stories={stories?.data || []} />
      </div>

      {/* Top performing posts */}
      {topPosts.length > 0 && (
        <div className="card mb-md">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 3 }}>Top Performing Posts</h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 14 }}>Ranked by engagement rate · click to open ↗</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px,1fr))', gap: 12 }}>
            {topPosts.map(p => <PostCard key={p.id} post={p} followers={followers} platform="instagram" />)}
          </div>
        </div>
      )}

      {/* All recent posts */}
      {posts.length > 6 && (
        <div className="card">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 14 }}>Recent Posts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px,1fr))', gap: 12 }}>
            {posts.slice(0, 15).map(p => <PostCard key={p.id} post={p} followers={followers} platform="instagram" />)}
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

  const totalViews = videos.reduce((a, v) => a + (v.view_count || 0), 0)
  const avgViews   = videos.length ? Math.round(totalViews / videos.length) : 0
  const avgER      = videos.length
    ? (videos.reduce((a, v) => a + (v.like_count || 0) + (v.comment_count || 0), 0) / videos.length / followers * 100).toFixed(2)
    : '0.00'

  const topVideos = [...videos].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 6)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-md" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center gap-sm">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--lavender)' }} onError={e => e.target.style.display = 'none'} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>@{profile?.display_name || 'tiktok'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(profile?.follower_count || 0).toLocaleString()} followers · {profile?.video_count || 0} videos</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? '⏳' : '↻'} {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard icon="👥" label="Followers"   value={fmtNum(profile?.follower_count || 0)}  color="var(--lavender-light)" />
        <StatCard icon="❤️" label="Total Likes" value={fmtNum(profile?.likes_count || 0)}      color="var(--pink-light)" />
        <StatCard icon="👁️" label="Avg Views"  value={fmtNum(avgViews)}                        color="var(--sage-light)" />
        <StatCard icon="📈" label="Avg ER"      value={`${avgER}%`}                             color="var(--peach-light)" sub={`${videos.length} videos`} />
      </div>

      {/* Best Times to Post */}
      {videos.length > 2 && (
        <div className="card mb-md">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 3 }}>Best Times to Post</h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 14 }}>Hours with highest avg engagement on your videos</p>
          <BestTimesSection posts={videos} timestampKey="create_time" engagementKeys={['like_count','comment_count']} />
        </div>
      )}

      {/* Top videos */}
      {topVideos.length > 0 && (
        <div className="card mb-md">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 3 }}>Top Videos by Views</h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 14 }}>Most viewed · click to open ↗</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px,1fr))', gap: 12 }}>
            {topVideos.map(v => <PostCard key={v.id} post={v} followers={followers} platform="tiktok" />)}
          </div>
        </div>
      )}

      {/* Views bar chart */}
      {videos.length > 3 && (
        <div className="card">
          <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: '1.1rem', marginBottom: 3 }}>Recent Video Views</h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 14 }}>Views per video (most recent {Math.min(videos.length, 12)})</p>
          <BarChart
            data={videos.slice(0, 12).map((v, i) => ({ label: `V${i+1}`, value: v.view_count || 0 }))}
            color="var(--lavender)"
            maxBarHeight={90}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────── Main Analytics Section ───────────────
export default function Analytics() {
  const [tab,         setTab]    = useState('instagram')
  const [igData,      setIgData] = useLocalStorage('analytics-ig', null)
  const [ttData,      setTtData] = useLocalStorage('analytics-tt', null)
  const [igConnected, setIgConn] = useState(false)
  const [ttConnected, setTtConn] = useState(false)
  const [loading,     setLoading] = useState({})
  const [error,       setError]   = useState({})

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }))
  const setErr  = (key, val) => setError(p => ({ ...p, [key]: val }))

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchInstagram = useCallback(async () => {
    setLoad('ig-refresh', true)
    setErr('ig', null)
    try {
      if (isElectron) {
        const [profile, media] = await Promise.all([
          window.electronAPI.instagramFetch('profile'),
          window.electronAPI.instagramFetch('media'),
        ])
        setIgData({ profile, media, stories: { data: [] }, fetchedAt: Date.now() })
      } else {
        const [profileRes, mediaRes, storiesRes] = await Promise.all([
          fetch('/api/instagram?action=profile'),
          fetch('/api/instagram?action=media'),
          fetch('/api/instagram?action=stories').catch(() => null),
        ])
        if (!profileRes.ok) {
          const e = await profileRes.json().catch(() => ({}))
          if (profileRes.status === 401) setIgConn(false)
          throw new Error(e.error || 'Failed to fetch Instagram profile')
        }
        if (!mediaRes.ok) {
          const e = await mediaRes.json().catch(() => ({}))
          throw new Error(e.error || 'Failed to fetch Instagram media')
        }
        const [profile, media, stories] = await Promise.all([
          profileRes.json(),
          mediaRes.json(),
          storiesRes?.ok ? storiesRes.json().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ])
        setIgData({ profile, media, stories, fetchedAt: Date.now() })
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
          fetch('/api/tiktok?action=profile'),
          fetch('/api/tiktok?action=videos'),
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

  // ── Connection status on mount ────────────────────────────────────────────
  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getTokens().then(tokens => {
        setIgConn(!!tokens?.instagram)
        setTtConn(!!tokens?.tiktok)
      }).catch(() => {})
      return
    }

    const params          = new URLSearchParams(window.location.search)
    const igJustConnected = params.get('instagram_connected') === '1'
    const igAuthError     = params.get('instagram_error')
    const ttJustConnected = params.get('tiktok_connected') === '1'
    const ttAuthError     = params.get('tiktok_error')

    if (igJustConnected || igAuthError || ttJustConnected || ttAuthError) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (igAuthError) setErr('ig', decodeURIComponent(igAuthError))
    if (ttAuthError) setErr('tt', decodeURIComponent(ttAuthError))
    if (ttJustConnected) setTab('tiktok')

    Promise.all([
      fetch('/api/instagram?action=status').then(r => r.json()).catch(() => ({ connected: false })),
      fetch('/api/tiktok?action=status').then(r => r.json()).catch(() => ({ connected: false })),
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

  // ── Connect handlers ──────────────────────────────────────────────────────
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
      window.location.href = '/api/auth/tiktok/login'
    }
  }, [fetchTikTok])

  const disconnect = async (platform) => {
    if (!confirm(`Disconnect ${platform}?`)) return
    if (isElectron) {
      await window.electronAPI.clearToken(platform)
    } else {
      if (platform === 'instagram') await fetch('/api/instagram?action=disconnect', { method: 'POST' }).catch(() => {})
      if (platform === 'tiktok')    await fetch('/api/tiktok?action=disconnect',    { method: 'POST' }).catch(() => {})
    }
    if (platform === 'instagram') { setIgConn(false); setIgData(null) }
    if (platform === 'tiktok')    { setTtConn(false); setTtData(null) }
  }

  const errorBanner = (msg, onReconnect) => (
    <div style={{ background: '#FFE8E8', border: '1px solid #F8CECE', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--priority-high)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span>⚠️ {msg}</span>
      {msg.toLowerCase().includes('reconnect') && (
        <button className="btn btn-ghost btn-sm" onClick={onReconnect}>Reconnect</button>
      )}
    </div>
  )

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

      {/* ── Instagram ── */}
      {tab === 'instagram' && (
        <div>
          {error.ig && errorBanner(error.ig, connectInstagram)}
          {!igConnected ? (
            <ConnectPrompt platform="instagram" onConnect={connectInstagram} loading={loading['ig-connect']} />
          ) : igData ? (
            <InstagramDashboard data={igData} onRefresh={fetchInstagram} refreshing={loading['ig-refresh']} />
          ) : (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <button className="btn btn-primary" onClick={fetchInstagram} disabled={loading['ig-refresh']}>
                {loading['ig-refresh'] ? '⏳ Loading…' : 'Load Instagram Data'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TikTok ── */}
      {tab === 'tiktok' && (
        <div>
          {error.tt && errorBanner(error.tt, connectTikTok)}
          {!ttConnected ? (
            <ConnectPrompt platform="tiktok" onConnect={connectTikTok} loading={loading['tt-connect']} />
          ) : ttData ? (
            <TikTokDashboard data={ttData} onRefresh={fetchTikTok} refreshing={loading['tt-refresh']} />
          ) : (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <button className="btn btn-primary" onClick={fetchTikTok} disabled={loading['tt-refresh']}>
                {loading['tt-refresh'] ? '⏳ Loading…' : 'Load TikTok Data'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
