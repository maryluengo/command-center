import { useLocalStorage } from './useLocalStorage'

/**
 * Manages a customizable list of options backed by localStorage.
 * @param {string} key  - unique key (e.g. "pillars", "platforms")
 * @param {string[]} defaults - fallback options
 */
export function useCustomOptions(key, defaults) {
  const [options, setOptions] = useLocalStorage(`custom-opts-${key}`, defaults)

  const add = (name) => {
    const trimmed = name.trim()
    if (!trimmed || options.includes(trimmed)) return
    setOptions(prev => [...prev, trimmed])
  }

  const remove = (name) => {
    setOptions(prev => prev.filter(o => o !== name))
  }

  const rename = (oldName, newName) => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return
    setOptions(prev => prev.map(o => (o === oldName ? trimmed : o)))
  }

  const reset = () => setOptions(defaults)

  return { options, add, remove, rename, reset, setOptions }
}
