import { existsSync } from 'node:fs'

/** Loads .env (public values) and .env.local (secrets, git-ignored) into process.env. */
export function loadEnv(): void {
  for (const file of ['.env.local', '.env']) {
    // process.loadEnvFile does not override variables that are already set.
    if (existsSync(file)) process.loadEnvFile(file)
  }
}

export function requireEnv(name: string, hint: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name}. ${hint}`)
    process.exit(1)
  }
  return value
}

export function parseArgs(argv: string[]): { flags: Set<string>; options: Map<string, string> } {
  const flags = new Set<string>()
  const options = new Map<string, string>()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (!arg.startsWith('--')) continue
    const [name, inline] = arg.slice(2).split('=', 2) as [string, string | undefined]
    const next = argv[i + 1]
    if (inline !== undefined) options.set(name, inline)
    else if (next !== undefined && !next.startsWith('--')) {
      options.set(name, next)
      i++
    } else flags.add(name)
  }
  return { flags, options }
}
