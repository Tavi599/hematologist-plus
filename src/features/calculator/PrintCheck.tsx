import { Alert, List, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { currentLanguage } from '../../lib/i18n'
import type { Translate } from './course-sheets'
import { deviationLine, type Deviation } from './deviations'

/**
 * The last look before the sheet is printed. The alerts of the course live on the doses tab, and
 * a physician who comes straight to «Друк» would export the file without having seen them: what
 * changes a dose, and what the department never gives without premedication, is repeated here —
 * beside the button, where the decision is actually made.
 */
export function PrintCheck({
  deviations,
  premedication,
  irradiated,
}: {
  deviations: Deviation[]
  /** Drugs switched on without their premedication, as the doses tab names them. */
  premedication: string[]
  /** The course calls for irradiated blood components. */
  irradiated: boolean
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const dosed = deviations.filter((deviation) => deviation.changesDose)
  const others = deviations.length - dosed.length

  if (dosed.length === 0 && premedication.length === 0 && !irradiated && others === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('calculator.printCheck.clean')}
      </Text>
    )
  }

  return (
    <Alert color="yellow" title={t('calculator.printCheck.title')}>
      <Stack gap="xs">
        {premedication.length > 0 && (
          <div>
            <Text size="sm" fw={500}>
              {t('calculator.printCheck.premedication')}
            </Text>
            <List size="sm" withPadding>
              {premedication.map((drug) => (
                <List.Item key={drug}>{drug}</List.Item>
              ))}
            </List>
          </div>
        )}
        {dosed.length > 0 && (
          <div>
            <Text size="sm" fw={500}>
              {t('calculator.printCheck.doses')}
            </Text>
            <List size="sm" withPadding>
              {dosed.map((deviation, index) => (
                <List.Item key={`${deviation.kind}.${deviation.itemId ?? 'course'}.${index}`}>
                  {deviationLine(deviation, t as Translate, language)}
                </List.Item>
              ))}
            </List>
          </div>
        )}
        {irradiated && <Text size="sm">{t('calculator.printCheck.irradiated')}</Text>}
        {others > 0 && (
          <Text size="sm" c="dimmed">
            {t('calculator.printCheck.others', { n: others })}
          </Text>
        )}
      </Stack>
    </Alert>
  )
}
