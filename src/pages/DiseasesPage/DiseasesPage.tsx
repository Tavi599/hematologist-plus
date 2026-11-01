import { Stack, Tabs, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { CatalogGate } from '../../features/catalog/CatalogGate'
import { CnsProphylaxisSection } from '../../features/cns-prophylaxis/CnsProphylaxisSection'
import { TAB as CNS_PROPHYLAXIS_TAB } from '../../features/cns-prophylaxis/content'
import { FEBRILE_NEUTROPENIA_DISEASE } from '../../features/febrile-neutropenia/algorithm'
import { FebrileNeutropeniaSection } from '../../features/febrile-neutropenia/FebrileNeutropeniaSection'
import { IrradiatedSection } from '../../features/irradiated/IrradiatedSection'
import { ReferenceDiseases } from '../../features/reference-list/ReferenceLists'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'

/** Tabs beside the list, each opened by `?section=` so a link can land on it. */
const SECTIONS = ['irradiated', 'febrile-neutropenia', 'cns-prophylaxis']

export function DiseasesPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  // The irradiated components and febrile neutropenia are tabs of their own, so the list is not
  // followed by long tables; a link from a disease page opens its tab straight away.
  const section = searchParams.get('section')
  const tab = section !== null && SECTIONS.includes(section) ? section : 'diseases'
  const chooseTab = (value: string | null) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (value !== null && SECTIONS.includes(value)) params.set('section', value)
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
          <Tabs.Tab value="febrile-neutropenia">{t('febrileNeutropenia.tab')}</Tabs.Tab>
          <Tabs.Tab value="cns-prophylaxis">
            {localize(CNS_PROPHYLAXIS_TAB, currentLanguage())}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="diseases" pt="md">
          <CatalogGate>{(catalog) => <DiseaseList catalog={catalog} />}</CatalogGate>
        </Tabs.Panel>
        <Tabs.Panel value="irradiated" pt="md">
          {/* Apart from the catalog: it needs no database and is there offline too. */}
          <IrradiatedSection />
        </Tabs.Panel>
        <Tabs.Panel value="febrile-neutropenia" pt="md">
          <FebrileNeutropeniaSection />
        </Tabs.Panel>
        <Tabs.Panel value="cns-prophylaxis" pt="md">
          <CnsProphylaxisSection />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

function DiseaseList({ catalog }: { catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const any = [...catalog.diseases.keys()].some((id) => id !== FEBRILE_NEUTROPENIA_DISEASE)
  if (!any) return <Text c="dimmed">{t('diseases.empty')}</Text>
  return <ReferenceDiseases catalog={catalog} />
}
