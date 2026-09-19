import { Button, Card, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CourseResult } from '../../domain'
import type { CourseItem } from '../../lib/course-input'
import { currentLanguage } from '../../lib/i18n'
import { buildXlsx, XLSX_MEDIA_TYPE } from '../../lib/xlsx-writer'
import type { PatientInput } from '../../schemas/patient'
import { buildCourseSheets, type Translate } from './course-sheets'
import type { HeaderValue } from './header'

export interface CourseExportProps {
  items: CourseItem[]
  course: CourseResult
  patient: PatientInput
  regimenName: string | null
  cycleNumber: number
  startDate: string
  header: HeaderValue
}

/**
 * Hands the calculated course over as an .xlsx workbook. The file is built here in the browser
 * and given straight to the download, so nothing about the patient is uploaded anywhere.
 */
export function CourseExport(props: CourseExportProps) {
  const { t } = useTranslation()
  const language = currentLanguage()

  const download = () => {
    const sheets = buildCourseSheets({
      items: props.items,
      course: props.course,
      patient: props.patient,
      regimenName: props.regimenName,
      cycleNumber: props.cycleNumber,
      header: props.header,
      language,
      t: t as Translate,
    })
    if (sheets.length === 0) return
    saveFile(
      `${t('calculator.export.fileName', { date: props.startDate })}.xlsx`,
      buildXlsx(sheets),
    )
  }

  return (
    <Card withBorder component="section">
      <Stack gap="xs" align="flex-start">
        <Title order={2} size="h4">
          {t('calculator.export.title')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('calculator.export.hint')}
        </Text>
        <Button onClick={download}>{t('calculator.export.button')}</Button>
      </Stack>
    </Card>
  )
}

function saveFile(name: string, data: Uint8Array): void {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: XLSX_MEDIA_TYPE }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
