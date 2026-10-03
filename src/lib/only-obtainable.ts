import { useSyncExternalStore } from 'react'

/**
 * Whether the physician wants courses that cannot be obtained left out of the lists. One setting
 * for the whole app — the disease pages and the calculator's regimen list — kept in the browser
 * so it survives a reload. Storage may be missing or refuse (private window, blocked site data);
 * the setting then lives for the session only.
 */
const KEY = 'hp.onlyObtainable'
const listeners = new Set<() => void>()
let current: boolean | null = null

function read(): boolean {
  if (current === null) {
    try {
      current = window.localStorage.getItem(KEY) === '1'
    } catch {
      current = false
    }
  }
  return current
}

export function setOnlyObtainable(value: boolean): void {
  current = value
  try {
    window.localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    // The choice still holds for this session.
  }
  for (const listener of listeners) listener()
}

/** Forget the cached value; the next read goes back to storage. For tests. */
export function resetOnlyObtainable(): void {
  current = null
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOnlyObtainable(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, read, () => false)
  return [value, setOnlyObtainable]
}
