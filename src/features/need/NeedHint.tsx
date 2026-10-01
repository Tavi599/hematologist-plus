import { Badge, Button, Card, Group, NumberInput, Select, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { PresentationCount } from '../../domain'
import type { CatalogIndex } from '../../lib/catalog-index'
import { formatNumber } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { NeedLine } from './need-lines'
import { decimalInput } from '../../lib/decimal-input'
import { estimateCoursePacks, packsOf, regimensWithDrug, suggestedRegimen } from './need-estimate'

/**
 * The hint the form is filled in from: for every drug of the form, a regimen that gives it and
 * how many packs one course of it takes. It is a convenience, not part of the form — nothing
 * here is written to the file that goes to the department of health.
 *
 * The regimens need not have anything to do with each other: the form is filled in drug by drug,
 * and a supportive drug is counted by whatever course it accompanies.
 */
export function NeedHint({
  catalog,
  lines,
  bsaM2,
  onBsaChange,
  onChange,
}: {
  catalog: CatalogIndex
  lines: NeedLine[]
  bsaM2: number | null
  onBsaChange: (bsaM2: number | null) => void
  onChange: (lines: NeedLine[]) => void
}) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const language = currentLanguage()
  const drugLines = lines.flatMap((line) =>
    line.drugId === null ? [] : [{ line, drugId: line.drugId }],
  )

  const patch = (key: string, next: Partial<NeedLine>) => {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...next } : line)))
  }

  const packLabel = (entry: PresentationCount): string => {
    const row = catalog.rows.drug_presentations.find(
      (presentation) => presentation.id === entry.presentation.id,
    )
    const strength = formatNumber(
      row?.strength_amount ?? entry.presentation.strengthAmount,
      language,
      2,
    )
    return `${entry.count} × ${strength} ${tu(`units.${row?.strength_unit ?? 'mg'}`)}`
  }

  return (
    <Card withBorder component="section">
      <Stack gap="md">
        <Group gap="sm" align="center">
          <Title order={2} size="h4">
            {t('need.hint.title')}
          </Title>
          <Badge color="gray" variant="light">
            {t('need.hint.notPrinted')}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {t('need.hint.lead')}
        </Text>

        <NumberInput
          label={t('need.hint.bsa')}
          description={t('need.hint.bsaHint')}
          value={bsaM2 ?? ''}
          onChange={(value) =>
            onBsaChange(value === '' ? null : typeof value === 'number' ? value : Number(value))
          }
          min={0.5}
          max={3}
          step={0.01}
          {...decimalInput()}
          decimalScale={2}
          w={200}
        />

        {drugLines.length === 0 ? (
          <Text c="dimmed">{t('need.hint.empty')}</Text>
        ) : (
          drugLines.map(({ line, drugId }) => {
            const drug = catalog.drugs.get(drugId)
            const regimens = regimensWithDrug(catalog, drugId).map((regimen) => ({
              value: regimen.id,
              label: `${regimen.short_name} — ${localize(regimen.name, language)}`,
            }))
            // Without a BSA nothing can be counted yet, so the first regimen of the drug
            // stands in the select until one is typed; no body surface is assumed for it.
            const suggested =
              line.regimenId ??
              (bsaM2 === null
                ? (regimens[0]?.value ?? null)
                : (suggestedRegimen(catalog, drugId, bsaM2)?.id ?? null))
            const regimen = suggested ? catalog.regimens.get(suggested) : undefined
            const estimate =
              bsaM2 !== null && suggested !== null
                ? estimateCoursePacks(catalog, drugId, suggested, bsaM2)
                : null
            const packs =
              estimate?.ok === true && line.presentationId !== null
                ? packsOf(estimate.packs, line.presentationId)
                : null

            return (
              <Card key={line.key} withBorder padding="sm">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    {drug ? localize(drug.name, language) : drugId}
                  </Text>
                  {regimens.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {t('need.hint.noRegimen')}
                    </Text>
                  ) : (
                    <Group align="flex-end" wrap="wrap" gap="sm">
                      <Select
                        label={t('need.hint.regimen')}
                        data={regimens}
                        value={suggested}
                        onChange={(value) => patch(line.key, { regimenId: value })}
                        searchable
                        w={300}
                      />
                      {bsaM2 === null ? (
                        <Text size="sm" c="dimmed">
                          {t('need.hint.needBsa')}
                        </Text>
                      ) : estimate?.ok === false ? (
                        <Text size="sm" c="dimmed">
                          {t('need.hint.missing', { field: estimate.missingField })}
                        </Text>
                      ) : (
                        <Text size="sm">
                          {t('need.hint.perCourse')}:{' '}
                          <strong>
                            {(estimate?.packs ?? []).map(packLabel).join(' + ') || '—'}
                          </strong>
                        </Text>
                      )}
                      <Button
                        variant="light"
                        disabled={packs === null || packs === 0}
                        onClick={() =>
                          patch(line.key, {
                            packsPerCourse: packs,
                            courses: line.courses ?? regimen?.default_cycles ?? null,
                            regimenId: suggested,
                          })
                        }
                      >
                        {t('need.hint.take', { packs: packs ?? 0 })}
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Card>
            )
          })
        )}
      </Stack>
    </Card>
  )
}
