// Shared post store for the @maryluengog Personal Brand area.
// Both Content Calendar and Editorial Planner read/write the same key.
//
// Canonical post shape (v2):
//   { id, date: "YYYY-MM-DD",
//     platforms: ["ig_feed", "tiktok"],   // array — multi-platform supported
//     platform:  "ig_feed",                // legacy alias = platforms[0]
//     pillar:    "fashion",                // pillar id (string), or '' for none
//     title, script, notes,
//     timeOfDay, timeToFilm,
//     stage:     "idea"|"filming"|"editing"|"ready"|"posted",
//     checklist: { filmed, edited, captioned, scheduled, posted },
//     mediaLinks: [], referenceLinks: [], whatINeed }
//
// Old localStorage keys are left in place after migration as a backup.

import { useLocalStorage } from '../../hooks/useLocalStorage'

export const POSTS_KEY         = 'maryluengog_personal_brand_posts'
export const DAY_NOTES_KEY     = 'maryluengog_personal_brand_day_notes'
export const MIGRATION_FLAG    = 'maryluengog_personal_brand_migrated_v1'
export const MIGRATION_V2_FLAG = 'maryluengog_personal_brand_migrated_v2'
export const POSTS_BACKUP_KEY  = 'maryluengog_personal_brand_posts_backup'
export const PILLARS_KEY       = 'maryluengog_pillars'
export const EDITABLE_PLATFORMS_KEY = 'maryluengog_platforms'

// ─────────────── Pastel palette for editable pillars + platforms ────────────
export const PALETTE = [
  { id: 'pink',     hex: '#F0AEC4' },
  { id: 'peach',    hex: '#FFCFA8' },
  { id: 'lavender', hex: '#C4AAED' },
  { id: 'rose',     hex: '#FFB5A7' },
  { id: 'blush',    hex: '#A8C8EC' },
  { id: 'mint',     hex: '#9ED8C6' },
  { id: 'butter',   hex: '#F8E0A0' },
  { id: 'sage',     hex: '#C8E0B0' },
  { id: 'sand',     hex: '#E8D8C0' },
  { id: 'cloud',    hex: '#D8D8E8' },
]
export const PALETTE_BY_ID = Object.fromEntries(PALETTE.map(c => [c.id, c]))
export const colorHex = (id) => PALETTE_BY_ID[id]?.hex || '#E0E0E0'

// ─────────────── Default editable pillars + platforms ───────────────────────
export const DEFAULT_PILLARS = [
  { id: 'fashion',    label: 'Fashion',    color: 'pink'     },
  { id: 'beauty',     label: 'Beauty',     color: 'peach'    },
  { id: 'adhd',       label: 'ADHD',       color: 'lavender' },
  { id: 'maria_swim', label: 'María Swim', color: 'mint'     },
]

export const DEFAULT_EDITABLE_PLATFORMS = [
  { id: 'ig_feed',    label: 'IG Feed',    short: 'IG',    color: 'pink'     },
  { id: 'ig_reel',    label: 'IG Reel',    short: 'Reel',  color: 'peach'    },
  { id: 'ig_stories', label: 'IG Stories', short: 'Story', color: 'lavender' },
  { id: 'tiktok',     label: 'TikTok',     short: 'TT',    color: 'rose'     },
  { id: 'pinterest',  label: 'Pinterest',  short: 'Pin',   color: 'blush'    },
  { id: 'yt_shorts',  label: 'YT Shorts',  short: 'YT',    color: 'mint'     },
]

// ─────────────── Hooks for editable lists ───────────────────────────────────
export function usePillars()   { return useLocalStorage(PILLARS_KEY,            DEFAULT_PILLARS)            }
export function usePlatforms() { return useLocalStorage(EDITABLE_PLATFORMS_KEY, DEFAULT_EDITABLE_PLATFORMS) }

// Lookup helpers — tolerant of legacy `pillar: "Fashion"` (label) AND new id form
export function findPillar(pillars, val) {
  if (!val) return null
  return pillars.find(p => p.id === val)
      || pillars.find(p => p.label === val)
      || null
}
export function findPlatform(platforms, id) {
  if (!id) return null
  return platforms.find(p => p.id === id) || null
}

// Default emoji icons for the built-in platforms (the editable list doesn't store icons).
const PLATFORM_ICONS = {
  ig_feed: '📷', ig_reel: '🎬', ig_stories: '⭕',
  tiktok: '🎵', pinterest: '📌', yt_shorts: '▶️',
}
export function platformIcon(id) { return PLATFORM_ICONS[id] || '✨' }

export const STAGES = [
  { id: 'idea',    label: 'Idea'    },
  { id: 'filming', label: 'Filming' },
  { id: 'editing', label: 'Editing' },
  { id: 'ready',   label: 'Ready'   },
  { id: 'posted',  label: 'Posted'  },
]

export const CHECKLIST_FIELDS = ['filmed', 'edited', 'captioned', 'scheduled', 'posted']

export function emptyChecklist() {
  return Object.fromEntries(CHECKLIST_FIELDS.map(k => [k, false]))
}

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

// ─────────────── v2: singular `platform` → `platforms` array + new fields ────
//
// Adds: platforms[], stage, checklist{}, mediaLinks[], timeToFilm.
// Keeps: a singular `platform` alias (= platforms[0]) so older code paths that
//   read post.platform still work until everything is updated.
// Backs up the entire pre-v2 array to POSTS_BACKUP_KEY before mutating.
// Idempotent: guarded by MIGRATION_V2_FLAG.

function normalizePostV2(p) {
  // Already v2-shaped if `platforms` is an array
  let platforms
  if (Array.isArray(p.platforms) && p.platforms.length > 0) {
    platforms = p.platforms
  } else if (typeof p.platform === 'string' && p.platform) {
    platforms = [p.platform]
  } else {
    platforms = []
  }

  // Map old `done: true` → checklist.posted + stage 'posted'
  const checklist = (p.checklist && typeof p.checklist === 'object')
    ? { ...emptyChecklist(), ...p.checklist }
    : (p.done === true
        ? { ...emptyChecklist(), posted: true }
        : emptyChecklist())

  // Stage: prefer existing, else infer from old `status` (CC) or `done` (EP), else 'idea'
  let stage = p.stage
  if (!stage) {
    const s = (p.status || '').toLowerCase()
    if (p.done === true)        stage = 'posted'
    else if (s === 'posted')    stage = 'posted'
    else if (s === 'scheduled') stage = 'ready'
    else if (s === 'editing')   stage = 'editing'
    else if (s === 'filming')   stage = 'filming'
    else                        stage = 'idea'
  }

  // mediaLinks: new in v2; default empty
  const mediaLinks = Array.isArray(p.mediaLinks) ? p.mediaLinks.filter(l => typeof l === 'string') : []

  // timeToFilm: new in v2; pull from CC's `filmTime` if present
  const timeToFilm = p.timeToFilm ?? p.filmTime ?? ''

  return {
    ...p,
    id:        p.id || genId(),
    platforms,
    platform:  platforms[0] || p.platform || '',  // legacy alias (read-only)
    stage,
    checklist,
    mediaLinks,
    timeToFilm,
    referenceLinks: Array.isArray(p.referenceLinks) ? p.referenceLinks.filter(l => typeof l === 'string') : [],
  }
}

export function migrateV2IfNeeded() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(MIGRATION_V2_FLAG) === '1') return

  const raw      = localStorage.getItem(POSTS_KEY)
  const existing = safeParse(raw, [])
  const before   = Array.isArray(existing) ? existing.length : 0

  // Backup before mutating (overwrite-safe; only set if not already backed up)
  if (raw && !localStorage.getItem(POSTS_BACKUP_KEY)) {
    localStorage.setItem(POSTS_BACKUP_KEY, raw)
  }

  const migrated = (Array.isArray(existing) ? existing : []).map(normalizePostV2)
  const after    = migrated.length

  localStorage.setItem(POSTS_KEY, JSON.stringify(migrated))
  localStorage.setItem(MIGRATION_V2_FLAG, '1')

  // Console report so the user can verify nothing was dropped
  /* eslint-disable no-console */
  console.log(
    `%c[PersonalBrand v2 migration]%c posts before=${before} → after=${after}` +
    (before === after ? ' ✓ no posts lost' : ' ⚠️ COUNT MISMATCH'),
    'color:#B83060;font-weight:700', 'color:inherit'
  )
  if (raw) console.log('  backup saved to localStorage["' + POSTS_BACKUP_KEY + '"]')
  /* eslint-enable no-console */
}
