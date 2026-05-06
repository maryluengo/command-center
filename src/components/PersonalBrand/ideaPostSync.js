// Bridge between Content Ideas (`content-ideas-brand`) and the unified
// Editorial Planner / Content Calendar store (`maryluengog_personal_brand_posts`).
//
// Functions write to localStorage directly and dispatch a synthetic StorageEvent
// so any `useLocalStorage` hook in the same tab re-renders — same trick
// `useDataSync.applyRemoteData` uses for cross-device pulls.

const IDEAS_KEY = 'content-ideas-brand'
const POSTS_KEY = 'maryluengog_personal_brand_posts'

// ─── localStorage helpers ───────────────────────────────────────────────────

function readJson(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof localStorage === 'undefined') return
  const oldVal = localStorage.getItem(key)
  const newVal = JSON.stringify(value)
  if (oldVal === newVal) return
  localStorage.setItem(key, newVal)
  // Notify same-tab `useLocalStorage` listeners.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      oldValue:    oldVal,
      newValue:    newVal,
      storageArea: localStorage,
      url:         window.location.href,
    }))
  }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ─── Platform mapping ───────────────────────────────────────────────────────
//
// Content Ideas store the platform as a single human label
// ('Instagram' | 'TikTok' | 'Both' | 'YouTube Short'). The post store uses
// platform ids that match the editable platform list (`postsStore.PLATFORMS`).

export const PLATFORM_MAP_FROM_IDEA = {
  'Instagram':     ['ig_reel'],
  'TikTok':        ['tiktok'],
  'Both':          ['ig_reel', 'tiktok'],
  'YouTube Short': ['yt_shorts'],
}

export function mapIdeaPlatformToIds(ideaPlatform) {
  return PLATFORM_MAP_FROM_IDEA[ideaPlatform] || ['ig_reel']
}

// ─── Bridge primitives ──────────────────────────────────────────────────────

// Set the linked-post pointer (and scheduledDate cache) on an idea.
export function syncIdeaToPost(ideaId, postId) {
  if (!ideaId) return
  const ideas = readJson(IDEAS_KEY, [])
  const idx   = ideas.findIndex(i => i.id === ideaId)
  if (idx === -1) return
  const post = postId ? readJson(POSTS_KEY, []).find(p => p.id === postId) : null
  ideas[idx] = {
    ...ideas[idx],
    linkedPostId:  postId || null,
    scheduledDate: post?.date || null,
  }
  writeJson(IDEAS_KEY, ideas)
}

// Materialize a post from an idea + scheduling input. Appends to the posts
// store and links the idea (status → 'Scheduled', linkedPostId, scheduledDate).
// Returns the new post.
export function createPostFromIdea(idea, { date, time, platforms }) {
  if (!idea || !date) return null
  const platIds = (Array.isArray(platforms) && platforms.length > 0)
    ? platforms
    : mapIdeaPlatformToIds(idea.platform)

  const newPost = {
    id:             genId(),
    date,
    platforms:      platIds,
    platform:       platIds[0],
    pillar:         idea.pillar || '',
    title:          idea.title  || '',
    timeOfDay:      time || '',
    timeToFilm:     '',
    stage:          'idea',
    checklist:      { filmed: false, edited: false, captioned: false, scheduled: true, posted: false },
    script:         '',
    whatINeed:      '',
    mediaLinks:     [],
    referenceLinks: Array.isArray(idea.links) ? idea.links.filter(l => typeof l === 'string' && l.trim()) : [],
    notes:          idea.description || '',
    done:           false,
    manuallyEdited: false,
    sourceIdeaId:   idea.id,
  }

  const posts = readJson(POSTS_KEY, [])
  writeJson(POSTS_KEY, [...posts, newPost])

  const ideas = readJson(IDEAS_KEY, [])
  const idx   = ideas.findIndex(i => i.id === idea.id)
  if (idx !== -1) {
    ideas[idx] = {
      ...ideas[idx],
      status:        'Scheduled',
      linkedPostId:  newPost.id,
      scheduledDate: date,
    }
    writeJson(IDEAS_KEY, ideas)
  }
  return newPost
}

// Move an existing post to a new date / time / platforms (no duplicate).
// Triggers onPostUpdated so the linked idea's scheduledDate stays in sync.
export function reschedulePost(postId, { date, time, platforms }) {
  if (!postId) return null
  const posts = readJson(POSTS_KEY, [])
  const idx   = posts.findIndex(p => p.id === postId)
  if (idx === -1) return null
  const platIds = (Array.isArray(platforms) && platforms.length > 0)
    ? platforms
    : (Array.isArray(posts[idx].platforms) ? posts[idx].platforms : [])
  const updated = {
    ...posts[idx],
    date:      date || posts[idx].date,
    timeOfDay: time !== undefined ? time : (posts[idx].timeOfDay || ''),
    platforms: platIds,
    platform:  platIds[0] || posts[idx].platform || '',
  }
  posts[idx] = updated
  writeJson(POSTS_KEY, posts)
  onPostUpdated(updated)
  return updated
}

// ─── Lifecycle hooks (called by EP / Calendar handlers) ─────────────────────

// Called whenever a post is created or updated. If the post has a `sourceIdeaId`,
// update the linked idea's date cache and posted-status.
export function onPostUpdated(post) {
  if (!post || !post.sourceIdeaId) return
  const ideas = readJson(IDEAS_KEY, [])
  const idx   = ideas.findIndex(i => i.id === post.sourceIdeaId)
  if (idx === -1) return
  const isPosted = post.checklist?.posted === true || post.stage === 'posted'
  // If post has been marked posted → idea is Posted.
  // If post was Posted but is no longer → revert idea to Scheduled.
  // Otherwise keep whatever status the idea has (user may have set 'Developing' etc).
  const currStatus = ideas[idx].status
  let nextStatus   = currStatus
  if (isPosted)                             nextStatus = 'Posted'
  else if (currStatus === 'Posted')         nextStatus = 'Scheduled'
  else if (currStatus !== 'Scheduled')      nextStatus = 'Scheduled' // keep linked ideas in scheduled state
  ideas[idx] = {
    ...ideas[idx],
    linkedPostId:  post.id,
    scheduledDate: post.date || ideas[idx].scheduledDate || null,
    status:        nextStatus,
  }
  writeJson(IDEAS_KEY, ideas)
}

// Called when a post is removed (delete or clear-week).
// Reset the linked idea so the user can reschedule it. Idea is NOT deleted.
export function onPostDeleted(post) {
  if (!post || !post.sourceIdeaId) return
  const ideas = readJson(IDEAS_KEY, [])
  const idx   = ideas.findIndex(i => i.id === post.sourceIdeaId)
  if (idx === -1) return
  ideas[idx] = {
    ...ideas[idx],
    status:        'Ready to Film',
    linkedPostId:  null,
    scheduledDate: null,
  }
  writeJson(IDEAS_KEY, ideas)
}

// Called when an idea is deleted. Leave the linked post intact, just
// null out its `sourceIdeaId` so it stops trying to sync back.
export function onIdeaDeleted(idea) {
  if (!idea || !idea.linkedPostId) return
  const posts = readJson(POSTS_KEY, [])
  const idx   = posts.findIndex(p => p.id === idea.linkedPostId)
  if (idx === -1) return
  posts[idx] = { ...posts[idx], sourceIdeaId: null }
  writeJson(POSTS_KEY, posts)
}
