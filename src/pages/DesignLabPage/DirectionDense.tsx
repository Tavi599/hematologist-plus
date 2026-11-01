import { Anchor, Box, Stack, Text, TextInput } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import { ScoreCard } from '../../features/scores/ScoreCard'
import { currentLanguage } from '../../lib/i18n'
import classes from './design-lab.module.css'
import { useDiseaseGroups, useScoreGroups } from './design-lab-data'
import type { DirectionProps } from './direction-props'

/**
 * A · dense: the list is a table, not cards. Row 30 px, the ICD code its own monospaced column,
 * group headings sticky inside the table. Colour carries state only, so there is none here.
 */
export function DirectionDense({ catalog, search, onSearch, section }: DirectionProps) {
  const { t } = useTranslation()

  return (
    <Stack gap="xs" className={`${classes.lab} ${classes.dense}`}>
      <TextInput
        size="xs"
        maw={360}
        radius={0}
        placeholder={section === 'diseases' ? t('diseases.searchPlaceholder') : t('scores.search')}
        value={search}
        onChange={(event) => onSearch(event.currentTarget.value)}
      />
      {section === 'diseases' ? (
        <DenseDiseases catalog={catalog} search={search} />
      ) : (
        <DenseScores search={search} />
      )}
    </Stack>
  )
}

function DenseDiseases({ catalog, search }: Pick<DirectionProps, 'catalog' | 'search'>) {
  const { t } = useTranslation()
  const groups = useDiseaseGroups(catalog, search)

  if (groups.length === 0) return <Text c="dimmed">{t('diseases.notFound')}</Text>

  return (
    <Box component="table">
      <thead>
        <tr>
          <th style={{ width: 96 }}>{t('designLab.code')}</th>
          <th style={{ width: 280 }}>{t('designLab.name')}</th>
          <th>{t('designLab.summary')}</th>
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.key}>
          <tr className={classes.groupRow}>
            <td colSpan={3}>
              {t(`diseases.group.${group.key}`)} · {group.entries.length}
            </td>
          </tr>
          {group.entries.map((entry) => (
            <tr key={entry.id}>
              <td className={classes.code}>{entry.code ?? '—'}</td>
              <td>
                <Link to={routes.disease(entry.id)} className={classes.rowLink}>
                  {entry.name}
                </Link>
              </td>
              <td className={classes.summary}>{entry.summary}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </Box>
  )
}

function DenseScores({ search }: Pick<DirectionProps, 'search'>) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const groups = useScoreGroups(search)
  const [opened, setOpened] = useState<string | null>(null)

  if (groups.length === 0) return <Text c="dimmed">{t('scores.none')}</Text>

  return (
    <Box component="table">
      <thead>
        <tr>
          <th style={{ width: 220 }}>{t('designLab.name')}</th>
          <th>{t('designLab.purpose')}</th>
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.area?.id ?? 'general'}>
          <tr className={classes.groupRow}>
            <td colSpan={2}>
              {group.area ? group.area.title[language] : t('scores.forAll')} · {group.scores.length}
            </td>
          </tr>
          {group.scores.map((score) => (
            <tr key={score.id}>
              <td>
                <Anchor
                  component="button"
                  type="button"
                  underline="never"
                  className={classes.rowLink}
                  onClick={() => setOpened(opened === score.id ? null : score.id)}
                >
                  {score.title[language]}
                </Anchor>
                {opened === score.id && (
                  <Box pt="xs" pb="xs">
                    <ScoreCard score={score} />
                  </Box>
                )}
              </td>
              <td className={classes.summary}>{score.purpose[language]}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </Box>
  )
}
