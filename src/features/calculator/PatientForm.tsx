import {
  Card,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  SimpleGrid,
} from '@mantine/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { decimalInput } from '../../lib/decimal-input'
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
      <Stack gap="xs">
        <Title order={2} size="h4">
          {t('calculator.patient.title')}
        </Title>
        <Text size="xs" c="dimmed">
          {t('calculator.patient.note')}
        </Text>

        <SimpleGrid
          cols={{ base: 2, xs: 3, lg: 2 }}
          spacing="xs"
          verticalSpacing="xs"
          style={{ alignItems: 'end' }}
        >
          <TextInput
            style={{ gridColumn: 'span 2' }}
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
                <Text size="xs" fw={500} mb={4}>
                  {t('calculator.patient.sex')}
                </Text>
                {/* Nothing is chosen until the physician chooses: a sex assumed by the form
                    would quietly change the creatinine clearance. */}
                <SegmentedControl
                  {...field}
                  value={field.value ?? ''}
                  fullWidth
                  data={[
                    { value: 'male', label: t('calculator.patient.male') },
                    { value: 'female', label: t('calculator.patient.female') },
                  ]}
                />
                {field.value === null && (
                  <Text size="xs" c="orange.8" mt={2}>
                    {t('calculator.patient.sexMissing')}
                  </Text>
                )}
              </div>
            )}
          />

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
                {...decimalInput()}
                decimalScale={1}
                error={invalid('weightKg')}
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
                {...decimalInput()}
                decimalScale={1}
                error={invalid('bilirubinUmolL')}
              />
            )}
          />
          <Controller
            control={control}
            name="serumCreatinine"
            render={({ field }) => (
              <NumberInput
                {...field}
                value={field.value ?? ''}
                label={t('calculator.patient.serumCreatinine')}
                description={t('calculator.patient.optional')}
                {...decimalInput()}
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
        </SimpleGrid>
      </Stack>
    </Card>
  )
}
