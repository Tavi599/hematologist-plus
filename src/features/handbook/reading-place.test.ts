import { afterEach, describe, expect, it, vi } from 'vitest'

import { captureReadingPlace, restoreReadingPlace } from './reading-place'

/** jsdom has no layout, so every block's rectangle is stated outright. */
function page(rects: { id: string; top: number; bottom: number }[]): HTMLElement {
  const root = document.createElement('div')
  for (const rect of rects) {
    const block = document.createElement('div')
    block.dataset.blockId = rect.id
    block.getBoundingClientRect = () => ({ top: rect.top, bottom: rect.bottom }) as DOMRect
    root.append(block)
  }
  document.body.append(root)
  return root
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('captureReadingPlace', () => {
  it('picks the first block still on screen, not the first on the page', () => {
    const root = page([
      { id: 'a', top: -400, bottom: -120 },
      { id: 'b', top: -100, bottom: 60 },
      { id: 'c', top: 60, bottom: 300 },
    ])
    expect(captureReadingPlace(root)).toEqual({ id: 'b', top: -100 })
  })

  it('returns nothing when there is nothing to pin', () => {
    expect(captureReadingPlace(page([]))).toBeNull()
  })
})

describe('restoreReadingPlace', () => {
  it('scrolls so the pinned block sits where it sat before', () => {
    const root = page([{ id: 'b', top: 220, bottom: 400 }])
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    Object.defineProperty(window, 'scrollY', { value: 1000, configurable: true })

    // It was 100 px above the top of the viewport; it is now 220 px below it,
    // so the page has to go down by 320.
    restoreReadingPlace({ id: 'b', top: -100 }, root)

    expect(scrollTo).toHaveBeenCalledWith({ top: 1320 })
  })

  it('does nothing when the block has not moved', () => {
    const root = page([{ id: 'b', top: 50, bottom: 200 }])
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    restoreReadingPlace({ id: 'b', top: 50 }, root)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does nothing when the block is gone', () => {
    const root = page([{ id: 'other', top: 0, bottom: 10 }])
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    restoreReadingPlace({ id: 'b', top: 0 }, root)
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
