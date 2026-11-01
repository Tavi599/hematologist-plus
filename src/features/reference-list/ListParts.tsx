import { Highlight } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import type { DiseaseEntry, GroupOption, ListSection } from './list-data'
import { setAllCollapsed, toggleCollapsed, toggleFavorite, usePicks, type ListKind } from './picks'
import classes from './reference-list.module.css'

/** Pieces the table and the tiles draw the same way; the list's class decides how they look. */

export function GroupFilter({
  options,
  value,
  onChange,
}: {
  options: GroupOption[]
  value: string | null
  onChange: (value: string | null) => void
}) {
  const { t } = useTranslation()
  const chosen = options.some((option) => option.key === value) ? value : null

  return (
    <div className={classes.chips}>
      <button
        type="button"
        className={classes.chip}
        aria-pressed={chosen === null}
        onClick={() => onChange(null)}
      >
        {t('referenceList.all')}
      </button>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={classes.chip}
          aria-pressed={chosen === option.key}
          onClick={() => onChange(chosen === option.key ? null : option.key)}
        >
          {option.label} <span className={classes.chipCount}>{option.count}</span>
        </button>
      ))}
    </div>
  )
}

export function StarButton({ list, id }: { list: ListKind; id: string }) {
  const { t } = useTranslation()
  const on = usePicks(list).favorites.includes(id)

  return (
    <button
      type="button"
      className={classes.star}
      aria-pressed={on}
      aria-label={t(on ? 'referenceList.unpin' : 'referenceList.pin')}
      title={t(on ? 'referenceList.unpin' : 'referenceList.pin')}
      onClick={() => toggleFavorite(list, id)}
    >
      {on ? '★' : '☆'}
    </button>
  )
}

/** How many regimens the disease's tree holds, and a way straight to its algorithm. */
export function TreatmentBadges({ entry, onOpen }: { entry: DiseaseEntry; onOpen: () => void }) {
  const { t } = useTranslation()

  return (
    <span className={classes.badges}>
      {entry.regimens > 0 && (
        <span className={classes.badge}>
          {t('referenceList.regimens', { count: entry.regimens })}
        </span>
      )}
      {entry.hasPathway && (
        <Link to={routes.pathways(entry.id)} className={classes.badgeLink} onClick={onOpen}>
          {t('referenceList.pathway')} →
        </Link>
      )}
    </span>
  )
}

/** Text with the search match marked. */
export function Match({ text, search }: { text: string; search: string }) {
  const query = search.trim()
  if (query === '') return text
  return (
    <Highlight component="span" inherit highlight={query}>
      {text}
    </Highlight>
  )
}

/** A group heading that folds its group away; the count stays in view while folded. */
export function SectionToggle({
  list,
  section,
  className,
}: {
  list: ListKind
  section: ListSection<unknown>
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className={`${classes.sectionToggle} ${className ?? ''}`}
      aria-expanded={!section.collapsed}
      title={t(section.collapsed ? 'referenceList.expand' : 'referenceList.collapse', {
        group: section.title,
      })}
      onClick={() => toggleCollapsed(list, section.key)}
    >
      <span className={classes.chevron} aria-hidden="true">
        {section.collapsed ? '▸' : '▾'}
      </span>
      {section.title} · {section.entries.length}
    </button>
  )
}

/** Folds every group shown away, or opens them all when they already are. */
export function FoldAll({ list, sections }: { list: ListKind; sections: ListSection<unknown>[] }) {
  const { t } = useTranslation()
  const keys = sections.map((section) => section.key)
  const allFolded = sections.length > 0 && sections.every((section) => section.collapsed)

  return (
    <button
      type="button"
      className={classes.foldAll}
      onClick={() => setAllCollapsed(list, keys, !allFolded)}
    >
      {t(allFolded ? 'referenceList.expandAll' : 'referenceList.collapseAll')}
    </button>
  )
}
