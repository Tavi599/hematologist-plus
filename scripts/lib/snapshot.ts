import { flattenDataSet } from './flatten'
import { loadDataDir } from './load-data'

export const DEMO_CATALOG_FIXTURE = 'src/test/fixtures/demo-catalog.json'

export function demoCatalogJson(): string {
  return JSON.stringify(flattenDataSet(loadDataDir('data-demo').data), null, 2) + '\n'
}
