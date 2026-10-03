import { describe, expect, it } from 'vitest'

import en from './en/common.json'
import uk from './uk/common.json'

/** Every leaf key, flattened to "a.b.c", so a missing branch is reported as the key it hides. */
function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix === '' ? key : `${prefix}.${key}`),
  )
}

/** Placeholders a translator must carry over unchanged, e.g. {{count}}. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]!).sort()
}

function leaves(value: unknown, prefix = ''): [string, string][] {
  if (typeof value === 'string') return [[prefix, value]]
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix === '' ? key : `${prefix}.${key}`),
  )
}

describe('locales', () => {
  it('has the same keys in both languages', () => {
    const inUk = new Set(keys(uk))
    const inEn = new Set(keys(en))
    expect([...inUk].filter((key) => !inEn.has(key))).toEqual([])
    expect([...inEn].filter((key) => !inUk.has(key))).toEqual([])
  })

  it('every string is a string, and none is empty', () => {
    for (const [key, text] of leaves(uk)) {
      expect(text.trim(), `uk.${key}`).not.toBe('')
    }
    for (const [key, text] of leaves(en)) {
      expect(text.trim(), `en.${key}`).not.toBe('')
    }
  })

  it('keeps the same interpolation placeholders in both languages', () => {
    const english = new Map(leaves(en))
    for (const [key, text] of leaves(uk)) {
      const other = english.get(key)
      if (other === undefined) continue
      expect(placeholders(text), key).toEqual(placeholders(other))
    }
  })
})
