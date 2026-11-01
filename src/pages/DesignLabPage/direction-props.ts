import type { CatalogIndex } from '../../lib/catalog-index'

/** Which of the two sections a direction is showing. */
export type LabSection = 'diseases' | 'scores'

/**
 * Every direction gets the same data and the same search box state, so switching between them
 * keeps the physician's place: what changes on screen is the design alone.
 */
export type DirectionProps = {
  catalog: CatalogIndex
  search: string
  onSearch: (value: string) => void
  section: LabSection
}
