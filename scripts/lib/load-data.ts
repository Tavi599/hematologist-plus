import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'

import type { z } from 'zod'

import {
  classificationSystemsFileSchema,
  diseaseFileSchema,
  drugFileSchema,
  hospitalsFileSchema,
  regimenFileSchema,
  type DataSet,
  type DiseaseFile,
} from './data-files'

export interface FileIssue {
  file: string
  message: string
}

export interface LoadResult {
  data: DataSet
  issues: FileIssue[]
}

/**
 * Reads a data directory:
 *   hospitals.json, classification-systems.json,
 *   drugs/<id>.json, regimens/<id>.json,
 *   diseases/<id>/disease.json (+ article.uk.md, article.en.md)
 * Invalid files are reported and skipped, so all problems are listed in one run.
 */
export interface LoadOptions {
  /**
   * Where article Markdown lives. Article text is department-only and is kept outside the public
   * repository; without this the articles are read from the data directory itself (demo sets).
   */
  contentDir?: string
}

export function loadDataDir(dir: string, options: LoadOptions = {}): LoadResult {
  const issues: FileIssue[] = []
  const rel = (file: string) => relative(dir, file).replaceAll('\\', '/')

  function parseFile<S extends z.ZodType>(file: string, schema: S): z.output<S> | null {
    let json: unknown
    try {
      json = JSON.parse(readFileSync(file, 'utf8'))
    } catch (cause) {
      issues.push({ file: rel(file), message: `invalid JSON: ${(cause as Error).message}` })
      return null
    }
    const result = schema.safeParse(json)
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          file: rel(file),
          message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        })
      }
      return null
    }
    return result.data
  }

  function checkIdMatchesName(file: string, id: string, expected: string) {
    if (id !== expected) {
      issues.push({ file: rel(file), message: `id "${id}" must match the name "${expected}"` })
    }
  }

  const listJson = (subdir: string) => {
    const path = join(dir, subdir)
    if (!existsSync(path)) return []
    return readdirSync(path)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => join(path, name))
  }

  const topLevel = <S extends z.ZodType>(name: string, schema: S, empty: z.output<S>) => {
    const file = join(dir, name)
    if (!existsSync(file)) return empty
    return parseFile(file, schema) ?? empty
  }

  const data: DataSet = {
    hospitals: topLevel('hospitals.json', hospitalsFileSchema, []),
    classificationSystems: topLevel(
      'classification-systems.json',
      classificationSystemsFileSchema,
      [],
    ),
    drugs: [],
    regimens: [],
    diseases: [],
  }

  for (const file of listJson('drugs')) {
    const drug = parseFile(file, drugFileSchema)
    if (!drug) continue
    checkIdMatchesName(file, drug.id, basename(file, '.json'))
    data.drugs.push(drug)
  }

  for (const file of listJson('regimens')) {
    const regimen = parseFile(file, regimenFileSchema)
    if (!regimen) continue
    checkIdMatchesName(file, regimen.id, basename(file, '.json'))
    const itemKeys = new Set<string>()
    for (const item of regimen.items) {
      if (itemKeys.has(item.key)) {
        issues.push({ file: rel(file), message: `duplicate item key "${item.key}"` })
      }
      itemKeys.add(item.key)
    }
    for (const form of regimen.print_forms.forms) {
      for (const key of form.itemIds) {
        if (!itemKeys.has(key)) {
          issues.push({
            file: rel(file),
            message: `print form "${form.id}": unknown item "${key}"`,
          })
        }
      }
    }
    data.regimens.push(regimen)
  }

  const diseasesDir = join(dir, 'diseases')
  const diseaseDirs = existsSync(diseasesDir)
    ? readdirSync(diseasesDir)
        .filter((name) => statSync(join(diseasesDir, name)).isDirectory())
        .sort()
    : []
  for (const name of diseaseDirs) {
    const file = join(diseasesDir, name, 'disease.json')
    if (!existsSync(file)) {
      issues.push({ file: rel(join(diseasesDir, name)), message: 'missing disease.json' })
      continue
    }
    const parsed = parseFile(file, diseaseFileSchema)
    if (!parsed) continue
    checkIdMatchesName(file, parsed.id, name)
    const articleDir =
      options.contentDir === undefined
        ? join(diseasesDir, name)
        : join(options.contentDir, 'diseases', name)
    const disease: DiseaseFile = { ...parsed, article: readArticle(articleDir) }
    data.diseases.push(disease)
  }

  return { data, issues }
}

function readArticle(diseaseDir: string): DiseaseFile['article'] {
  const article: NonNullable<DiseaseFile['article']> = {}
  for (const language of ['uk', 'en'] as const) {
    const file = join(diseaseDir, `article.${language}.md`)
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
    if (text.trim() !== '') article[language] = text
  }
  return Object.keys(article).length > 0 ? article : null
}

/**
 * Article text is department-only, so it lives outside this repository. `--content <dir>` (or
 * CONTENT_DIR) points at that checkout; without it the articles of `data/` are simply absent and
 * the run reports how many were found.
 */
export function contentOptions(options: Map<string, string>, dir: string): LoadOptions {
  if (dir !== 'data') return {}
  const contentDir = options.get('content') ?? process.env.CONTENT_DIR
  return contentDir === undefined ? { contentDir: MISSING_CONTENT_DIR } : { contentDir }
}

/** A directory that cannot exist, so no article is read from the public repository by mistake. */
export const MISSING_CONTENT_DIR = '<no-content-dir>'
