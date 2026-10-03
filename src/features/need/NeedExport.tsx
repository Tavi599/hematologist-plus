import { Button, Card, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { saveFile } from '../../lib/save-file'
import { buildXlsx, XLSX_MEDIA_TYPE } from '../../lib/xlsx-writer'
import { needFileName } from './need-file-name'
import { catalogName, needSheetRows, type NeedLine } from './need-lines'
import { buildNeedSheet, FORM_UNITS } from './need-sheet'

/** The distribution form as the file that is handed in — the hint on screen is left behind. */
export function NeedExport({ catalog, lines }: { catalog: CatalogIndex; lines: NeedLine[] }) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const language = currentLanguage()

  const presentationOf = (line: NeedLine) =>
    line.presentationId === null
      ? undefined
      : catalog.rows.drug_presentations.find(
          (presentation) => presentation.id === line.presentationId,
        )

  const download = () => {
    const rows = needSheetRows(
      lines,
      (line) => {
        const presentation = presentationOf(line)
        return presentation === undefined ? '' : FORM_UNITS[presentation.form]
      },
      (line) => {
        if (line.name.trim() !== '') return line.name.trim()
        const presentation = presentationOf(line)
        return presentation === undefined
          ? ''
          : catalogName(catalog, presentation, language, (unit) => tu(`units.${unit}`))
      },
    )
    const date = new Date().toISOString().slice(0, 10)
    // The drugs of the form name the file, so a folder of them can be read at a glance.
    const fileName = needFileName(
      rows.map((row) => row.name),
      date,
      { fallback: t('need.export.fileNameFallback'), more: t('need.export.fileNameMore') },
    )
    saveFile(
      `${fileName}.xlsx`,
      buildXlsx([buildNeedSheet(rows, t('need.export.sheet'))]),
      XLSX_MEDIA_TYPE,
    )
  }

  return (
    <Card withBorder component="section">
      <Stack gap="xs" align="flex-start">
        <Title order={2} size="h4">
          {t('need.export.title')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('need.export.hint')}
        </Text>
        <Button onClick={download}>{t('need.export.button')}</Button>
      </Stack>
    </Card>
  )
}
