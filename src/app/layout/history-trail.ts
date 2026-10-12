/** Where the window stands in its own history: the location keys it has seen and the current one. */
export interface Trail {
  keys: string[]
  pos: number
}

const STORAGE_KEY = 'hematologist-history-trail'

export function readTrail(): Trail | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const trail = JSON.parse(raw) as Trail
    return Array.isArray(trail.keys) && typeof trail.pos === 'number' ? trail : null
  } catch {
    return null
  }
}

export function writeTrail(trail: Trail) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trail))
  } catch {
    // Without storage the buttons still work; only their enabled state resets on a reload.
  }
}

/**
 * The next trail after a navigation: a push cuts off the forward part like a browser does, a
 * replace swaps the current entry, and back or forward (a pop) moves to the key already seen.
 */
export function stepTrail(
  trail: Trail | null,
  key: string,
  type: 'PUSH' | 'REPLACE' | 'POP',
): Trail {
  if (!trail) return { keys: [key], pos: 0 }
  if (trail.keys[trail.pos] === key) return trail
  if (type === 'PUSH') {
    const keys = [...trail.keys.slice(0, trail.pos + 1), key]
    return { keys, pos: keys.length - 1 }
  }
  if (type === 'REPLACE') {
    const keys = [...trail.keys]
    keys[trail.pos] = key
    return { keys, pos: trail.pos }
  }
  const index = trail.keys.indexOf(key)
  return index >= 0 ? { keys: trail.keys, pos: index } : { keys: [key], pos: 0 }
}
