import { Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CatalogGate } from '../../features/catalog/CatalogGate'
import { NeedExport } from '../../features/need/NeedExport'
import { NeedHint } from '../../features/need/NeedHint'
import { newNeedLine, type NeedLine } from '../../features/need/need-lines'
import { NeedLines } from '../../features/need/NeedLines'
import type { CatalogIndex } from '../../lib/catalog-index'

/**
 * The need for a drug on the Ministry's distribution form. The form is filled in drug by drug;
 * what one course takes is counted below it as a hint and goes nowhere near the file.
 */
export function NeedPage() {
  const { t } = useTranslation()

  return (
    <Stack>
      <Title order={1}>{t('need.title')}</Title>
      <Text c="dimmed">{t('need.lead')}</Text>
      <CatalogGate>{(catalog) => <NeedForm catalog={catalog} />}</CatalogGate>
    </Stack>
  )
}

function NeedForm({ catalog }: { catalog: CatalogIndex }) {
  const [lines, setLines] = useState<NeedLine[]>(() => [newNeedLine('line-1')])
  const [bsaM2, setBsaM2] = useState<number | null>(null)

  return (
    <Stack>
      <NeedLines catalog={catalog} lines={lines} onChange={setLines} />
      <NeedHint
        catalog={catalog}
        lines={lines}
        bsaM2={bsaM2}
        onBsaChange={setBsaM2}
        onChange={setLines}
      />
      <NeedExport catalog={catalog} lines={lines} />
    </Stack>
  )
}
