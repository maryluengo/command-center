import { useState, useEffect, useRef, useCallback } from 'react'

// ── Keys to sync across devices ──────────────────────────────────────────────
// Add any new localStorage key here to include it in cross-device sync.
// Do NOT include large/stale caches (analytics, AI text) or auth tokens.
export const SYNC_KEYS = [
  // Schedule
  'schedule-events',
  'schedule-v3-migrated',
  // Personal to-do lists (one per section)
  'todos-schedule',
  'todos-brand',
  'todos-swim',
  'todos-agency',
  // Medications
  'meds-list',
  'meds-logs',
  // Content ideas board
  'content-ideas-brand',
  // User-defined custom options
  'custom-opts-schedule-cats',
  'custom-opts-ideas-pillars',
  // Content Strategy
  'commandCenter_contentStrategy',
  // Personal Brand Editorial Planner
  'commandCenter_personalBrandEditorial',
]

// ── Read all SYNC_KEYS from localStorage → plain object ──────────────────────
function collectLocalData() {
  const out = {}
  for (const key of SYNC_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) out[key] = JSON.parse(raw)
    } catch { /* skip corrupt entries */ }
  }
  return out
}

// ── Write remote data into localStorage, fire synthetic storage events ────────
// Returns list of keys that actually changed.
function applyRemoteData(remote) {
  if (!remote || typeof remote !== 'object') return []
  const changed = []
  for (const key of SYNC_KEYS) {
    if (!(key in remote)) continue
    const newVal = JSON.stringify(remote[key])
    const oldVal = localStorage.getItem(key)
    if (oldVal === newVal) continue
    localStorage.setItem(key, newVal)
    // Dispatch a synthetic storage event so useLocalStorage hooks re-render
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        oldValue:    oldVal,
        newValue:    newVal,
        storageArea: localStorage,
        url:         window.location.href,
      })
    )
    changed.push(key)
  }
  return changed
}

// ── Sync hook ─────────────────────────────────────────────────────────────────
export function useDataSync() {
  const [status,     setStatus]     = useState('idle')   // idle | syncing | synced | error
  const [lastSynced, setLastSynced] = useState(null)
  const [configured, setConfigured] = useState(false)

  const enabled   = useRef(false)   // true once we know the backend is configured
  const pushTimer = useRef(null)
  const pushing   = useRef(false)   // guard: avoid concurrent pushes

  // ── Push local → remote ────────────────────────────────────────────────
  const push = useCallback(async () => {
    if (!enabled.current || pushing.current) return
    pushing.current = true
    setStatus('syncing')
    try {
      const res = await fetch('/api/data', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: collectLocalData() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('synced')
      setLastSynced(new Date())
    } catch (err) {
      console.warn('[sync] push failed:', err.message)
      setStatus('error')
    } finally {
      pushing.current = false
    }
  }, [])

  // ── Debounced push (called by the localStorage patch) ─────────────────
  const schedulePush = useCallback(() => {
    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(push, 3000)
  }, [push])

  // ── On mount: pull remote → local, then patch localStorage ────────────
  useEffect(() => {
    let applyingRemote = false  // prevents the patch from re-triggering on our own writes

    async function initialPull() {
      try {
        setStatus('syncing')
        const res  = await fetch('/api/data')
        const body = await res.json()

        if (!body.configured) {
          // Env vars not set — sync disabled, app works normally with localStorage
          setStatus('idle')
          setConfigured(false)
          return
        }

        setConfigured(true)
        enabled.current = true

        const remote    = body.data
        const localData = collectLocalData()
        const localHasData = Object.keys(localData).length > 0

        if (!remote || Object.keys(remote).length === 0) {
          // Remote is empty — push local data up as initial seed
          if (localHasData) await push()
        } else {
          // Remote has data — apply it locally
          applyingRemote = true
          const changed = applyRemoteData(remote)
          applyingRemote = false
          if (changed.length > 0) {
            console.log('[sync] pulled', changed.length, 'keys from remote:', changed)
          }
        }
        setStatus('synced')
        setLastSynced(new Date())
      } catch (err) {
        console.warn('[sync] initial pull failed:', err.message)
        setStatus('error')
        setConfigured(false)
      }
    }

    initialPull()

    // Patch window.localStorage.setItem to auto-detect changes
    const origSetItem = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem')
    const origFn      = origSetItem.value

    Storage.prototype.setItem = function patchedSetItem(key, value) {
      origFn.call(this, key, value)
      // Only react to SYNC_KEYS written to window.localStorage (not sessionStorage)
      if (
        !applyingRemote &&
        enabled.current &&
        this === window.localStorage &&
        SYNC_KEYS.includes(key)
      ) {
        clearTimeout(pushTimer.current)
        pushTimer.current = setTimeout(push, 3000)
      }
    }

    return () => {
      // Restore original setItem on cleanup
      Storage.prototype.setItem = origFn
      clearTimeout(pushTimer.current)
    }
  }, [push]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push on page unload (best-effort via sendBeacon) ──────────────────
  useEffect(() => {
    const handler = () => {
      if (!enabled.current) return
      try {
        const blob = new Blob(
          [JSON.stringify({ data: collectLocalData() })],
          { type: 'application/json' }
        )
        navigator.sendBeacon?.('/api/data', blob)
      } catch { /* ignore */ }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  return { status, lastSynced, configured }
}
