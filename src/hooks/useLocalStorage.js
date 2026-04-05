import { useState, useEffect } from 'react'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  // Listen for external writes to this key.
  // This fires when:
  //   • Another browser tab changes the key (native 'storage' event)
  //   • The sync layer pulls remote data and dispatches a synthetic StorageEvent
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== key || e.storageArea !== localStorage) return
      try {
        setValue(e.newValue !== null ? JSON.parse(e.newValue) : initialValue)
      } catch {
        setValue(initialValue)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStoredValue = (newValue) => {
    try {
      const valueToStore =
        typeof newValue === 'function' ? newValue(value) : newValue
      setValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.warn('localStorage write failed:', error)
    }
  }

  return [value, setStoredValue]
}
