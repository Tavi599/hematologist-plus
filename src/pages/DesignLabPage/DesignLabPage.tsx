import { Alert, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { CatalogGate } from '../../features/catalog/CatalogGate'
import { DirectionDense } from './DirectionDense'
import { DirectionPaper } from './DirectionPaper'
import { DirectionRoomy } from './DirectionRoomy'
import type { LabSection } from './direction-props'

/**
 * A scratch page for choosing where the design of the reference sections should go, before any
 * of it is applied for real: the same two sections — diseases and scores — on the same live
 * catalog, drawn three ways. It is reached by its address only and is in no menu.
 *
 * The choice lives in the URL (`#/design?v=paper&s=scores`) so a direction can be sent as a link
 * or kept open in a second tab beside the first.
 */
const DIRECTIONS = ['dense', 'paper', 'roomy'] as const
type Direction = (typeof DIRECTIONS)[number]

const SECTIONS: LabSection[] = ['diseases', 'scores']

export function DesignLabPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const fromUrl = searchParams.get('v')
  const direction: Direction =
    fromUrl !== null && (DIRECTIONS as readonly string[]).includes(fromUrl)
      ? (fromUrl as Direction)
      : 'dense'

  const sectionParam = searchParams.get('s')
  const section: LabSection =
    sectionParam !== null && (SECTIONS as string[]).includes(sectionParam)
      ? (sectionParam as LabSection)
      : 'diseases'

  const choose = (key: 'v' | 's', value: string) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.set(key, value)
        return params
      },
      { replace: true },
    )

  return (
    <Stack gap="sm">
      <Title order={1}>{t('designLab.title')}</Title>
      <Alert variant="light" color="gray" title={t('designLab.scratchTitle')}>
        {t('designLab.scratch')}
      </Alert>

      <Group gap="md" align="flex-end" wrap="wrap">
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            {t('designLab.direction')}
          </Text>
          <SegmentedControl
            size="sm"
            value={direction}
            onChange={(value) => choose('v', value)}
            data={DIRECTIONS.map((key) => ({ value: key, label: t(`designLab.${key}.name`) }))}
          />
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            {t('designLab.section')}
          </Text>
          <SegmentedControl
            size="sm"
            value={section}
            onChange={(value) => choose('s', value)}
            data={SECTIONS.map((key) => ({ value: key, label: t(`designLab.sectionName.${key}`) }))}
          />
        </Stack>
      </Group>

      <Text size="sm" c="dimmed">
        {t(`designLab.${direction}.idea`)}
      </Text>

      <CatalogGate>
        {(catalog) => {
          const props = { catalog, search, onSearch: setSearch, section }
          if (direction === 'paper') return <DirectionPaper {...props} />
          if (direction === 'roomy') return <DirectionRoomy {...props} />
          return <DirectionDense {...props} />
        }}
      </CatalogGate>
    </Stack>
  )
}
