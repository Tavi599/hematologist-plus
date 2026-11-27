import { Card, Stack, Switch, Text, TextInput, Title } from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CatalogGate } from '../../features/catalog/CatalogGate'
import { CourseExport } from '../../features/calculator/CourseExport'
import { HospitalHeader } from '../../features/calculator/HospitalHeader'
import { isWritten } from '../../features/calculator/manual-rows'
import { ManualRowsEditor } from '../../features/calculator/ManualRows'
import { SaveFolderCard } from '../../features/calculator/SaveFolder'
import type { CatalogIndex } from '../../lib/catalog-index'
import { personalInDraft, setPersonalInDraft } from '../../lib/course-draft'
import { initialFreeSheet, loadFreeSheet, saveFreeSheet } from '../../lib/free-sheet-draft'
import type { FreeSheetState } from '../../schemas/free-sheet'
import { emptyPatientForm, patientFormSchema } from '../../schemas/patient'
import classes from '../NeedPage/NeedPage.module.css'

/**
 * A prescription sheet written out freely: support, antibiotics, anything the physician thinks
 * the patient needs, with no regimen and no disease behind it. Nothing is calculated, so nothing
 * about the patient is asked but the name the sheet is written for — every line is printed as it
 * is typed, on the same blanks as a calculated course.
 */
export function FreeSheetPage() {
  const { t } = useTranslation()

  return (
    <Stack>
      <Title order={1}>{t('freeSheet.title')}</Title>
      <Text c="dimmed">{t('freeSheet.lead')}</Text>
      <CatalogGate>{(catalog) => <FreeSheet catalog={catalog} />}</CatalogGate>
    </Stack>
  )
}

function FreeSheet({ catalog }: { catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const [sheet, setSheet] = useState<FreeSheetState>(() => loadFreeSheet() ?? initialFreeSheet())
  const [personal, setPersonal] = useState(() => personalInDraft())
  const [kept, setKept] = useState(true)
  // Kept on the device as it is written, as the calculator keeps its course.
  const change = (next: FreeSheetState, allowed = personal) => {
    setSheet(next)
    setKept(saveFreeSheet(next, allowed))
  }
  const patch = (next: Partial<FreeSheetState>) => change({ ...sheet, ...next })

  // The blank names the patient and nothing else: no measurement is asked, none is printed.
  const patient = useMemo(
    () =>
      patientFormSchema.parse({
        ...emptyPatientForm(),
        fullName: sheet.fullName,
        recordNumber: sheet.recordNumber,
      }),
    [sheet.fullName, sheet.recordNumber],
  )
  const written = sheet.rows.some(isWritten)

  return (
    <div className={classes.layout}>
      <Stack gap="sm" className={classes.results}>
        <Card withBorder component="section">
          <Stack gap="xs">
            <Title order={2} size="h4">
              {t('freeSheet.rows')}
            </Title>
            <Text size="xs" c="dimmed">
              {t('freeSheet.rowsHint')}
            </Text>
            <ManualRowsEditor
              rows={sheet.rows}
              onChange={(rows) => patch({ rows })}
              catalog={catalog}
            />
          </Stack>
        </Card>
      </Stack>

      <Stack gap="sm" className={classes.aside}>
        <Card withBorder component="section">
          <Stack gap="xs">
            <Title order={2} size="h4">
              {t('freeSheet.patient')}
            </Title>
            <TextInput
              label={t('calculator.patient.fullName')}
              value={sheet.fullName}
              onChange={(event) => patch({ fullName: event.currentTarget.value })}
            />
            <TextInput
              label={t('calculator.patient.recordNumber')}
              value={sheet.recordNumber}
              onChange={(event) => patch({ recordNumber: event.currentTarget.value })}
            />
            <TextInput
              type="date"
              label={t('freeSheet.startDate')}
              description={t('freeSheet.startDateHint')}
              value={sheet.startDate}
              onChange={(event) => patch({ startDate: event.currentTarget.value })}
            />
            <Switch
              checked={personal}
              onChange={(event) => {
                const allowed = event.currentTarget.checked
                setPersonal(allowed)
                setPersonalInDraft(allowed)
                change(sheet, allowed)
              }}
              label={t('calculator.draft.personal')}
              description={t('freeSheet.draftHint')}
            />
            {!kept && (
              <Text size="xs" c="red.8">
                {t('calculator.draft.notKept')}
              </Text>
            )}
          </Stack>
        </Card>

        {written && sheet.startDate !== '' ? (
          <CourseExport
            items={[]}
            course={null}
            patient={patient}
            regimenName={null}
            cycleNumber={1}
            startDate={sheet.startDate}
            // Only a calculated drug given several times a day hangs off it; the free sheet has none.
            dayStart={sheet.dayStart || '11:00'}
            header={sheet.header}
            manualRows={sheet.rows}
          />
        ) : (
          <Card withBorder>
            <Text size="sm" c="dimmed">
              {t(written ? 'freeSheet.noDate' : 'freeSheet.empty')}
            </Text>
          </Card>
        )}
        <SaveFolderCard />
        <HospitalHeader
          catalog={catalog}
          value={sheet.header}
          onChange={(header) => patch({ header })}
        />
      </Stack>
    </div>
  )
}
