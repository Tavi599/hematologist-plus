import { Card, Stack } from '@mantine/core'
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
 * The lists as tiles, built for a phone in the ward first: the whole tile is a touch target, and
 * a score opens into a card below its group. The star and the algorithm link sit above the
 * tile's own link, so each is a target of its own.
 */

export function TileDiseases({
  sections,
  search,
}: {
  sections: ListSection<DiseaseEntry>[]
  search: string
}) {
  return (
    <Stack gap="lg">
      {sections.map((section) => (
        <Stack key={section.key} gap="xs" component="section">
          <h2 className={classes.groupTitle}>
            <SectionToggle
              list="diseases"
              section={section}
              className={section.pinned ? classes.pinned : undefined}
            />
          </h2>
          {!section.collapsed && (
            <div className={classes.tiles}>
              {section.entries.map((entry) => (
                <div key={entry.id} className={classes.tile}>
                  <span className={classes.tileTop}>
                    <span className={classes.tileCode}>
                      {entry.code !== null && <Match text={entry.code} search={search} />}
                    </span>
                    <StarButton list="diseases" id={entry.id} />
                  </span>
                  <Link
                    to={routes.disease(entry.id)}
                    className={`${classes.tileName} ${classes.stretched}`}
                    onClick={() => visit('diseases', entry.id)}
                  >
                    <Match text={entry.name} search={search} />
                  </Link>
                  {entry.summary !== '' && (
                    <span className={classes.tileSummary}>
                      <Match text={entry.summary} search={search} />
                    </span>
                  )}
                  <TreatmentBadges entry={entry} onOpen={() => visit('diseases', entry.id)} />
                </div>
              ))}
            </div>
          )}
        </Stack>
      ))}
    </Stack>
  )
}

export function TileScores({
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
  const language = currentLanguage()

  return (
    <Stack gap="lg">
      {sections.map((section) => {
        const open = section.entries.find((score) => `${section.key}:${score.id}` === opened)
        return (
          <Stack key={section.key} gap="xs" component="section">
            <h2 className={classes.groupTitle}>
              <SectionToggle
                list="scores"
                section={section}
                className={section.pinned ? classes.pinned : undefined}
              />
            </h2>
            {!section.collapsed && (
              <>
                <div className={classes.tiles}>
                  {section.entries.map((score) => {
                    const key = `${section.key}:${score.id}`
                    return (
                      <div
                        key={score.id}
                        className={classes.tile}
                        id={section.pinned ? undefined : `score-${score.id}`}
                      >
                        <span className={classes.tileTop}>
                          <span />
                          <StarButton list="scores" id={score.id} />
                        </span>
                        <button
                          type="button"
                          className={`${classes.tileName} ${classes.stretched} ${classes.tileButton}`}
                          aria-expanded={opened === key}
                          onClick={() => onOpen(opened === key ? null : key, score.id)}
                        >
                          <Match text={score.title[language]} search={search} />
                        </button>
                        <span className={classes.tileSummary}>
                          <Match text={score.purpose[language]} search={search} />
                        </span>
                      </div>
                    )
                  })}
                </div>
                {open && (
                  <Card withBorder radius="lg" padding="md" className={classes.openCard}>
                    <ScoreCard score={open} />
                  </Card>
                )}
              </>
            )}
          </Stack>
        )
      })}
    </Stack>
  )
}
