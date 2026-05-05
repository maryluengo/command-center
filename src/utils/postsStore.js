// Unified posts store for the @maryluengog Personal Brand area.
// Single source of truth for Content Ideas, Content Calendar, and Editorial Planner.
//
// Storage key: "maryluengog_posts_v1" — a flat array of post objects.
// Migration flag: "maryluengog_posts_migrated_v1" — set to "1" once import has run.
//
// Post shape:
//   { id, title, caption, pillar, format, hook, structure, seo, voiceStyle,
//     status: "idea" | "scheduled" | "posted",
//     scheduledDate: "YYYY-MM-DD" | null,
//     scheduledTime: "HH:MM" | null,
//     platform: "Instagram" | "TikTok" | "Both" | string,
//     postedDate:  "YYYY-MM-DD" | null,
//     createdAt: ISO, updatedAt: ISO,
//     source: "ai" | "manual",
//     notes: string }

export const STORE_KEY      = 'maryluengog_posts_v1'
export const MIGRATION_FLAG = 'maryluengog_posts_migrated_v1'

const LEGACY = {
  ideas:     'content-ideas-brand',
  unifiedV2: 'maryluengog_personal_brand_posts',
  calendar:  'cal-entries-brand',
  editorial: 'commandCenter_personalBrandEditorial',
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeParse(raw, fallback) {
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

function nowIso()    { return new Date().toISOString() }
function todayDate() { return nowIso().slice(0, 10) }

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function readAll() {
  if (!hasStorage()) return []
  return safeParse(localStorage.getItem(STORE_KEY), [])
}

function writeAll(arr) {
  if (!hasStorage()) return
  localStorage.setItem(STORE_KEY, JSON.stringify(arr))
}

// Build a post object with safe defaults for any missing field.
function buildPost(input = {}) {
  const ts = nowIso()
  return {
    id:            input.id            || newId(),
    title:         input.title         || '',
    caption:       input.caption       || '',
    pillar:        input.pillar        || '',
    format:        input.format        || '',
    hook:          input.hook          || '',
    structure:     input.structure     || '',
    seo:           input.seo           || '',
    voiceStyle:    input.voiceStyle    || '',
    status:        ['idea','scheduled','posted'].includes(input.status) ? input.status : 'idea',
    scheduledDate: input.scheduledDate || null,
    scheduledTime: input.scheduledTime || null,
    platform:      input.platform      || '',
    postedDate:    input.postedDate    || null,
    createdAt:     input.createdAt     || ts,
    updatedAt:     input.updatedAt     || ts,
    source:        input.source === 'ai' ? 'ai' : 'manual',
    notes:         input.notes         || '',
  }
}

// ─── Read API ───────────────────────────────────────────────────────────────

export function getAllPosts() {
  return readAll()
}

export function getPostById(id) {
  if (!id) return null
  return readAll().find(p => p.id === id) || null
}

export function getPostsByStatus(status) {
  return readAll().filter(p => p.status === status)
}

export function getPostsByDate(dateString) {
  if (!dateString) return []
  return readAll().filter(p =>
    p.status === 'scheduled' && p.scheduledDate === dateString
  )
}

export function getPostsInDateRange(startDate, endDate) {
  if (!startDate || !endDate) return []
  return readAll().filter(p =>
    p.status        === 'scheduled' &&
    p.scheduledDate &&
    p.scheduledDate >= startDate    &&
    p.scheduledDate <= endDate
  )
}

// ─── Write API ──────────────────────────────────────────────────────────────

export function addPost(postData) {
  const post = buildPost(postData)
  const all  = readAll()
  all.push(post)
  writeAll(all)
  return post
}

export function updatePost(id, updates) {
  if (!id) return null
  const all = readAll()
  const i   = all.findIndex(p => p.id === id)
  if (i === -1) return null
  // Disallow id/createdAt overwrite via updates.
  const { id: _ignoreId, createdAt: _ignoreCreated, ...safe } = updates || {}
  all[i] = { ...all[i], ...safe, updatedAt: nowIso() }
  writeAll(all)
  return all[i]
}

export function deletePost(id) {
  if (!id) return false
  const all      = readAll()
  const filtered = all.filter(p => p.id !== id)
  if (filtered.length === all.length) return false
  writeAll(filtered)
  return true
}

export function schedulePost(id, dateString, timeString, platform) {
  return updatePost(id, {
    status:        'scheduled',
    scheduledDate: dateString || null,
    scheduledTime: timeString || null,
    platform:      platform   || '',
    postedDate:    null,
  })
}

export function markAsPosted(id) {
  return updatePost(id, {
    status:     'posted',
    postedDate: todayDate(),
  })
}

export function moveBackToScheduled(id) {
  return updatePost(id, {
    status:     'scheduled',
    postedDate: null,
  })
}

export function moveBackToIdea(id) {
  return updatePost(id, {
    status:        'idea',
    scheduledDate: null,
    scheduledTime: null,
    postedDate:    null,
  })
}

// ─── Migration ──────────────────────────────────────────────────────────────

// Pillar id → human label (legacy v2 store uses ids).
const PILLAR_LABELS = {
  fashion:    'Fashion',
  beauty:     'Beauty',
  adhd:       'ADHD',
  real_life:  'Real Life',
  maria_swim: 'María Swim',
}
function pillarLabel(p) {
  if (!p) return ''
  return PILLAR_LABELS[p] || p
}

// Platform-id (v2/EP) → format name.
const FORMAT_FROM_PLATFORM_ID = {
  ig_reel:    'Reel',
  ig_feed:    'Carousel',
  ig_stories: 'Story',
  tiktok:     'Reel',
  pinterest:  'Static Post',
  yt_shorts:  'Reel',
}

// CC's stringy platform → format name.
const FORMAT_FROM_CC_STRING = {
  'Instagram Reel':     'Reel',
  'Instagram Carousel': 'Carousel',
  'Instagram Feed':     'Carousel',
  'Instagram Story':    'Story',
  'Instagram Stories':  'Story',
  'TikTok':             'Reel',
  'Pinterest':          'Static Post',
  'YouTube Short':      'Reel',
  'YouTube Shorts':     'Reel',
}

// EP nested platform key → unified platform id.
const EP_PLATFORM_KEY = {
  instagramFeed:    'ig_feed',
  instagramReel:    'ig_reel',
  instagramStories: 'ig_stories',
  tiktok:           'tiktok',
  pinterest:        'pinterest',
  youtubeShorts:    'yt_shorts',
}

const EP_DAY_OFFSET = { monday:0, tuesday:1, wednesday:2, thursday:3, friday:4, saturday:5, sunday:6 }

// Normalize an array of platform ids → "Instagram" | "TikTok" | "Both" | passthrough.
function platformLabelFromIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return ''
  const hasIG = ids.some(p => typeof p === 'string' && p.startsWith('ig_'))
  const hasTT = ids.includes('tiktok')
  if (hasIG && hasTT) return 'Both'
  if (hasIG)          return 'Instagram'
  if (hasTT)          return 'TikTok'
  // Pinterest / YT Shorts / unknown — pass the first id through capitalized.
  const first = String(ids[0])
  return first.charAt(0).toUpperCase() + first.slice(1).replace(/_/g, ' ')
}

// CC platform string → "Instagram" | "TikTok" | "Both"
function platformLabelFromCcString(s) {
  if (!s) return ''
  if (s === 'TikTok')                  return 'TikTok'
  if (s.startsWith('Instagram'))       return 'Instagram'
  return s
}

function addDaysIso(weekStartIso, n) {
  const [y, m, d] = weekStartIso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, '0'),
    String(dt.getDate()).padStart(2, '0'),
  ].join('-')
}

// Convert a Content Ideas card → unified post.
function fromIdea(idea) {
  const isDone = idea.status === 'Done'
  return buildPost({
    id:        idea.id,
    title:     idea.title       || '',
    structure: idea.description || '',
    pillar:    idea.pillar      || '',
    platform:  idea.platform    || '',
    status:    isDone ? 'posted' : 'idea',
    postedDate:isDone ? todayDate() : null,
    notes:     '',
    source:    'manual',
  })
}

// Convert a unified-v2 post (already merged from CC+EP) → new unified post.
function fromV2(p) {
  const platformIds = Array.isArray(p.platforms) && p.platforms.length
    ? p.platforms
    : (p.platform ? [p.platform] : [])
  const firstId = platformIds[0]
  const isPosted = p.stage === 'posted' || p.checklist?.posted === true
  const status   = isPosted ? 'posted' : (p.date ? 'scheduled' : 'idea')

  return buildPost({
    id:            p.id,
    title:         p.title  || '',
    caption:       p.caption || '',
    pillar:        pillarLabel(p.pillar),
    format:        FORMAT_FROM_PLATFORM_ID[firstId] || '',
    structure:     p.script || p.structure || '',
    hook:          p.hook   || '',
    seo:           p.seo    || '',
    voiceStyle:    p.voiceStyle || '',
    status,
    scheduledDate: status === 'scheduled' ? (p.date || null) : null,
    scheduledTime: p.timeOfDay || null,
    platform:      platformLabelFromIds(platformIds),
    postedDate:    status === 'posted' ? (p.date || null) : null,
    createdAt:     p.createdAt,
    updatedAt:     p.updatedAt,
    notes:         p.notes  || '',
    source:        'manual',
  })
}

// Convert a raw Content Calendar entry → unified post.
function fromCcEntry(e) {
  if (!e || !e.date) return null
  const isPosted = (e.status || '').toLowerCase() === 'posted'
  return buildPost({
    id:            e.id,
    title:         e.title   || '',
    caption:       e.caption || '',
    pillar:        e.pillar  || '',
    format:        FORMAT_FROM_CC_STRING[e.platform] || '',
    structure:     e.script  || '',
    status:        isPosted ? 'posted' : 'scheduled',
    scheduledDate: isPosted ? null : e.date,
    scheduledTime: null,
    platform:      platformLabelFromCcString(e.platform),
    postedDate:    isPosted ? e.date : null,
    notes:         e.notes   || '',
    source:        'manual',
  })
}

// Walk the nested EP weeks/days/platforms tree → flat unified posts.
function fromEpTree(tree) {
  const out   = []
  const weeks = tree?.weeks || {}
  for (const [weekStart, weekData] of Object.entries(weeks)) {
    if (!weekData || typeof weekData !== 'object') continue
    for (const [day, dayData] of Object.entries(weekData)) {
      if (!dayData || typeof dayData !== 'object') continue
      const offset = EP_DAY_OFFSET[day]
      if (offset === undefined) continue
      const date = addDaysIso(weekStart, offset)
      for (const [epKey, cell] of Object.entries(dayData)) {
        if (epKey.startsWith('_')) continue
        const platformId = EP_PLATFORM_KEY[epKey]
        if (!platformId) continue
        if (!cell || !cell.title) continue
        const isPosted = cell.done === true
        out.push(buildPost({
          title:         cell.title    || '',
          caption:       cell.caption  || '',
          pillar:        pillarLabel(cell.pillar),
          format:        FORMAT_FROM_PLATFORM_ID[platformId] || '',
          structure:     cell.script   || '',
          status:        isPosted ? 'posted' : 'scheduled',
          scheduledDate: isPosted ? null : date,
          scheduledTime: cell.timeOfDay || null,
          platform:      platformLabelFromIds([platformId]),
          postedDate:    isPosted ? date : null,
          notes:         cell.notes    || '',
          source:        'manual',
        }))
      }
    }
  }
  return out
}

// One-time migration. Idempotent: guarded by MIGRATION_FLAG.
// Reads from legacy keys, writes the unified array, preserves legacy keys as backup.
export function migrateExistingData() {
  if (!hasStorage()) return { migrated: 0, skipped: true }
  if (localStorage.getItem(MIGRATION_FLAG) === '1') {
    return { migrated: 0, skipped: true, alreadyMigrated: true }
  }

  const existing  = readAll()
  const merged    = [...existing]
  const seenIds   = new Set(merged.map(p => p.id))

  // 1. Content Ideas — flat array of card objects.
  const ideasRaw = safeParse(localStorage.getItem(LEGACY.ideas), [])
  if (Array.isArray(ideasRaw)) {
    for (const idea of ideasRaw) {
      const post = fromIdea(idea || {})
      if (!seenIds.has(post.id)) {
        merged.push(post)
        seenIds.add(post.id)
      }
    }
  }

  // 2. Unified-v2 store (already absorbs CC + EP from prior migration).
  const v2Raw = safeParse(localStorage.getItem(LEGACY.unifiedV2), [])
  const v2Arr = Array.isArray(v2Raw) ? v2Raw : []
  if (v2Arr.length > 0) {
    for (const p of v2Arr) {
      const post = fromV2(p || {})
      if (!seenIds.has(post.id)) {
        merged.push(post)
        seenIds.add(post.id)
      }
    }
  } else {
    // Fallback: only pull raw CC + EP if v2 hasn't been built yet.
    const ccRaw = safeParse(localStorage.getItem(LEGACY.calendar), [])
    if (Array.isArray(ccRaw)) {
      for (const e of ccRaw) {
        const post = fromCcEntry(e)
        if (post && !seenIds.has(post.id)) {
          merged.push(post)
          seenIds.add(post.id)
        }
      }
    }
    const epRaw = safeParse(localStorage.getItem(LEGACY.editorial), null)
    if (epRaw && typeof epRaw === 'object') {
      for (const post of fromEpTree(epRaw)) {
        merged.push(post)
        seenIds.add(post.id)
      }
    }
  }

  writeAll(merged)
  localStorage.setItem(MIGRATION_FLAG, '1')

  return { migrated: merged.length - existing.length, skipped: false }
}
