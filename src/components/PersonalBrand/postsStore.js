// Shared post store for the @maryluengog Personal Brand area.
// Both Content Calendar and Editorial Planner read/write the same key.
//
// Canonical post shape:
//   { id, date: "YYYY-MM-DD", platform: "ig_feed"|..., title, notes,
//     ...optional rich fields preserved across views }
//
// Old keys are left in place after migration as a backup.

export const POSTS_KEY      = 'maryluengog_personal_brand_posts'
export const DAY_NOTES_KEY  = 'maryluengog_personal_brand_day_notes'
export const MIGRATION_FLAG = 'maryluengog_personal_brand_migrated_v1'

const OLD_CC_KEY = 'cal-entries-brand'
const OLD_EP_KEY = 'commandCenter_personalBrandEditorial'

export const PLATFORMS = [
  { key: 'ig_feed',    label: 'Instagram Feed',    short: 'IG FEED',    tag: 'IG',    icon: '📷', tagColor: '#F0AEC4' },
  { key: 'ig_reel',    label: 'Instagram Reel',    short: 'IG REEL',    tag: 'Reel',  icon: '🎬', tagColor: '#FFCFA8' },
  { key: 'ig_stories', label: 'Instagram Stories', short: 'IG STORIES', tag: 'Story', icon: '⭕', tagColor: '#C4AAED' },
  { key: 'tiktok',     label: 'TikTok',            short: 'TIKTOK',     tag: 'TT',    icon: '🎵', tagColor: '#FFB5A7' },
  { key: 'pinterest',  label: 'Pinterest',         short: 'PINTEREST',  tag: 'Pin',   icon: '📌', tagColor: '#A8C8EC' },
  { key: 'yt_shorts',  label: 'YouTube Shorts',    short: 'YT SHORTS',  tag: 'YT',    icon: '▶️', tagColor: '#9ED8C6' },
]

export const PLATFORM_BY_KEY = Object.fromEntries(PLATFORMS.map(p => [p.key, p]))

// Old Content Calendar platform strings → unified platform key
const CC_PLATFORM_MAP = {
  'Instagram Reel':     'ig_reel',
  'Instagram Carousel': 'ig_feed',
  'Instagram Feed':     'ig_feed',
  'Instagram Story':    'ig_stories',
  'Instagram Stories':  'ig_stories',
  'TikTok':             'tiktok',
  'Pinterest':          'pinterest',
  'YouTube Short':      'yt_shorts',
  'YouTube Shorts':     'yt_shorts',
}

// Old Editorial Planner platform key → unified platform key
const EP_PLATFORM_MAP = {
  instagramFeed:    'ig_feed',
  instagramReel:    'ig_reel',
  instagramStories: 'ig_stories',
  tiktok:           'tiktok',
  pinterest:        'pinterest',
  youtubeShorts:    'yt_shorts',
}

// Old Editorial Planner day-of-week → offset from Monday
const EP_DAY_OFFSET = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
}

export function ccPlatformToKey(s)   { return CC_PLATFORM_MAP[s] || 'ig_feed' }
export function epPlatformToKey(k)   { return EP_PLATFORM_MAP[k] || null }

// Convert old Content Calendar string back from unified key (best effort, used for the legacy CC modal if needed)
export function keyToCcPlatform(k) {
  switch (k) {
    case 'ig_reel':    return 'Instagram Reel'
    case 'ig_feed':    return 'Instagram Carousel'
    case 'ig_stories': return 'Instagram Story'
    case 'tiktok':     return 'TikTok'
    case 'pinterest':  return 'Pinterest'
    case 'yt_shorts':  return 'YouTube Short'
    default:           return 'Instagram Reel'
  }
}

// Parse YYYY-MM-DD as a LOCAL date (not UTC midnight).
export function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dateFmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function addDaysStr(dateStr, n) {
  const d = parseLocalDate(dateStr); d.setDate(d.getDate() + n); return dateFmt(d)
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function safeParse(raw, fallback) {
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

// One-time merge of old CC + EP keys into the new unified key.
// Idempotent — guarded by MIGRATION_FLAG. Old keys are left intact as backup.
export function migrateIfNeeded() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return

  const existing = safeParse(localStorage.getItem(POSTS_KEY), [])
  const ccRaw    = safeParse(localStorage.getItem(OLD_CC_KEY), [])
  const epRaw    = safeParse(localStorage.getItem(OLD_EP_KEY), { weeks: {} })

  const merged   = [...existing]
  const dayNotes = safeParse(localStorage.getItem(DAY_NOTES_KEY), {})

  // --- Content Calendar (flat array) ---
  for (const e of (Array.isArray(ccRaw) ? ccRaw : [])) {
    if (!e?.date) continue
    merged.push({
      id:       e.id || genId(),
      date:     e.date,
      platform: ccPlatformToKey(e.platform),
      title:    (e.title || '').trim(),
      notes:    (e.notes || '').trim(),
      // Preserve rich CC fields so the calendar's full editor still works
      pillar:         e.pillar,
      caption:        e.caption,
      script:         e.script,
      audio:          e.audio,
      filmTime:       e.filmTime,
      whatINeed:      e.whatINeed,
      referenceLinks: e.referenceLinks,
      status:         e.status,
      files:          e.files,
      client:         e.client,
      _origin:        'cc',
    })
  }

  // --- Editorial Planner (nested weeks/days/platforms) ---
  const weeks = epRaw?.weeks || {}
  for (const [weekKey, weekData] of Object.entries(weeks)) {
    if (!weekData || typeof weekData !== 'object') continue
    for (const [day, dayData] of Object.entries(weekData)) {
      if (!dayData || typeof dayData !== 'object') continue
      const offset = EP_DAY_OFFSET[day]
      if (offset === undefined) continue
      const date = addDaysStr(weekKey, offset)

      // Day notes go to a separate keyed-by-date store (last write wins)
      if (dayData._notes && dayData._notes.trim()) {
        dayNotes[date] = dayData._notes.trim()
      }

      for (const [epKey, cell] of Object.entries(dayData)) {
        if (epKey.startsWith('_')) continue
        const platform = epPlatformToKey(epKey)
        if (!platform) continue
        if (!cell?.title) continue
        merged.push({
          id:       genId(),
          date,
          platform,
          title:    cell.title.trim(),
          notes:    (cell.notes || '').trim(),
          // Preserve rich EP fields
          pillar:         cell.pillar,
          postType:       cell.postType,
          timeOfDay:      cell.timeOfDay,
          script:         cell.script,
          whatINeed:      cell.whatINeed,
          referenceLinks: cell.referenceLinks,
          done:           cell.done,
          _origin:        'ep',
        })
      }
    }
  }

  localStorage.setItem(POSTS_KEY,     JSON.stringify(merged))
  localStorage.setItem(DAY_NOTES_KEY, JSON.stringify(dayNotes))
  localStorage.setItem(MIGRATION_FLAG, '1')
}
