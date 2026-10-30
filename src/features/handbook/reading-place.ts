import { useLayoutEffect, useRef } from 'react'

/**
 * Keeps the reader's place when the handbook switches language.
 *
 * Ukrainian and English paragraphs are not the same height, so re-rendering a
 * chapter in the other language moves everything under the reader's eye. This
 * notes which block was at the top of the screen and how far down it began,
 * then puts that same block back in the same place once the new text is laid
 * out — so switching language never means hunting for the passage again.
 *
 * Every block is rendered with `data-block-id`, which is what is looked up.
 */
export interface ReadingPlace {
  id: string
  /** Where the block's top edge was, in pixels from the top of the viewport. */
  top: number
}

/** The block nearest the top of the screen, and how far into it we are. */
export function captureReadingPlace(root: ParentNode = document): ReadingPlace | null {
  const blocks = root.querySelectorAll<HTMLElement>('[data-block-id]')
  let best: ReadingPlace | null = null
  for (const block of blocks) {
    const rect = block.getBoundingClientRect()
    // The first block still showing: its bottom edge has not passed the top.
    if (rect.bottom <= 0) continue
    const id = block.dataset.blockId
    if (id === undefined) continue
    best = { id, top: rect.top }
    break
  }
  return best
}

export function restoreReadingPlace(place: ReadingPlace, root: ParentNode = document): void {
  const block = root.querySelector<HTMLElement>(`[data-block-id="${cssEscape(place.id)}"]`)
  if (!block) return
  const moved = block.getBoundingClientRect().top - place.top
  if (Math.abs(moved) < 1) return
  window.scrollTo({ top: window.scrollY + moved })
}

/** `CSS.escape` is missing in jsdom; block ids are hex, so this is enough. */
function cssEscape(value: string): string {
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : value.replace(/["\\]/g, '\\$&')
}

/**
 * Call the returned function right before changing `token` (the language mode);
 * the place is restored once the new text has been laid out.
 */
export function useKeepReadingPlace(token: unknown): () => void {
  const pending = useRef<ReadingPlace | null>(null)
  useLayoutEffect(() => {
    const place = pending.current
    pending.current = null
    if (!place) return
    restoreReadingPlace(place)
    // Clicking the switch focuses its radio button, and the browser scrolls a
    // newly focused control into view after this effect has run — which would
    // undo the restore and throw the reader back to the top of the chapter.
    // Put the place back once more on the next frame, after that scroll.
    const again = requestAnimationFrame(() => restoreReadingPlace(place))
    return () => cancelAnimationFrame(again)
  }, [token])
  // The first call wins: the switch notes the place on mousedown, before the
  // browser has moved anything, and the change event that follows must not
  // overwrite it with a position the focus scroll has already spoilt.
  return () => {
    pending.current ??= captureReadingPlace()
  }
}
