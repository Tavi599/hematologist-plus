import { describe, expect, it } from 'vitest'

import type { Drug } from '../schemas/catalog'
import { courseInteractions } from './course-interactions'

const source = { name: 'SmPC', checkedOn: '2026-10-13' }
const drug = (id: string, interactions: Drug['interactions'] = null) =>
  ({ id, interactions }) as Drug

const venetoclax = drug('venetoclax', [
  {
    with: ['fluconazole', 'ciprofloxacin'],
    level: 'dose_adjust',
    notes: { uk: 'мінус 50%', en: 'minus 50%' },
    source,
  },
  {
    with: ['posaconazole'],
    level: 'contraindicated',
    notes: { uk: 'ні', en: 'no' },
    source,
  },
])

describe('courseInteractions', () => {
  it('lists what a label names among the drugs of the course, the most serious first', () => {
    const found = courseInteractions([
      venetoclax,
      drug('fluconazole'),
      drug('posaconazole'),
      drug('aciclovir'),
    ])
    expect(found.map((entry) => entry.interaction.level)).toEqual([
      'contraindicated',
      'dose_adjust',
    ])
    expect(found[1]!.others.map((other) => other.id)).toEqual(['fluconazole'])
  })

  it('finds nothing when the other drug is not in the course', () => {
    expect(courseInteractions([venetoclax, drug('aciclovir')])).toEqual([])
  })
})
