import { Card, Group, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import type { CatalogIndex } from '../../lib/catalog-index'

import type { HeaderValue } from './header'

/** Header of the printed sheets: defaults from the hospitals table, editable here. */
export function HospitalHeader({
  catalog,
  value,
  onChange,
}: {
  catalog: CatalogIndex
  value: HeaderValue
  onChange: (value: HeaderValue) => void
}) {
  const { t } = useTranslation()
  const patch = (next: Partial<HeaderValue>) => onChange({ ...value, ...next })

  // Prefill from the default hospital once, then leave the physician's edits alone.
  useEffect(() => {
    if (value.hospitalId !== null) return
    const hospital = catalog.defaultHospital
    if (!hospital) return
    onChange({
      hospitalId: hospital.id,
      institution: hospital.institution_name,
      department: hospital.department_name,
      address: hospital.address ?? '',
      registryCode: hospital.registry_code ?? '',
      head: hospital.head_of_department ?? '',
      doctor: hospital.doctors[0] ?? '',
    })
  }, [catalog, value.hospitalId, onChange])

  const select = (hospitalId: string | null) => {
    const hospital = hospitalId ? catalog.hospitals.find((row) => row.id === hospitalId) : undefined
    if (!hospital) return patch({ hospitalId })
    patch({
      hospitalId,
      institution: hospital.institution_name,
      department: hospital.department_name,
      address: hospital.address ?? '',
      registryCode: hospital.registry_code ?? '',
      head: hospital.head_of_department ?? '',
      doctor: hospital.doctors[0] ?? '',
    })
  }

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('calculator.hospital.title')}
        </Title>
        {catalog.hospitals.length === 0 ? (
          <Text size="xs" c="dimmed">
            {t('calculator.hospital.none')}
          </Text>
        ) : (
          <Select
            label={t('calculator.hospital.select')}
            data={catalog.hospitals.map((hospital) => ({
              value: hospital.id,
              label: `${hospital.institution_name} — ${hospital.department_name}`,
            }))}
            value={value.hospitalId}
            onChange={select}
          />
        )}
        <Group grow align="flex-start" wrap="wrap">
          <TextInput
            label={t('calculator.hospital.institution')}
            value={value.institution}
            onChange={(event) => patch({ institution: event.currentTarget.value })}
          />
          <TextInput
            label={t('calculator.hospital.department')}
            value={value.department}
            onChange={(event) => patch({ department: event.currentTarget.value })}
          />
        </Group>
        <Group grow align="flex-start" wrap="wrap">
          <TextInput
            label={t('calculator.hospital.address')}
            value={value.address}
            onChange={(event) => patch({ address: event.currentTarget.value })}
          />
          <TextInput
            label={t('calculator.hospital.registryCode')}
            value={value.registryCode}
            onChange={(event) => patch({ registryCode: event.currentTarget.value })}
          />
        </Group>
        <Group grow align="flex-start" wrap="wrap">
          <TextInput
            label={t('calculator.hospital.head')}
            value={value.head}
            onChange={(event) => patch({ head: event.currentTarget.value })}
          />
          <TextInput
            label={t('calculator.hospital.doctor')}
            value={value.doctor}
            onChange={(event) => patch({ doctor: event.currentTarget.value })}
          />
        </Group>
      </Stack>
    </Card>
  )
}
