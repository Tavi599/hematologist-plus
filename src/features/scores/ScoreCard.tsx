import {
  Anchor,
  Badge,
  Checkbox,
  Group,
  List,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatNumber } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'
import type { Field, Score, Text2, Values } from './types'

/** The form of one score and its result, recalculated on every change. */
export function ScoreCard({ score }: { score: Score }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const say = (text: Text2) => text[language]
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(
      score.fields.flatMap((field) =>
        field.kind === 'select' && field.initial !== undefined ? [[field.key, field.initial]] : [],
      ),
    ),
  )
  const set = (key: string, value: Values[string]) =>
    setValues((current) => ({ ...current, [key]: value }))

  let outcome: ReturnType<Score['compute']> = null
  let failed = false
  try {
    outcome = score.compute(values)
  } catch {
    failed = true
  }

  const checks = score.fields.filter((field) => field.kind === 'check')
  const inputs = score.fields.filter((field) => field.kind !== 'check')

  return (
    <Stack gap="sm">
      {inputs.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="xs">
          {inputs.map((field) => (
            <FieldInput key={field.key} field={field} value={values[field.key]} onChange={set} />
          ))}
        </SimpleGrid>
      )}
      {checks.length > 0 && (
        <Stack gap={6}>
          {checks.map((field) => (
            <Checkbox
              key={field.key}
              label={say(field.label)}
              description={field.hint ? say(field.hint) : undefined}
              checked={values[field.key] === true}
              onChange={(event) => set(field.key, event.currentTarget.checked)}
            />
          ))}
        </Stack>
      )}

      <Paper
        withBorder
        p="sm"
        radius="sm"
        bg="var(--mantine-color-default-hover)"
        aria-live="polite"
      >
        {failed ? (
          <Text size="sm" c="red">
            {t('scores.invalid')}
          </Text>
        ) : outcome === null ? (
          <Text size="sm" c="dimmed">
            {t('scores.fill')}
          </Text>
        ) : (
          <Stack gap={6}>
            <Group gap="sm" align="baseline">
              {outcome.value && (
                <Text fw={700} size="xl">
                  {outcome.value.label ? `${say(outcome.value.label)}: ` : ''}
                  {formatNumber(outcome.value.amount, language, outcome.value.decimals)}
                  {outcome.value.unit ? ` ${say(outcome.value.unit)}` : ''}
                </Text>
              )}
              {outcome.group && (
                <Badge size="lg" color={outcome.group.tone} variant="filled" tt="none">
                  {say(outcome.group.label)}
                </Badge>
              )}
            </Group>
            {outcome.notes.map((note, index) => (
              <Text key={index} size="sm">
                {say(note)}
              </Text>
            ))}
          </Stack>
        )}
      </Paper>

      {score.caveat && (
        <Text size="xs" c="orange.8">
          {say(score.caveat)}
        </Text>
      )}
      {score.sources.length > 0 && (
        <Stack gap={2}>
          <Text size="xs" fw={600} c="dimmed">
            {t('scores.sources')}
          </Text>
          <List size="xs" spacing={2}>
            {score.sources.map((source) => (
              <List.Item key={source.url}>
                <Anchor href={source.url} target="_blank" rel="noreferrer" size="xs">
                  {source.name}
                </Anchor>
                <Text span size="xs" c="dimmed">
                  {' '}
                  — {say(source.checked)}
                </Text>
              </List.Item>
            ))}
          </List>
        </Stack>
      )}
    </Stack>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Exclude<Field, { kind: 'check' }>
  value: Values[string]
  onChange: (key: string, value: Values[string]) => void
}) {
  const language = currentLanguage()
  const say = (text: Text2) => text[language]
  if (field.kind === 'select') {
    return (
      <Select
        label={say(field.label)}
        description={field.hint ? say(field.hint) : undefined}
        data={field.options.map((option) => ({ value: option.value, label: say(option.label) }))}
        value={typeof value === 'string' ? value : null}
        onChange={(next) => onChange(field.key, next ?? undefined)}
        allowDeselect={false}
        // A long list is found by typing a few letters of the disease.
        searchable={field.options.length > 5}
        comboboxProps={{ withinPortal: true }}
        styles={{ option: { whiteSpace: 'normal' } }}
      />
    )
  }
  return (
    <NumberInput
      label={field.unit ? `${say(field.label)}, ${say(field.unit)}` : say(field.label)}
      description={field.hint ? say(field.hint) : undefined}
      value={typeof value === 'number' ? value : ''}
      onChange={(next) => onChange(field.key, typeof next === 'number' ? next : undefined)}
      min={field.min}
      max={field.max}
      step={field.step ?? 1}
      decimalScale={field.step !== undefined && field.step < 1 ? 2 : undefined}
      hideControls
    />
  )
}
