import { Anchor, Badge, Card, Group, Stack, Tabs, Text, TextInput, Title } from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { routes } from '../../app/routes'
import { CatalogGate } from '../../features/catalog/CatalogGate'
import { IrradiatedSection } from '../../features/irradiated/IrradiatedSection'
import { ICD10_SYSTEM_ID, primaryCode, type CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'

export function DiseasesPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  // The irradiated components are a tab of their own, so the list is not followed by a long
  // table; a link from a disease page opens that tab straight away.
  const tab = searchParams.get('section') === 'irradiated' ? 'irradiated' : 'diseases'
  const chooseTab = (value: string | null) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (value === 'irradiated') params.set('section', 'irradiated')
        else params.delete('section')
        return params
      },
      { replace: true },
    )

  return (
    <Stack>
      <Title order={1}>{t('diseases.title')}</Title>
      <Tabs value={tab} onChange={chooseTab} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="diseases">{t('diseases.tabList')}</Tabs.Tab>
          <Tabs.Tab value="irradiated">{t('irradiated.tab')}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="diseases" pt="md">
          <CatalogGate>{(catalog) => <DiseaseList catalog={catalog} />}</CatalogGate>
        </Tabs.Panel>
        <Tabs.Panel value="irradiated" pt="md">
          {/* Apart from the catalog: it needs no database and is there offline too. */}
          <IrradiatedSection />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

/** First letter of the ICD-10 code: C — neoplasms, D — blood, and so on. */
function icdChapter(code: string | null): string {
  return code === null ? '—' : code.charAt(0).toUpperCase()
}

function DiseaseList({ catalog }: { catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [search, setSearch] = useState('')

  const entries = useMemo(
    () =>
      [...catalog.diseases.values()]
        .map((disease) => {
          const code = primaryCode(catalog, disease.id, ICD10_SYSTEM_ID)
          return {
            disease,
            name: localize(disease.name, language),
            summary: disease.summary === null ? '' : localize(disease.summary, language),
            code: code?.code ?? null,
          }
        })
        .sort(
          (a, b) => a.disease.sort_order - b.disease.sort_order || a.name.localeCompare(b.name),
        ),
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

  if (entries.length === 0) return <Text c="dimmed">{t('diseases.empty')}</Text>

  const groups = new Map<string, typeof found>()
  for (const entry of found) {
    const chapter = icdChapter(entry.code)
    groups.set(chapter, [...(groups.get(chapter) ?? []), entry])
  }

  return (
    <Stack>
      <TextInput
        label={t('diseases.search')}
        placeholder={t('diseases.searchPlaceholder')}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      {found.length === 0 && <Text c="dimmed">{t('diseases.notFound')}</Text>}
      {[...groups.entries()].map(([chapter, list]) => (
        <Card key={chapter} withBorder component="section">
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">
              {t('diseases.chapter', { letter: chapter })}
            </Text>
            <Stack gap="xs" component="ul" p={0} m={0} style={{ listStyle: 'none' }}>
              {list.map((entry) => (
                <Group key={entry.disease.id} component="li" gap="sm" wrap="nowrap" align="start">
                  {entry.code !== null && (
                    <Badge variant="light" miw={64}>
                      {entry.code}
                    </Badge>
                  )}
                  <div>
                    <Anchor component={Link} to={routes.disease(entry.disease.id)}>
                      {entry.name}
                    </Anchor>
                    {entry.summary !== '' && (
                      <Text size="xs" c="dimmed">
                        {entry.summary}
                      </Text>
                    )}
                  </div>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}
