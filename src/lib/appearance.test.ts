import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetAppearance, setLayout, setPalette } from './appearance'

describe('appearance', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetAppearance()
  })
  afterEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-palette')
  })

  it('puts a palette on the root element, and grey and white as no attribute at all', () => {
    setPalette('sage')
    expect(document.documentElement.getAttribute('data-palette')).toBe('sage')
    expect(window.localStorage.getItem('hp.palette')).toBe('sage')
    setPalette('neutral')
    expect(document.documentElement.hasAttribute('data-palette')).toBe(false)
  })

  it('remembers the layout of the lists', () => {
    setLayout('tiles')
    expect(window.localStorage.getItem('hp.layout')).toBe('tiles')
  })
})
