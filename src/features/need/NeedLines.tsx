import {
  ActionIcon,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import {
  catalogName,
  defaultMonthlyUse,
  needLineTotals,
  newNeedLine,
  type NeedLine,
} from './need-lines'
import { FORM_UNITS } from './need-sheet'

/**
 * The nine graphs of the distribution form, edited line by line. A line is a card rather than a
 * table row: nine graphs do not fit the 375 px the department reads the site on.
 */
export function NeedLines({
  catalog,
  lines,
  onChange,
}: {
  catalog: CatalogIndex
  lines: NeedLine[]
  onChange: (lines: NeedLine[]) => void
}) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const language = currentLanguage()
  const unitLabel = (unit: string) => tu(`units.${unit}`)
  // Two lines added in the same millisecond would otherwise share a key, and a figure typed into
  // one would land in both.
  const added = useRef(0)

  const drugs = [...catalog.drugs.values()]
    .map((drug) => ({ value: drug.id, label: localize(drug.name, language) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const patch = (key: string, next: Partial<NeedLine>) => {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...next } : line)))
  }

  /** «флак», «таб» — the unit of measure the form is filled in with. */
  const unitOf = (line: NeedLine): string | null => {
    const presentation = catalog.rows.drug_presentations.find(
      (row) => row.id === line.presentationId,
    )
    return presentation === undefined ? null : FORM_UNITS[presentation.form]
  }

  const nameOf = (presentationId: string | null): string => {
    const presentation = catalog.rows.drug_presentations.find((row) => row.id === presentationId)
    return presentation === undefined ? '' : catalogName(catalog, presentation, language, unitLabel)
  }

  const chooseDrug = (line: NeedLine, drugId: string | null) => {
    const presentation = drugId ? catalog.presentationsByDrug.get(drugId)?.[0] : undefined
    patch(line.key, {
      drugId,
      presentationId: presentation?.id ?? null,
      regimenId: null,
      name: nameOf(presentation?.id ?? null),
    })
  }

  /**
   * The name follows the pack it was taken from — a line about the 500 mg vial must not go on
   * saying 100 mg. A name the physician wrote themselves is theirs, and is left alone.
   */
  const choosePresentation = (line: NeedLine, presentationId: string | null) => {
    const written = line.name.trim()
    const wasOurs = written === '' || written === nameOf(line.presentationId)
    patch(line.key, {
      presentationId,
      ...(wasOurs ? { name: nameOf(presentationId) } : {}),
    })
  }

  return (
    <Card withBorder component="section">
      <Stack gap="md">
        <Title order={2} size="h4">
          {t('need.form.title')}
        </Title>

        {lines.map((line, index) => {
          const presentations = (
            line.drugId ? (catalog.presentationsByDrug.get(line.drugId) ?? []) : []
          ).map((presentation) => ({
            value: presentation.id,
            label: catalogName(catalog, presentation, language, unitLabel),
          }))
          const totals = needLineTotals(line)

          return (
            <Card key={line.key} withBorder padding="sm">
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600} size="sm">
                    {t('need.form.line', { number: index + 1 })}
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t('need.form.remove')}
                    onClick={() => onChange(lines.filter((other) => other.key !== line.key))}
                  >
                    ×
                  </ActionIcon>
                </Group>

                <Group align="flex-end" wrap="wrap" gap="sm">
                  <Select
                    label={t('need.form.drug')}
                    data={drugs}
                    value={line.drugId}
                    onChange={(value) => chooseDrug(line, value)}
                    searchable
                    clearable
                    w={240}
                  />
                  <Select
                    label={t('need.form.presentation')}
                    // The form has a graph of its own for this, so it is worth seeing beforehand
                    // which word will stand in it.
                    description={
                      unitOf(line) === null
                        ? undefined
                        : t('need.form.unit', { unit: unitOf(line) })
                    }
                    data={presentations}
                    value={line.presentationId}
                    onChange={(value) => choosePresentation(line, value)}
                    disabled={presentations.length === 0}
                    w={200}
                  />
                  <TextInput
                    label={t('need.form.name')}
                    description={t('need.form.nameHint')}
                    value={line.name}
                    onChange={(event) => patch(line.key, { name: event.currentTarget.value })}
                    w={260}
                  />
                </Group>

                <Group align="flex-end" wrap="wrap" gap="sm">
                  <TextInput
                    label={t('need.form.order')}
                    value={line.orderRef}
                    onChange={(event) => patch(line.key, { orderRef: event.currentTarget.value })}
                    w={200}
                  />
                  <NumberInput
                    label={t('need.form.patients')}
                    value={line.patients ?? ''}
                    onChange={(value) => patch(line.key, { patients: asNumber(value) })}
                    min={0}
                    allowDecimal={false}
                    w={120}
                  />
                  <NumberInput
                    label={t('need.form.courses')}
                    value={line.courses ?? ''}
                    onChange={(value) => patch(line.key, { courses: asNumber(value) })}
                    min={0}
                    allowDecimal={false}
                    w={120}
                  />
                  <NumberInput
                    label={t('need.form.perCourse')}
                    value={line.packsPerCourse ?? ''}
                    onChange={(value) => patch(line.key, { packsPerCourse: asNumber(value) })}
                    min={0}
                    allowDecimal={false}
                    w={140}
                  />
                  <NumberInput
                    label={t('need.form.stock')}
                    value={line.stock ?? ''}
                    onChange={(value) => patch(line.key, { stock: asNumber(value) })}
                    min={0}
                    allowDecimal={false}
                    w={120}
                  />
                  <NumberInput
                    label={t('need.form.monthlyUse')}
                    description={t('need.form.monthlyUseHint')}
                    value={line.monthlyUse ?? ''}
                    placeholder={String(defaultMonthlyUse(line) ?? '')}
                    onChange={(value) => patch(line.key, { monthlyUse: asNumber(value) })}
                    min={0}
                    allowDecimal={false}
                    w={190}
                  />
                </Group>

                <Group align="flex-end" wrap="wrap" gap="sm">
                  <Text size="sm">
                    {t('need.form.total')}: <strong>{totals.total}</strong>
                  </Text>
                  <NumberInput
                    label={t('need.form.months')}
                    description={t('need.form.monthsHint')}
                    value={line.months ?? ''}
                    placeholder={String(totals.monthsCovered ?? '')}
                    onChange={(value) => patch(line.key, { months: asNumber(value) })}
                    min={0}
                    allowDecimal={false}
                    w={180}
                  />
                  <NumberInput
                    label={t('need.form.proposed')}
                    description={t('need.form.proposedHint')}
                    value={line.proposed ?? ''}
                    placeholder={String(totals.total)}
                    onChange={(value) => patch(line.key, { proposed: asNumber(value) })}
                    min={0}
                    allowDecimal={false}
                    w={180}
                  />
                </Group>
              </Stack>
            </Card>
          )
        })}

        <Button
          variant="light"
          onClick={() => onChange([...lines, newNeedLine(`line-${Date.now()}-${added.current++}`)])}
          style={{ alignSelf: 'flex-start' }}
        >
          {t('need.form.add')}
        </Button>
      </Stack>
    </Card>
  )
}

function asNumber(value: string | number): number | null {
  if (value === '' || value === null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
