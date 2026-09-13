/**
 * Validates a data directory without touching the database.
 *
 *   npm run data:validate                  validates data/
 *   npm run data:validate -- --dir <path>  validates another directory
 */
import { checkCatalog } from './lib/check-catalog'
import { parseArgs } from './lib/env'
import { flattenDataSet } from './lib/flatten'
import { loadDataDir } from './lib/load-data'
import { printCatalogIssues, printFileIssues } from './lib/report'

const { options } = parseArgs(process.argv.slice(2))
const dir = options.get('dir') ?? 'data'

const { data, issues: fileIssues } = loadDataDir(dir)
const rows = flattenDataSet(data)
const catalogIssues = checkCatalog(rows)

printFileIssues(fileIssues)
printCatalogIssues(catalogIssues)

const counts = Object.entries(rows)
  .map(([table, list]) => `${table}: ${list.length}`)
  .join(', ')
console.log(`\n${dir}: ${counts}`)

const failed = fileIssues.length > 0 || catalogIssues.some((issue) => issue.severity === 'error')
console.log(failed ? '\nValidation failed.' : '\nValidation passed.')
process.exit(failed ? 1 : 0)
