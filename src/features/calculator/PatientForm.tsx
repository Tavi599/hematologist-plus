import {
  Card,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  ageFromBirthDate,
  CREATININE_UNITS,
  emptyPatientForm,
  patientFormSchema,
  type PatientFormValues,
  type PatientInput,
} from '../../schemas/patient'

/**
 * Patient data lives only in this component's state and its parent — never sent anywhere.
 * Every change is validated; the parent gets the parsed values or null while they are incomplete.
 */
export function PatientForm({ onChange }: { onChange: (patient: PatientInput | null) => void }) {
  const { t } = useTranslation()
  const form = useForm<PatientFormValues, unknown, PatientInput>({
    defaultValues: emptyPatientForm(),
    mode: 'onChange',
    resolver: zodResolver(patientFormSchema),
  })
  const { control, formState, getValues, register, setValue, watch } = form

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    const report = (values: PatientFormValues) => {
      const parsed = patientFormSchema.safeParse(values)
      onChangeRef.current(parsed.success ? parsed.data : null)
    }
    // An untouched form is already a valid one: every measurement is optional, so the parent
    // hears about it straight away and can calculate from a BSA entered on the course card.
    report(getValues())
    // The subscription is how react-hook-form reports every change; this component is
    // intentionally not memoized by the React Compiler.
    // oxlint-disable-next-line react/incompatible-library
    const subscription = watch((values, { name }) => {
      if (name === 'birthDate' && typeof values.birthDate === 'string') {
        const age = ageFromBirthDate(values.birthDate)
        if (age !== null) setValue('ageYears', age, { shouldValidate: true })
      }
      report(values as PatientFormValues)
    })
    return () => subscription.unsubscribe()
  }, [getValues, watch, setValue])

  const invalid = (field: keyof PatientFormValues) =>
    formState.errors[field] ? t('calculator.patient.invalid') : null

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('calculator.patient.title')}
        </Title>
        <Text size="xs" c="dimmed">
          {t('calculator.patient.note')}
        </Text>

        <Group grow align="flex-start" wrap="wrap">
          <TextInput
            label={t('calculator.patient.fullName')}
            description={t('calculator.patient.optional')}
            autoComplete="off"
            {...register('fullName')}
          />
          <TextInput
            label={t('calculator.patient.recordNumber')}
            description={t('calculator.patient.optional')}
            autoComplete="off"
            {...register('recordNumber')}
          />
        </Group>

        <Group grow align="flex-start" wrap="wrap">
          <TextInput
            type="date"
            label={t('calculator.patient.birthDate')}
            error={invalid('birthDate')}
            {...register('birthDate')}
          />
          <Controller
            control={control}
            name="ageYears"
            render={({ field }) => (
              <NumberInput
                {...field}
                label={t('calculator.patient.ageYears')}
                min={0}
                max={130}
                error={invalid('ageYears')}
              />
            )}
          />
          <Controller
            control={control}
            name="sex"
            render={({ field }) => (
              <div>
                <Text size="sm" fw={500} mb={4}>
                  {t('calculator.patient.sex')}
                </Text>
                <SegmentedControl
                  {...field}
                  fullWidth
                  data={[
                    { value: 'male', label: t('calculator.patient.male') },
                    { value: 'female', label: t('calculator.patient.female') },
                  ]}
                />
              </div>
            )}
          />
        </Group>

        <Group grow align="flex-start" wrap="wrap">
          <Controller
            control={control}
            name="heightCm"
            render={({ field }) => (
              <NumberInput
                {...field}
                label={t('calculator.patient.heightCm')}
                description={t('calculator.patient.orEnterBsa')}
                min={50}
                max={300}
                error={invalid('heightCm')}
              />
            )}
          />
          <Controller
            control={control}
            name="weightKg"
            render={({ field }) => (
              <NumberInput
                {...field}
                label={t('calculator.patient.weightKg')}
                description={t('calculator.patient.orEnterBsa')}
                min={1}
                max={500}
                decimalScale={1}
                error={invalid('weightKg')}
              />
            )}
          />
        </Group>

        <Group grow align="flex-start" wrap="wrap">
          <Controller
            control={control}
            name="serumCreatinine"
            render={({ field }) => (
              <NumberInput
                {...field}
                value={field.value ?? ''}
                label={t('calculator.patient.serumCreatinine')}
                description={t('calculator.patient.optional')}
                decimalScale={2}
                error={invalid('serumCreatinine')}
              />
            )}
          />
          <Controller
            control={control}
            name="creatinineUnit"
            render={({ field }) => (
              <Select
                {...field}
                allowDeselect={false}
                label={t('calculator.patient.creatinineUnit')}
                data={CREATININE_UNITS.map((unit) => ({ value: unit, label: t(`units.${unit}`) }))}
              />
            )}
          />
          <Controller
            control={control}
            name="bilirubinUmolL"
            render={({ field }) => (
              <NumberInput
                {...field}
                value={field.value ?? ''}
                label={t('calculator.patient.bilirubinUmolL')}
                description={t('calculator.patient.optional')}
                decimalScale={1}
                error={invalid('bilirubinUmolL')}
              />
            )}
          />
        </Group>
      </Stack>
    </Card>
  )
}
