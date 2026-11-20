import { describe, expect, it } from 'vitest'

import { CLASSES } from './classes'
import { COVERAGES, PATHOGENS, SPECTRUM, SPECTRUM_CHECKED_ON } from './spectrum'

/** Every MSD page the reference already cites; a spectrum cell may cite only one of these. */
const knownPages = new Set(CLASSES.flatMap((cls) => cls.pages))

describe('antibacterial spectrum table', () => {
  it('ties every row to an existing class, with a unique label', () => {
    const ids = new Set(CLASSES.map((cls) => cls.id))
    expect(SPECTRUM.length).toBeGreaterThan(10)
    for (const row of SPECTRUM) expect(ids.has(row.classId), row.label).toBe(true)
    expect(new Set(SPECTRUM.map((row) => row.label)).size).toBe(SPECTRUM.length)
  })

  it('fills every column of every row with a known value and a sourced note', () => {
    expect(SPECTRUM_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const row of SPECTRUM) {
      expect(Object.keys(row.cells).sort(), row.label).toEqual([...PATHOGENS].sort())
      for (const pathogen of PATHOGENS) {
        const cell = row.cells[pathogen]
        const where = `${row.label} / ${pathogen}`
        expect(COVERAGES, where).toContain(cell.value)
        expect(cell.note.length, where).toBeGreaterThan(2)
        expect(knownPages.has(cell.page), `${where}: ${cell.page}`).toBe(true)
        expect(cell.checkedOn, where).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })
})
