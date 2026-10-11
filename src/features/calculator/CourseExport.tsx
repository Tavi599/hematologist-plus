import { Button, Card, Checkbox, SegmentedControl, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CourseResult } from '../../domain'
import type { CourseItem } from '../../lib/course-input'
import { currentLanguage } from '../../lib/i18n'
import { saveFile } from '../../lib/save-file'
import { buildXlsx, XLSX_MEDIA_TYPE } from '../../lib/xlsx-writer'
import type { PatientInput } from '../../schemas/patient'
import { buildCourseSheets, type SheetLayout, type Translate } from './course-sheets'
import type { HeaderValue } from './header'
import type { ManualRow } from './manual-rows'
import type { Text2 } from '../irradiated/indications'

export interface CourseExportProps {
  items: CourseItem[]
  /** Null when nothing was calculated: a sheet written out by hand is still printed. */
  course: CourseResult | null
  patient: PatientInput
  regimenName: string | null
  cycleNumber: number
  startDate: string
  /** Start of the working day, HH:MM: the times of a tablet given several times a day. */
  dayStart: string
  header: HeaderValue
  manualRows?: ManualRow[]
  /** Why the course calls for irradiated blood components; empty when it does not show it. */
  irradiationReasons?: Text2[]
}

/**
 * Hands the calculated course over as an .xlsx workbook. The file is built here in the browser
 * and given straight to the download, so nothing about the patient is uploaded anywhere.
 */
export function CourseExport(props: CourseExportProps) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [layout, setLayout] = useState<SheetLayout>('infusion')
  // Ticked when the course shows a reason; the physician ticks it by hand for one it cannot see
  // (Hodgkin lymphoma treated elsewhere, fludarabine years ago) or clears it.
  const reasons = props.irradiationReasons ?? []
  const [irradiatedChoice, setIrradiatedChoice] = useState<boolean | null>(null)
  const irradiatedOnly = irradiatedChoice ?? reasons.length > 0

  const download = () => {
    const sheets = buildCourseSheets({
      items: props.items,
      course: props.course,
      patient: props.patient,
      startDateIso: props.startDate,
      regimenName: props.regimenName,
      manualRows: props.manualRows ?? [],
      cycleNumber: props.cycleNumber,
      header: props.header,
      layout,
      irradiatedOnly,
      dayStart: props.dayStart,
      language,
      t: t as Translate,
    })
    if (sheets.length === 0) return
    saveFile(
      `${t('calculator.export.fileName', { date: props.startDate })}.xlsx`,
      buildXlsx(sheets),
      XLSX_MEDIA_TYPE,
    )
  }

  return (
    <Card withBorder component="section">
      <Stack gap="xs" align="flex-start">
        <Title order={2} size="h4">
          {t('calculator.export.title')}
        </Title>
        <SegmentedControl
          value={layout}
          onChange={(next) => setLayout(next as SheetLayout)}
          data={[
            { value: 'infusion', label: t('calculator.export.layoutInfusion') },
            { value: 'ward', label: t('calculator.export.layoutWard') },
          ]}
          aria-label={t('calculator.export.layout')}
        />
        <Text size="sm" c="dimmed">
          {t(layout === 'ward' ? 'calculator.export.hintWard' : 'calculator.export.hint')}
        </Text>
        <Checkbox
          checked={irradiatedOnly}
          onChange={(event) => setIrradiatedChoice(event.currentTarget.checked)}
          label={t('calculator.export.irradiated')}
          description={
            reasons.length > 0
              ? reasons.map((reason) => reason[language]).join('; ')
              : t('calculator.export.irradiatedHint')
          }
        />
        <Button onClick={download}>{t('calculator.export.button')}</Button>
      </Stack>
    </Card>
  )
}
