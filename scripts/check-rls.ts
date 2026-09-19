/**
 * Verifies with the publishable key (what every site visitor has) that each catalog table
 * can be read but not written.
 *
 *   npm run db:check-rls
 */
import { createClient } from '@supabase/supabase-js'

import { APP_TABLES, CATALOG_TABLES, PRIVATE_TABLES } from '../src/schemas/catalog'
import { loadEnv, requireEnv } from './lib/env'

loadEnv()
const client = createClient(
  requireEnv('VITE_SUPABASE_URL', 'Expected in .env.'),
  requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'Expected in .env.'),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const PROBE_ID = 'rls-probe-must-not-exist'
let failed = false

for (const table of CATALOG_TABLES) {
  const read = await client.from(table).select('id').limit(1)
  const insert = await client.from(table).insert({ id: PROBE_ID })
  // Update/delete target a non-existent id so a misconfigured table can never lose data;
  // the migration revokes write privileges, so PostgREST must answer with a permission error.
  const update = await client.from(table).update({ sort_order: 0 }).eq('id', PROBE_ID)
  const remove = await client.from(table).delete().eq('id', PROBE_ID)

  const checks = {
    read: read.error === null,
    insert: insert.error !== null,
    update: update.error !== null,
    delete: remove.error !== null,
  }
  const ok = Object.values(checks).every(Boolean)
  failed ||= !ok
  const detail = Object.entries(checks)
    .map(([name, pass]) => `${name} ${pass ? 'ok' : 'FAIL'}`)
    .join(', ')
  console.log(`${ok ? '✓' : '✗'} ${table.padEnd(26)} ${detail}`)
  if (read.error) console.log(`    read error: ${read.error.message}`)
}

// Article text must be invisible without a session: a readable row here would mean the text
// is already on the public site.
for (const table of PRIVATE_TABLES) {
  const read = await client.from(table).select('id').limit(1)
  const hidden = read.error !== null || (read.data?.length ?? 0) === 0
  failed ||= !hidden
  console.log(`${hidden ? '✓' : '✗'} ${table.padEnd(26)} not readable without a session`)
}

// The proposals window is the one thing the site writes to, and only with a session. Without
// one, nothing may be read from it and nothing may be written into it.
for (const table of APP_TABLES) {
  const read = await client.from(table).select('*').limit(1)
  const write = await client.from(table).insert({})
  const hidden = read.error !== null || (read.data?.length ?? 0) === 0
  const closed = write.error !== null
  failed ||= !hidden || !closed
  const detail = `${hidden ? 'read blocked' : 'READABLE'}, ${closed ? 'insert blocked' : 'WRITABLE'}`
  console.log(`${hidden && closed ? '✓' : '✗'} ${table.padEnd(26)} ${detail} without a session`)
}

console.log(failed ? '\nRLS check failed.' : '\nRLS check passed: read-only for the public key.')
process.exitCode = failed ? 1 : 0
