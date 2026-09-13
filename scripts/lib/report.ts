import type { CatalogIssue } from './check-catalog'
import type { FileIssue } from './load-data'

export function printFileIssues(issues: FileIssue[]): void {
  if (issues.length === 0) return
  console.error(`\nFile errors (${issues.length}):`)
  for (const issue of issues) console.error(`  ✗ ${issue.file}: ${issue.message}`)
}

export function printCatalogIssues(issues: CatalogIssue[]): void {
  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  if (errors.length > 0) {
    console.error(`\nErrors (${errors.length}):`)
    for (const issue of errors) console.error(`  ✗ ${issue.table} ${issue.id}: ${issue.message}`)
  }
  if (warnings.length > 0) {
    console.warn(`\nWarnings — gaps for calculation (${warnings.length}):`)
    for (const issue of warnings) console.warn(`  ! ${issue.table} ${issue.id}: ${issue.message}`)
  }
}
