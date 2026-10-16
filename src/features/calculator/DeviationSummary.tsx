import { Badge, Button, Card, Collapse, Group, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { currentLanguage } from '../../lib/i18n'
import type { Translate } from './course-sheets'
import { deviationLine, type Deviation } from './deviations'

/**
 * What the physician has set against the protocol, in one place: a dose typed by hand, a drug
 * switched off, a row moved to another sheet. Each line is taken back by its own button, and the
 * whole course by one — the patient, the dates and the hand-written lines are never touched.
 */
export function DeviationSummary({
  deviations,
  onRevert,
  onRevertAll,
}: {
  deviations: Deviation[]
  onRevert: (deviation: Deviation) => void
  onRevertAll: () => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [open, setOpen] = useState(false)

  if (deviations.length === 0) return null

  const dosed = deviations.filter((deviation) => deviation.changesDose).length

  return (
    <Card withBorder component="section" bg="var(--mantine-color-default-hover)">
      <Stack gap="xs">
        <Group gap="xs" wrap="wrap">
          <Text fw={500}>{t('calculator.deviations.title', { n: deviations.length })}</Text>
          {dosed > 0 && (
            <Badge size="sm" variant="light" color="orange">
              {t('calculator.deviations.dosed', { n: dosed })}
            </Badge>
          )}
          <Button
            size="compact-sm"
            variant="subtle"
            onClick={() => setOpen((shown) => !shown)}
            aria-expanded={open}
          >
            {t(open ? 'calculator.deviations.hide' : 'calculator.deviations.show')}
          </Button>
          <Button size="compact-sm" variant="default" onClick={onRevertAll}>
            {t('calculator.deviations.revertAll')}
          </Button>
        </Group>
        <Collapse expanded={open}>
          <Stack gap={6}>
            {deviations.map((deviation, index) => (
              <Group
                key={`${deviation.kind}.${deviation.itemId ?? 'course'}.${index}`}
                gap="xs"
                wrap="nowrap"
                align="flex-start"
              >
                <Text
                  size="sm"
                  c={deviation.changesDose ? undefined : 'dimmed'}
                  style={{ flex: 1 }}
                >
                  {deviationLine(deviation, t as Translate, language)}
                </Text>
                <Button size="compact-xs" variant="subtle" onClick={() => onRevert(deviation)}>
                  {t('calculator.deviations.revert')}
                </Button>
              </Group>
            ))}
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  )
}
