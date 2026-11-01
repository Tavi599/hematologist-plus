import { useMemo } from 'react'

import { FEBRILE_NEUTROPENIA_DISEASE } from '../../features/febrile-neutropenia/algorithm'
import { areaOf, RISK_AREAS, type Area } from '../../features/scores/areas'
import { GENERAL_SCORES } from '../../features/scores/general'
import { RISK_SCORES } from '../../features/scores/risk'
import type { Score } from '../../features/scores/types'
import { ICD10_SYSTEM_ID, primaryCode, type CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { CLINICAL_GROUPS, type ClinicalGroup } from '../../schemas/common'

/**
 * Shared data for the design directions: every direction shows exactly the same diseases and
 * scores, so what differs between them is the design and nothing else.
 */

export type GroupKey = ClinicalGroup | 'other'

export type DiseaseEntry = {
  id: string
  name: string
  summary: string
  code: string | null
}

export type DiseaseGroup = {
  key: GroupKey
  entries: DiseaseEntry[]
}

const GROUP_ORDER = [...CLINICAL_GROUPS, 'other'] as const

export function useDiseaseGroups(catalog: CatalogIndex, search: string): DiseaseGroup[] {
  const language = currentLanguage()

  const entries = useMemo(
    () =>
      [...catalog.diseases.values()]
        // Febrile neutropenia has a tab of its own on the real page.
        .filter((disease) => disease.id !== FEBRILE_NEUTROPENIA_DISEASE)
        .map((disease) => ({
          id: disease.id,
          group: (disease.clinical_group ?? 'other') as GroupKey,
          sort: disease.sort_order,
          name: localize(disease.name, language),
          summary: disease.summary === null ? '' : localize(disease.summary, language),
          code: primaryCode(catalog, disease.id, ICD10_SYSTEM_ID)?.code ?? null,
        }))
        .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)),
    [catalog, language],
  )

  const query = search.trim().toLowerCase()
  const found = query
    ? entries.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) ||
          (entry.code ?? '').toLowerCase().includes(query) ||
          entry.summary.toLowerCase().includes(query),
      )
    : entries

  return GROUP_ORDER.map((key) => ({
    key,
    entries: found.filter((entry) => entry.group === key),
  })).filter((group) => group.entries.length > 0)
}

export type ScoreGroup = {
  /** `null` for the everyday formulas, which belong to no disease area. */
  area: Area | null
  scores: Score[]
}

export function useScoreGroups(search: string): ScoreGroup[] {
  const query = search.trim().toLowerCase()

  return useMemo(() => {
    const matches = (score: Score) =>
      query === '' ||
      [
        score.title.uk,
        score.title.en,
        score.purpose.uk,
        score.purpose.en,
        areaOf(score.id)?.title.uk ?? '',
        areaOf(score.id)?.title.en ?? '',
      ].some((text) => text.toLowerCase().includes(query))

    const general = GENERAL_SCORES.filter(matches)
    const risk: ScoreGroup[] = RISK_AREAS.map((area) => ({
      area,
      scores: area.scoreIds
        .map((id) => RISK_SCORES.find((score) => score.id === id))
        .filter((score): score is Score => score !== undefined)
        .filter(matches),
    })).filter((group) => group.scores.length > 0)

    return general.length > 0 ? [{ area: null, scores: general }, ...risk] : risk
  }, [query])
}
