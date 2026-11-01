import { Box } from '@mantine/core'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import { currentLanguage } from '../../lib/i18n'
import { ScoreCard } from '../scores/ScoreCard'
import type { Score } from '../scores/types'
import type { DiseaseEntry, ListSection } from './list-data'
import { Match, SectionToggle, StarButton, TreatmentBadges } from './ListParts'
import { visit } from './picks'
import classes from './reference-list.module.css'

/**
 * The lists as a table: row 30 px, the ICD code its own monospaced column, group headings sticky
 * inside the table and folding their rows away. The accent marks what can be acted on — links,
 * the chosen filter, a favourite — and nothing else.
 */

export function TableDiseases({
  sections,
  search,
}: {
  sections: ListSection<DiseaseEntry>[]
  search: string
}) {
  const { t } = useTranslation()

  return (
    <div className={classes.tableWrap}>
      <Box component="table">
        <thead>
          <tr>
            <th className={classes.starCol} />
            <th style={{ width: 96 }}>{t('referenceList.code')}</th>
            <th style={{ width: 280 }}>{t('referenceList.name')}</th>
            <th style={{ width: 170 }}>{t('referenceList.treatment')}</th>
            <th className={classes.summary}>{t('referenceList.summary')}</th>
          </tr>
        </thead>
        {sections.map((section) => (
          <tbody key={section.key}>
            <tr
              className={
                section.pinned ? `${classes.groupRow} ${classes.pinned}` : classes.groupRow
              }
            >
              <td colSpan={5}>
                <SectionToggle list="diseases" section={section} />
              </td>
            </tr>
            {!section.collapsed &&
              section.entries.map((entry) => (
                <tr key={entry.id}>
                  <td className={classes.starCol}>
                    <StarButton list="diseases" id={entry.id} />
                  </td>
                  <td className={classes.code}>
                    {entry.code === null ? '—' : <Match text={entry.code} search={search} />}
                  </td>
                  <td>
                    <Link
                      to={routes.disease(entry.id)}
                      className={classes.rowLink}
                      onClick={() => visit('diseases', entry.id)}
                    >
                      <Match text={entry.name} search={search} />
                    </Link>
                  </td>
                  <td>
                    <TreatmentBadges entry={entry} onOpen={() => visit('diseases', entry.id)} />
                  </td>
                  <td className={classes.summary}>
                    <Match text={entry.summary} search={search} />
                  </td>
                </tr>
              ))}
          </tbody>
        ))}
      </Box>
    </div>
  )
}

export function TableScores({
  sections,
  search,
  opened,
  onOpen,
}: {
  sections: ListSection<Score>[]
  search: string
  /** `<section key>:<score id>`: a score can sit both in its area and among the favourites. */
  opened: string | null
  onOpen: (key: string | null, id: string) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()

  return (
    <div className={classes.tableWrap}>
      <Box component="table">
        <thead>
          <tr>
            <th className={classes.starCol} />
            <th style={{ width: 260 }}>{t('referenceList.name')}</th>
            <th className={classes.summary}>{t('referenceList.purpose')}</th>
          </tr>
        </thead>
        {sections.map((section) => (
          <tbody key={section.key}>
            <tr
              className={
                section.pinned ? `${classes.groupRow} ${classes.pinned}` : classes.groupRow
              }
            >
              <td colSpan={3}>
                <SectionToggle list="scores" section={section} />
              </td>
            </tr>
            {!section.collapsed &&
              section.entries.map((score) => {
                const key = `${section.key}:${score.id}`
                return (
                  <Fragment key={score.id}>
                    <tr id={section.pinned ? undefined : `score-${score.id}`}>
                      <td className={classes.starCol}>
                        <StarButton list="scores" id={score.id} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`${classes.rowLink} ${classes.rowButton}`}
                          aria-expanded={opened === key}
                          onClick={() => onOpen(opened === key ? null : key, score.id)}
                        >
                          <Match text={score.title[language]} search={search} />
                        </button>
                      </td>
                      <td className={classes.summary}>
                        <Match text={score.purpose[language]} search={search} />
                      </td>
                    </tr>
                    {/* The form takes the whole width of the table, not the name column. */}
                    {opened === key && (
                      <tr className={classes.openRow}>
                        <td colSpan={3}>
                          <ScoreCard score={score} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
          </tbody>
        ))}
      </Box>
    </div>
  )
}
