import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { regimensInTree } from '../catalog/treatment-filter'
import { FEBRILE_NEUTROPENIA_DISEASE } from '../febrile-neutropenia/algorithm'
import { areaOf, RISK_AREAS } from '../scores/areas'
import { GENERAL_SCORES } from '../scores/general'
import { RISK_SCORES } from '../scores/risk'
import type { Score } from '../scores/types'
import { ICD10_SYSTEM_ID, primaryCode, type CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { CLINICAL_GROUPS, type ClinicalGroup } from '../../schemas/common'
import { usePicks, type ListKind, type Picks } from './picks'

/**
 * Data of the reference lists: the table and the tiles show exactly the same diseases and scores,
 * grouped, filtered, pinned and folded the same way, so switching between them changes the look
 * and nothing else.
 */

export type DiseaseEntry = {
  id: string
  name: string
  summary: string
  code: string | null
  /** Regimens anywhere in the disease's treatment tree. */
  regimens: number
  /** Whether the disease has a guideline algorithm page of its own. */
  hasPathway: boolean
}

/** One heading of the list: a clinical group or score area, or the pinned favourites and recent. */
export type ListSection<T> = {
  key: string
  title: string
  pinned: boolean
  /** Folded away by the physician; a search unfolds every group so no match is hidden. */
  collapsed: boolean
  entries: T[]
}

/** A choice of the group filter, counted after the search. */
export type GroupOption = { key: string; label: string; count: number }

export type ReferenceList<T> = { options: GroupOption[]; sections: ListSection<T>[] }

type Grouped<T> = { key: string; title: string; entries: T[] }

/**
 * Narrows the search-filtered groups to the chosen one and, over the full list only, puts the
 * favourites and the recent items (those not already favourites) on top.
 */
function arrange<T extends { id: string }>(
  groups: Grouped<T>[],
  group: string | null,
  picks: Picks,
  searching: boolean,
  titles: { favorites: string; recent: string },
): ReferenceList<T> {
  const folded = (key: string) => !searching && picks.collapsed.includes(key)
  const options = groups.map(({ key, title, entries }) => ({
    key,
    label: title,
    count: entries.length,
  }))
  const chosen = group !== null && groups.some((item) => item.key === group) ? group : null
  const sections: ListSection<T>[] = groups
    .filter((item) => chosen === null || item.key === chosen)
    .map((item) => ({ ...item, pinned: false, collapsed: folded(item.key) }))
  if (chosen !== null) return { options, sections }

  const byId = new Map(groups.flatMap((item) => item.entries).map((entry) => [entry.id, entry]))
  const pick = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter((entry): entry is T => entry !== undefined)
  const favorites = pick(picks.favorites)
  const recent = pick(picks.recent.filter((id) => !picks.favorites.includes(id)))
  const pinned: ListSection<T>[] = [
    {
      key: 'favorites',
      title: titles.favorites,
      pinned: true,
      collapsed: folded('favorites'),
      entries: favorites,
    },
    {
      key: 'recent',
      title: titles.recent,
      pinned: true,
      collapsed: folded('recent'),
      entries: recent,
    },
  ]
  return { options, sections: [...pinned.filter((item) => item.entries.length > 0), ...sections] }
}

/**
 * Favourites follow every click; the recent list is the one there was when the page opened, so
 * opening a score does not push the list down under the physician's hand.
 */
function useListPicks(list: ListKind): Picks {
  const picks = usePicks(list)
  const [recent] = useState(picks.recent)
  return { ...picks, recent }
}

const GROUP_ORDER: readonly (ClinicalGroup | 'other')[] = [...CLINICAL_GROUPS, 'other']

export function useDiseaseList(
  catalog: CatalogIndex,
  search: string,
  group: string | null,
): ReferenceList<DiseaseEntry> {
  const { t } = useTranslation()
  const language = currentLanguage()
  const picks = useListPicks('diseases')

  const entries = useMemo(
    () =>
      [...catalog.diseases.values()]
        // Febrile neutropenia has a tab of its own on the real page.
        .filter((disease) => disease.id !== FEBRILE_NEUTROPENIA_DISEASE)
        .map((disease) => ({
          id: disease.id,
          group: disease.clinical_group ?? 'other',
          sort: disease.sort_order,
          name: localize(disease.name, language),
          summary: disease.summary === null ? '' : localize(disease.summary, language),
          code: primaryCode(catalog, disease.id, ICD10_SYSTEM_ID)?.code ?? null,
          regimens: regimensInTree(catalog, disease.id).size,
          hasPathway: (catalog.pathwaysByDisease.get(disease.id) ?? []).length > 0,
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

  const groups = GROUP_ORDER.map((key) => ({
    key,
    title: t(`diseases.group.${key}`),
    entries: found.filter((entry) => entry.group === key),
  })).filter((item) => item.entries.length > 0)

  return arrange(groups, group, picks, query !== '', {
    favorites: t('referenceList.favorites'),
    recent: t('referenceList.recent'),
  })
}

export function useScoreList(search: string, group: string | null): ReferenceList<Score> {
  const { t } = useTranslation()
  const language = currentLanguage()
  const picks = useListPicks('scores')
  const query = search.trim().toLowerCase()

  const groups = useMemo(() => {
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

    const general = { key: 'general', title: '', entries: GENERAL_SCORES.filter(matches) }
    const risk = RISK_AREAS.map((area) => ({
      key: area.id,
      title: area.title[language],
      entries: area.scoreIds
        .map((id) => RISK_SCORES.find((score) => score.id === id))
        .filter((score): score is Score => score !== undefined)
        .filter(matches),
    }))
    return [general, ...risk].filter((item) => item.entries.length > 0)
  }, [query, language])

  const titled = groups.map((item) =>
    item.key === 'general' ? { ...item, title: t('scores.forAll') } : item,
  )
  return arrange(titled, group, picks, query !== '', {
    favorites: t('referenceList.favorites'),
    recent: t('referenceList.recent'),
  })
}
