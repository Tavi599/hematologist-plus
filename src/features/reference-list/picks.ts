import { useSyncExternalStore } from 'react'

/** Which reference list a pick belongs to. */
export type ListKind = 'diseases' | 'scores'

/**
 * Per list: favourites, the last few items opened and the groups folded away. Kept in this
 * browser only: the physician asked (2026-11-01) for favourites to follow a login, but the app
 * has no login — the site is read-only against the database — so where they live for real is a
 * decision still to be made. Storage may be missing or refuse (private window, blocked site
 * data); the picks then last for the session.
 */
export type Picks = { favorites: string[]; recent: string[]; collapsed: string[] }

const RECENT_LIMIT = 5
const EMPTY: Picks = { favorites: [], recent: [], collapsed: [] }
const listeners = new Set<() => void>()
const cache = new Map<ListKind, Picks>()

const keyOf = (list: ListKind) => `hp.reference.${list}`

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function read(list: ListKind): Picks {
  const cached = cache.get(list)
  if (cached) return cached
  let picks = EMPTY
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(keyOf(list)) ?? 'null')
    if (raw !== null && typeof raw === 'object') {
      const { favorites, recent, collapsed } = raw as Record<string, unknown>
      picks = {
        favorites: strings(favorites),
        recent: strings(recent).slice(0, RECENT_LIMIT),
        collapsed: strings(collapsed),
      }
    }
  } catch {
    // Unreadable storage starts empty.
  }
  cache.set(list, picks)
  return picks
}

function write(list: ListKind, picks: Picks): void {
  cache.set(list, picks)
  try {
    window.localStorage.setItem(keyOf(list), JSON.stringify(picks))
  } catch {
    // The picks still hold for this session.
  }
  for (const listener of listeners) listener()
}

const toggled = (items: string[], id: string) =>
  items.includes(id) ? items.filter((item) => item !== id) : [...items, id]

export function toggleFavorite(list: ListKind, id: string): void {
  const picks = read(list)
  write(list, { ...picks, favorites: toggled(picks.favorites, id) })
}

/** Moves `id` to the front of the recent list. */
export function visit(list: ListKind, id: string): void {
  const picks = read(list)
  if (picks.recent[0] === id) return
  const recent = [id, ...picks.recent.filter((item) => item !== id)].slice(0, RECENT_LIMIT)
  write(list, { ...picks, recent })
}

export function toggleCollapsed(list: ListKind, group: string): void {
  const picks = read(list)
  write(list, { ...picks, collapsed: toggled(picks.collapsed, group) })
}

/** Folds every group in `groups` away, or opens them all. */
export function setAllCollapsed(list: ListKind, groups: string[], collapsed: boolean): void {
  const picks = read(list)
  const rest = picks.collapsed.filter((item) => !groups.includes(item))
  write(list, { ...picks, collapsed: collapsed ? [...rest, ...groups] : rest })
}

/** Forget the cached picks; the next read goes back to storage. For tests. */
export function resetPicks(): void {
  cache.clear()
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePicks(list: ListKind): Picks {
  return useSyncExternalStore(
    subscribe,
    () => read(list),
    () => EMPTY,
  )
}
