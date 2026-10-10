import type { RegimenItem } from '../schemas/catalog'
import type { CourseItem } from './course-input'
import { supportCategoryOf } from './standard-support'

/**
 * Drugs the department never gives without their premedication (decision of 2026-10-10): a
 * regimen with one of them opens with its premedication switched on, and switching it off is
 * flagged. Both labels ask for premedication before every dose (Rituxan 2.8; Darzalex and
 * Darzalex Faspro, pre-infusion medication).
 */
export const ALWAYS_PREMEDICATED: ReadonlySet<string> = new Set(['rituximab', 'daratumumab'])

/**
 * Drugs whose label asks for premedication before at least some of their doses. Their row carries
 * a mark, so a course without it is noticed; whether it is given stays the physician's call.
 * Bispecific antibodies and carfilzomib need it on the first doses only.
 */
export const PREMEDICATION_ADVISED: ReadonlySet<string> = new Set([
  ...ALWAYS_PREMEDICATED,
  'obinutuzumab',
  'isatuximab',
  'elotuzumab',
  'gemtuzumab-ozogamicin',
  'inotuzumab-ozogamicin',
  'blinatumomab',
  'polatuzumab-vedotin',
  'tafasitamab',
  'loncastuximab-tesirine',
  'carfilzomib',
  'elranatamab',
  'epcoritamab',
  'glofitamab',
])

const isMain = (item: RegimenItem) => item.role === 'main'

/** Does the regimen give a drug that is never given without its premedication? */
export function needsPremedicationOn(items: CourseItem[]): boolean {
  return items.some((entry) => isMain(entry.item) && ALWAYS_PREMEDICATED.has(entry.item.drug_id))
}

/**
 * The premedication rows a regimen opens with switched on: all of them when it gives rituximab
 * or daratumumab — in such a regimen they are there for the antibody — and none otherwise.
 * Antiemetics given as premedication are not among them.
 */
export function premedicationOnByDefault(items: CourseItem[]): Set<string> {
  if (!needsPremedicationOn(items)) return new Set()
  return new Set(
    items
      .filter((entry) => entry.item.role === 'premedication')
      // An antiemetic follows its own switch with the rest of the supportive care.
      .filter((entry) => supportCategoryOf(entry.item) === null)
      .map((entry) => entry.item.id),
  )
}

/**
 * Drugs of the course that ask for premedication and get none on one of their days: no
 * premedication row switched on for that day. Keyed by item id, with the days left uncovered.
 */
export function unpremedicated(
  items: CourseItem[],
  disabledIds: readonly string[],
): Map<string, number[]> {
  const off = new Set(disabledIds)
  const covered = new Set(
    items
      .filter(
        (entry) =>
          entry.item.role === 'premedication' &&
          !off.has(entry.item.id) &&
          // An antiemetic before the chemotherapy is not what the antibody asks for.
          supportCategoryOf(entry.item) === null,
      )
      .flatMap((entry) => entry.item.days),
  )
  const result = new Map<string, number[]>()
  for (const entry of items) {
    if (!isMain(entry.item) || off.has(entry.item.id)) continue
    if (!PREMEDICATION_ADVISED.has(entry.item.drug_id)) continue
    const missing = entry.item.days.filter((day) => !covered.has(day))
    if (missing.length > 0) result.set(entry.item.id, missing)
  }
  return result
}
