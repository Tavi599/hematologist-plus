import { Button, Card, Collapse, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CourseResult } from '../../domain'
import type { CourseItem } from '../../lib/course-input'
import { currentLanguage } from '../../lib/i18n'
import { courseFileTarget } from '../../lib/course-file-name'
import type { SaveOutcome } from '../../lib/save-folder'
import { useSaveFolder } from '../../lib/use-save-folder'
import { buildXlsx, XLSX_MEDIA_TYPE } from '../../lib/xlsx-writer'
import type { PatientInput } from '../../schemas/patient'
import { buildCourseSheets, type SheetLayout, type Translate } from './course-sheets'
import { SaveOutcomeNote } from './SaveFolder'
import { SheetPreview } from './SheetPreview'
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
  // The preview holds the whole blank as a table: it is built only once the physician opens it.
  const [previewOpen, setPreviewOpen] = useState(false)
  const folder = useSaveFolder()
  const [saved, setSaved] = useState<SaveOutcome | null>(null)

  const sheets = useMemo(
    () =>
      buildCourseSheets({
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
      }),
    [
      props.items,
      props.course,
      props.patient,
      props.startDate,
      props.regimenName,
      props.manualRows,
      props.cycleNumber,
      props.header,
      props.dayStart,
      layout,
      language,
      t,
    ],
  )

  /** Into the device's folder, in the patient's subfolder; a plain download where there is none. */
  const download = () => {
    if (sheets.length === 0) return
    const target = courseFileTarget(props.patient.fullName, new Date(), (date) =>
      t('calculator.saveFolder.fileNameFallback', { date }),
    )
    void folder.save(target, 'xlsx', buildXlsx(sheets), XLSX_MEDIA_TYPE).then(setSaved)
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
        <Group gap="xs" wrap="wrap">
          <Button onClick={download} disabled={sheets.length === 0}>
            {t('calculator.export.button')}
          </Button>
          <Button
            variant="default"
            onClick={() => setPreviewOpen((open) => !open)}
            aria-expanded={previewOpen}
          >
            {t(previewOpen ? 'calculator.preview.hide' : 'calculator.preview.show')}
          </Button>
        </Group>
        <SaveOutcomeNote outcome={saved} />
        {/* Built only once it is open: the blank is a table of hundreds of cells. */}
        <Collapse expanded={previewOpen} keepMounted={false} w="100%">
          <SheetPreview sheets={sheets} />
        </Collapse>
      </Stack>
    </Card>
  )
}
