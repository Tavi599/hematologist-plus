/**
 * Syncs data/ into Supabase.
 *
 *   npm run data:sync                       dry run: validate and show what would change
 *   npm run data:sync -- --apply            write inserts and updates
 *   npm run data:sync -- --apply --prune    also delete rows that are no longer in data/
 *   npm run data:sync -- --dir <path>       use another data directory (e.g. data-demo)
 *   npm run data:sync -- --sql <file>       write one SQL transaction for the Supabase SQL editor
 *                                           instead of connecting (add --prune to delete stale rows)
 *
 * Dry run needs only the public .env. Writing needs SUPABASE_SECRET_KEY in .env.local.
 */
import { writeFileSync } from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import { createSupabaseTableFetcher } from '../src/lib/catalog'
import { PRIVATE_TABLES, SYNC_TABLES, type SyncTable } from '../src/schemas/catalog'
import { checkCatalog } from './lib/check-catalog'
import { diffCatalog, hasChanges, type TableDiff } from './lib/diff'
import { loadEnv, parseArgs, requireEnv } from './lib/env'
import { flattenDataSet } from './lib/flatten'
import { contentOptions, loadDataDir } from './lib/load-data'
import { printCatalogIssues, printFileIssues } from './lib/report'
import { catalogToSql } from './lib/sql'

const CHUNK_SIZE = 500

function isPrivate(table: SyncTable): boolean {
  return (PRIVATE_TABLES as readonly string[]).includes(table)
}

async function main() {
  loadEnv()
  const { flags, options } = parseArgs(process.argv.slice(2))
  const dir = options.get('dir') ?? 'data'
  const apply = flags.has('apply')
  const prune = flags.has('prune')

  const { data, issues: fileIssues } = loadDataDir(dir, contentOptions(options, dir))
  const rows = flattenDataSet(data)
  const catalogIssues = checkCatalog(rows)
  printFileIssues(fileIssues)
  printCatalogIssues(catalogIssues)
  if (fileIssues.length > 0 || catalogIssues.some((issue) => issue.severity === 'error')) {
    throw new Error('validation failed; nothing was synced.')
  }

  const sqlFile = options.get('sql')
  if (sqlFile) {
    writeFileSync(sqlFile, catalogToSql(rows, { prune }))
    console.log(`\nWrote ${sqlFile}${prune ? ' (including deletes of stale rows)' : ''}.`)
    return
  }

  const url = requireEnv('VITE_SUPABASE_URL', 'Expected in .env.')
  const key = apply
    ? requireEnv('SUPABASE_SECRET_KEY', 'Put the secret key into .env.local (see .env.example).')
    : (process.env.SUPABASE_SECRET_KEY ??
      requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'Expected in .env.'))
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const fetchTable = createSupabaseTableFetcher(client)
  const unreadable: SyncTable[] = []
  const existing = Object.fromEntries(
    await Promise.all(
      SYNC_TABLES.map(async (table) => {
        try {
          return [table, await fetchTable(table)]
        } catch (cause) {
          // Private tables are invisible to the publishable key by design. Without a key that can
          // read them the diff cannot tell new rows from unchanged ones, so everything is written
          // (upsert) and nothing is pruned.
          if (!isPrivate(table)) throw cause
          unreadable.push(table)
          return [table, []]
        }
      }),
    ),
  ) as Record<SyncTable, ({ id: string } & Record<string, unknown>)[]>

  if (unreadable.length > 0) {
    console.log(
      `Not readable with this key (written blind, never pruned): ${unreadable.join(', ')}.
`,
    )
  }

  const diffs = diffCatalog(rows, existing)
  printDiff(diffs, prune)

  if (!hasChanges(diffs, prune)) {
    console.log('\nDatabase is up to date.')
    return
  }
  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write' + (prune ? ' (with --prune).' : '.'))
    return
  }

  // Upsert parents before children.
  for (const diff of diffs) {
    const changed = [...diff.inserts, ...diff.updates]
    for (let i = 0; i < changed.length; i += CHUNK_SIZE) {
      const { error } = await client
        .from(diff.table)
        .upsert(changed.slice(i, i + CHUNK_SIZE), { onConflict: 'id' })
      if (error) fail(`upsert ${diff.table}: ${error.message}`)
    }
  }
  // Delete children before parents.
  if (prune) {
    for (const diff of [...diffs].reverse()) {
      for (let i = 0; i < diff.deletes.length; i += CHUNK_SIZE) {
        const { error } = await client
          .from(diff.table)
          .delete()
          .in('id', diff.deletes.slice(i, i + CHUNK_SIZE))
        if (error) fail(`delete ${diff.table}: ${error.message}`)
      }
    }
  }
  console.log('\nSync complete.')
}

function printDiff(diffs: TableDiff[], prune: boolean) {
  console.log('\nChanges (insert / update / delete):')
  for (const diff of diffs) {
    const deleteNote = diff.deletes.length > 0 && !prune ? ' (kept; use --prune)' : ''
    console.log(
      `  ${diff.table.padEnd(26)} ${diff.inserts.length} / ${diff.updates.length} / ${diff.deletes.length}${deleteNote}`,
    )
    for (const row of diff.inserts) console.log(`    + ${row.id}`)
    for (const row of diff.updates) console.log(`    ~ ${row.id}`)
    for (const id of diff.deletes) console.log(`    - ${id}`)
  }
}

function fail(message: string): never {
  throw new Error(
    `${message}\nEarlier tables may already be written; fix the problem and run the sync again.`,
  )
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nSync stopped: ${message}`)
  if (/schema cache|does not exist/.test(message)) {
    console.error('Are the migrations from supabase/migrations applied to the project?')
  }
  // exitCode instead of process.exit lets open network handles close cleanly (crashes on Windows otherwise).
  process.exitCode = 1
}
