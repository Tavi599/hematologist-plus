import type { DrugInteraction } from '../schemas/common'
import type { Drug } from '../schemas/catalog'

/** One interaction of the course: the drug whose label speaks, and the drugs it names here. */
export interface CourseInteraction {
  drug: Drug
  others: Drug[]
  interaction: DrugInteraction
}

const SEVERITY: Record<DrugInteraction['level'], number> = {
  contraindicated: 0,
  avoid: 1,
  dose_adjust: 2,
  caution: 3,
}

/**
 * The interactions between the drugs of a course: every one a label writes for a drug of the
 * course that names another drug of it. The most serious first.
 */
export function courseInteractions(drugs: Drug[]): CourseInteraction[] {
  const byId = new Map(drugs.map((drug) => [drug.id, drug]))
  const found = [...byId.values()].flatMap((drug) =>
    (drug.interactions ?? []).flatMap((interaction) => {
      const others = interaction.with
        .filter((id) => id !== drug.id)
        .flatMap((id) => {
          const other = byId.get(id)
          return other ? [other] : []
        })
      return others.length === 0 ? [] : [{ drug, others, interaction }]
    }),
  )
  return found.sort((a, b) => SEVERITY[a.interaction.level] - SEVERITY[b.interaction.level])
}
