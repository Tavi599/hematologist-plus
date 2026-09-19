import { SYNC_TABLES, type SyncRows, type SyncTable } from '../../src/schemas/catalog'

type Row = { id: string } & Record<string, unknown>

export interface TableDiff {
  table: SyncTable
  inserts: Row[]
  updates: Row[]
  /** Ids present in the database but not in data/. Deleted only with --prune. */
  deletes: string[]
}

/** JSON with sorted object keys, so jsonb key order in the database does not produce false updates. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function diffTable(table: SyncTable, desired: Row[], existing: Row[]): TableDiff {
  const existingById = new Map(existing.map((row) => [row.id, row]))
  const desiredIds = new Set(desired.map((row) => row.id))
  const inserts: Row[] = []
  const updates: Row[] = []

  for (const row of desired) {
    const current = existingById.get(row.id)
    if (!current) {
      inserts.push(row)
      continue
    }
    // Compare only the columns we write; ignore anything extra the database returns.
    const projected = Object.fromEntries(Object.keys(row).map((key) => [key, current[key]]))
    if (stableStringify(projected) !== stableStringify(row)) updates.push(row)
  }

  const deletes = existing.filter((row) => !desiredIds.has(row.id)).map((row) => row.id)
  return { table, inserts, updates, deletes }
}

export function diffCatalog(desired: SyncRows, existing: Record<SyncTable, Row[]>): TableDiff[] {
  return SYNC_TABLES.map((table) =>
    diffTable(table, desired[table] as unknown as Row[], existing[table]),
  )
}

export function hasChanges(diffs: TableDiff[], prune: boolean): boolean {
  return diffs.some(
    (diff) => diff.inserts.length + diff.updates.length + (prune ? diff.deletes.length : 0) > 0,
  )
}
