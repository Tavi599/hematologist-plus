import { Group, Stack, Text, TextInput } from '@mantine/core'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useLayout, type Layout } from '../../lib/appearance'
import type { CatalogIndex } from '../../lib/catalog-index'
import { areaOf } from '../scores/areas'
import { useDiseaseList, useScoreList, type GroupOption, type ListSection } from './list-data'
import { FoldAll, GroupFilter } from './ListParts'
import { toggleCollapsed, usePicks, visit, type ListKind } from './picks'
import classes from './reference-list.module.css'
import { TableDiseases, TableScores } from './TableList'
import { TileDiseases, TileScores } from './TileList'

/**
 * The disease and score lists of the reference pages, as a table or as tiles — the physician
 * picks which in the header. Both draw the same data: search, group filter, favourites, recent
 * items and folded groups.
 */

function Shell({
  list,
  layout,
  search,
  onSearch,
  searchLabel,
  placeholder,
  options,
  group,
  onGroup,
  sections,
  empty,
  children,
}: {
  list: ListKind
  layout: Layout
  search: string
  onSearch: (value: string) => void
  searchLabel: string
  placeholder: string
  options: GroupOption[]
  group: string | null
  onGroup: (value: string | null) => void
  sections: ListSection<unknown>[]
  empty: string
  children: ReactNode
}) {
  const tiles = layout === 'tiles'

  return (
    <Stack gap={tiles ? 'md' : 'xs'} className={tiles ? classes.tilesLayout : classes.tableLayout}>
      <TextInput
        size={tiles ? 'md' : 'xs'}
        radius={tiles ? 'xl' : 0}
        maw={tiles ? undefined : 420}
        aria-label={searchLabel}
        placeholder={placeholder}
        value={search}
        onChange={(event) => onSearch(event.currentTarget.value)}
      />
      {options.length === 0 ? (
        <Text c="dimmed">{empty}</Text>
      ) : (
        <>
          <Group gap="xs" justify="space-between" align="flex-start" wrap="nowrap">
            <GroupFilter options={options} value={group} onChange={onGroup} />
            <FoldAll list={list} sections={sections} />
          </Group>
          {children}
        </>
      )}
    </Stack>
  )
}

export function ReferenceDiseases({ catalog }: { catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const [layout] = useLayout()
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const { options, sections } = useDiseaseList(catalog, search, group)

  return (
    <Shell
      list="diseases"
      layout={layout}
      search={search}
      onSearch={setSearch}
      searchLabel={t('diseases.search')}
      placeholder={t('diseases.searchPlaceholder')}
      options={options}
      group={group}
      onGroup={setGroup}
      sections={sections}
      empty={t('diseases.notFound')}
    >
      {layout === 'tiles' ? (
        <TileDiseases sections={sections} search={search} />
      ) : (
        <TableDiseases sections={sections} search={search} />
      )}
    </Shell>
  )
}

/** The section a score sits in when the list is not narrowed: its area, or the general formulas. */
const homeOf = (id: string) => areaOf(id)?.id ?? 'general'

/** `linked` — a score id from `?score=`: it opens with the page and is brought into view. */
export function ReferenceScores({ linked }: { linked?: string }) {
  const { t } = useTranslation()
  const [layout] = useLayout()
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [opened, setOpened] = useState<string | null>(linked ? `${homeOf(linked)}:${linked}` : null)
  const { options, sections } = useScoreList(search, group)
  const { collapsed } = usePicks('scores')

  // A linked score's group is unfolded even if the physician had folded it, then scrolled to
  // once the page has settled; earlier, the browser's own scroll wins.
  useEffect(() => {
    if (!linked) return
    if (collapsed.includes(homeOf(linked))) toggleCollapsed('scores', homeOf(linked))
    const timer = window.setTimeout(
      () => document.getElementById(`score-${linked}`)?.scrollIntoView({ block: 'start' }),
      300,
    )
    return () => window.clearTimeout(timer)
    // Only when the link changes: folding the group again afterwards is the physician's choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked])

  const open = (key: string | null, id: string) => {
    setOpened(key)
    if (key !== null) visit('scores', id)
  }

  return (
    <Shell
      list="scores"
      layout={layout}
      search={search}
      onSearch={setSearch}
      searchLabel={t('scores.search')}
      placeholder={t('scores.search')}
      options={options}
      group={group}
      onGroup={setGroup}
      sections={sections}
      empty={t('scores.none')}
    >
      {layout === 'tiles' ? (
        <TileScores sections={sections} search={search} opened={opened} onOpen={open} />
      ) : (
        <TableScores sections={sections} search={search} opened={opened} onOpen={open} />
      )}
    </Shell>
  )
}
