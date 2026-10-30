import { useSyncExternalStore } from 'react'

/**
 * How the handbook is shown: in Ukrainian, in the original English, or both at
 * once — the Ukrainian paragraph with its English original right under it.
 *
 * The third mode is the point of the whole feature. A reader who wants to check
 * a translation against the original should not have to switch language and
 * then hunt for where the passage went; in `both` the two sit together, so the
 * eye never leaves the place. Switching between `uk` and `en` keeps the place
 * too — `useKeepReadingPlace` pins the block that was on screen.
 *
 * The choice is one setting for the whole handbook and is kept in this
 * browser. Storage may be missing or refuse (private window, blocked site
 * data); the setting then lives for the session only.
 */
export const HANDBOOK_VIEWS = ['uk', 'en', 'both'] as const
export type HandbookView = (typeof HANDBOOK_VIEWS)[number]

const KEY = 'hp.handbookView'
const DEFAULT_VIEW: HandbookView = 'both'
const listeners = new Set<() => void>()
let current: HandbookView | null = null

function read(): HandbookView {
  if (current === null) {
    try {
      const stored = window.localStorage.getItem(KEY)
      current = HANDBOOK_VIEWS.includes(stored as HandbookView)
        ? (stored as HandbookView)
        : DEFAULT_VIEW
    } catch {
      current = DEFAULT_VIEW
    }
  }
  return current
}

export function setHandbookView(value: HandbookView): void {
  current = value
  try {
    window.localStorage.setItem(KEY, value)
  } catch {
    // The choice still holds for this session.
  }
  for (const listener of listeners) listener()
}

/** Forget the cached value; the next read goes back to storage. For tests. */
export function resetHandbookView(): void {
  current = null
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useHandbookView(): [HandbookView, (value: HandbookView) => void] {
  const value = useSyncExternalStore(subscribe, read, () => DEFAULT_VIEW)
  return [value, setHandbookView]
}
