import type { SyncRows } from '../schemas/catalog'
import demo from '../test/fixtures/demo-catalog.json'

/**
 * Flattened data-demo/ as table rows; a fresh copy per call so tests can mutate it.
 * Kept in sync with data-demo by scripts/lib/pipeline.test.ts (UPDATE_FIXTURES=1 regenerates it).
 */
export function demoCatalog(): SyncRows {
  return structuredClone(demo) as unknown as SyncRows
}
