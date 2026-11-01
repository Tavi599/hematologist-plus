import { useSyncExternalStore } from 'react'

/**
 * How the application looks, apart from light and dark: a colour palette for every page, and
 * whether the reference lists (diseases, scores) are a table or tiles. One setting per device,
 * kept in the browser; storage may be missing or refuse, and the choice then lasts the session.
 *
 * The palette is an attribute on the root element, which `src/app/palettes.css` reads. The script
 * in index.html sets it before the first paint from the same key, so a coloured palette never
 * flashes grey. The printed and saved sheets (.docx, .xlsx) never read it.
 */
export const PALETTES = ['neutral', 'blue', 'sage', 'red'] as const
export type Palette = (typeof PALETTES)[number]

export const LAYOUTS = ['table', 'tiles'] as const
export type Layout = (typeof LAYOUTS)[number]

const PALETTE_KEY = 'hp.palette'
const LAYOUT_KEY = 'hp.layout'

const listeners = new Set<() => void>()
let palette: Palette | null = null
let layout: Layout | null = null

function load<T extends string>(key: string, options: readonly T[], fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key)
    return saved !== null && (options as readonly string[]).includes(saved)
      ? (saved as T)
      : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // The choice still holds for this session.
  }
  for (const listener of listeners) listener()
}

/** Puts the palette on the root element; `neutral` is the absence of one. */
export function applyPalette(value: Palette): void {
  if (value === 'neutral') document.documentElement.removeAttribute('data-palette')
  else document.documentElement.setAttribute('data-palette', value)
}

function readPalette(): Palette {
  palette ??= load(PALETTE_KEY, PALETTES, 'neutral')
  return palette
}

/** Until the physician chooses, a phone gets tiles and a wider screen the table. */
function defaultLayout(): Layout {
  try {
    return window.matchMedia('(max-width: 48em)').matches ? 'tiles' : 'table'
  } catch {
    return 'table'
  }
}

function readLayout(): Layout {
  layout ??= load(LAYOUT_KEY, LAYOUTS, defaultLayout())
  return layout
}

export function setPalette(value: Palette): void {
  palette = value
  applyPalette(value)
  save(PALETTE_KEY, value)
}

export function setLayout(value: Layout): void {
  layout = value
  save(LAYOUT_KEY, value)
}

/** Forget the cached choices; the next read goes back to storage. For tests. */
export function resetAppearance(): void {
  palette = null
  layout = null
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePalette(): [Palette, (value: Palette) => void] {
  return [useSyncExternalStore(subscribe, readPalette, () => 'neutral' as const), setPalette]
}

export function useLayout(): [Layout, (value: Layout) => void] {
  return [useSyncExternalStore(subscribe, readLayout, () => 'table' as const), setLayout]
}
