import { describe, expect, it } from 'vitest'

import { localize, resolveLocalized } from './localized'

describe('resolveLocalized', () => {
  it('returns the requested language when present', () => {
    expect(resolveLocalized({ uk: 'Лімфома', en: 'Lymphoma' }, 'en')).toEqual({
      text: 'Lymphoma',
      language: 'en',
      isFallback: false,
    })
  })

  it('falls back to the available language when the requested one is missing', () => {
    expect(resolveLocalized({ uk: 'Лімфома' }, 'en')).toEqual({
      text: 'Лімфома',
      language: 'uk',
      isFallback: true,
    })
    expect(resolveLocalized({ en: 'Lymphoma' }, 'uk')).toEqual({
      text: 'Lymphoma',
      language: 'en',
      isFallback: true,
    })
  })

  it('treats empty and whitespace-only strings as missing', () => {
    expect(localize({ uk: '  ', en: 'Lymphoma' }, 'uk')).toBe('Lymphoma')
    expect(localize({ uk: null, en: 'Lymphoma' }, 'uk')).toBe('Lymphoma')
  })

  it('returns empty text for absent fields', () => {
    expect(resolveLocalized(null, 'uk')).toEqual({ text: '', language: null, isFallback: false })
    expect(resolveLocalized({}, 'en')).toEqual({ text: '', language: null, isFallback: false })
  })
})
