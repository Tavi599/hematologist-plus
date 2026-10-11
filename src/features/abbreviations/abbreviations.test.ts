import { describe, expect, it } from 'vitest'

import {
  ABBREVIATIONS,
  FEBRILE_NEUTROPENIA_ABBREVIATIONS,
  IMMUNODEFICIENCY_ABBREVIATIONS,
} from './abbreviations'

describe('abbreviations', () => {
  it('spells out every abbreviation a section lists', () => {
    for (const key of [...FEBRILE_NEUTROPENIA_ABBREVIATIONS, ...IMMUNODEFICIENCY_ABBREVIATIONS]) {
      const entry = ABBREVIATIONS.get(key)
      expect(entry, key).toBeDefined()
      expect(entry!.full.length).toBeGreaterThan(0)
      expect(entry!.meaning.uk.length).toBeGreaterThan(0)
      expect(entry!.meaning.en.length).toBeGreaterThan(0)
    }
  })
})
