import { Alert, List, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CourseItem } from '../../lib/course-input'
import {
  unadjustedSupport,
  type MissingRequirement,
  type PatientField,
} from '../../lib/course-requirements'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { PatientFormValues, PatientInput } from '../../schemas/patient'
import { useFieldProblem } from './field-problem'

function useNames(items: CourseItem[]) {
  const language = currentLanguage()
  return (itemIds: string[]) =>
    [
      ...new Set(
        itemIds.map((id) => {
          const found = items.find((entry) => entry.item.id === id)
          return found ? localize(found.drug.name, language) : id
        }),
      ),
    ].join(', ')
}

/**
 * What still has to be typed in before the course is calculated and its sheets can be printed,
 * and which drugs ask for it: only what a drug switched on actually needs.
 */
export function MissingDataAlert({
  items,
  missing,
  invalid,
}: {
  items: CourseItem[]
  missing: MissingRequirement[]
  /** The fields of the form holding a value it cannot accept: they are named first. */
  invalid: (keyof PatientFormValues)[]
}) {
  const { t } = useTranslation()
  const problem = useFieldProblem()
  const names = useNames(items)
  const fields = (list: PatientField[]) =>
    list.map((field) => t(`calculator.requirements.field.${field}`)).join(', ')

  return (
    <Alert color="orange" variant="light" title={t('calculator.requirements.title')}>
      {invalid.length > 0 ? (
        <List size="sm" spacing={4}>
          {invalid.map((field) => (
            <List.Item key={field}>
              <b>{t(`calculator.patient.${field}`)}</b>: {problem(field)}
            </List.Item>
          ))}
        </List>
      ) : (
        <List size="sm" spacing={4}>
          {missing.map((entry) => (
            <List.Item key={entry.reason}>
              {t(`calculator.requirements.reason.${entry.reason}`, {
                fields: fields(entry.fields),
                drugs: names(entry.itemIds),
              })}
            </List.Item>
          ))}
        </List>
      )}
    </Alert>
  )
}

/** Prophylaxis switched on whose kidney correction cannot be checked: printed at the usual dose. */
export function UnadjustedSupportAlert({
  items,
  patient,
  disabledIds,
}: {
  items: CourseItem[]
  patient: PatientInput | null
  disabledIds: readonly string[]
}) {
  const { t } = useTranslation()
  const names = useNames(items)
  const unadjusted = unadjustedSupport(items, { patient, disabledIds })
  if (unadjusted === null) return null
  return (
    <Alert color="yellow" variant="light">
      <Text size="sm">
        {t('calculator.requirements.supportUnadjusted', {
          fields: unadjusted.fields
            .map((field) => t(`calculator.requirements.field.${field}`))
            .join(', '),
          drugs: names(unadjusted.itemIds),
        })}
      </Text>
    </Alert>
  )
}
