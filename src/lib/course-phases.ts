import type { Regimen } from '../schemas/catalog'
import type { CatalogIndex } from './catalog-index'

/** The phases of the course a regimen belongs to, in order; empty for a one-record course. */
export function coursePhases(catalog: CatalogIndex, regimenId: string | null): Regimen[] {
  const course = regimenId === null ? null : (catalog.regimens.get(regimenId)?.course ?? null)
  if (!course) return []
  return [...catalog.regimens.values()]
    .filter((regimen) => regimen.course?.id === course.id)
    .sort((a, b) => a.course!.order - b.course!.order)
}

/**
 * The phase of the regimen's course that covers a cycle, or null when the course does not go by
 * the cycle count (induction, consolidation) or no phase claims that cycle. A maintenance phase
 * after the counted cycles is never picked by number: it is chosen on purpose.
 */
export function phaseForCycle(
  catalog: CatalogIndex,
  regimenId: string | null,
  cycle: number,
): Regimen | null {
  return phaseCovering(coursePhases(catalog, regimenId), cycle)
}

/** Of a course's phases, the one whose cycles hold the cycle given. */
export function phaseCovering(phases: readonly Regimen[], cycle: number): Regimen | null {
  return (
    phases.find((regimen) => {
      const cycles = regimen.course?.cycles ?? null
      return cycles !== null && cycle >= cycles.from && (cycles.to === null || cycle <= cycles.to)
    }) ?? null
  )
}
