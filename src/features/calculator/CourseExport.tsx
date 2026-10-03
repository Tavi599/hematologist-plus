import { Button, Card, SegmentedControl, Stack, Text, Title } from '@mantine/core'
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
}

/**
 * Hands the calculated course over as an .xlsx workbook. The file is built here in the browser
 * and given straight to the download, so nothing about the patient is uploaded anywhere.
 */
export function CourseExport(props: CourseExportProps) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [layout, setLayout] = useState<SheetLayout>('infusion')

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
        <Button onClick={download}>{t('calculator.export.button')}</Button>
      </Stack>
    </Card>
  )
}
