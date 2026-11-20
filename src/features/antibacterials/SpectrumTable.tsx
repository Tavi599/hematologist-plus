import { Anchor, Group, Popover, Stack, Table, Text, UnstyledButton } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { MSD_BASE } from './classes'
import {
  COVERAGES,
  PATHOGENS,
  SPECTRUM,
  type Coverage,
  type SpectrumCell,
  type SpectrumRow,
} from './spectrum'

const MARK: Record<Coverage, string> = { yes: '+', partial: '±', no: '−', unstated: '?' }

const COLOR: Record<Coverage, string> = {
  yes: 'var(--mantine-color-green-light)',
  partial: 'var(--mantine-color-yellow-light)',
  no: 'var(--mantine-color-red-light)',
  unstated: 'transparent',
}

const sticky = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  background: 'var(--mantine-color-body)',
} as const

function Cell({ row, cell, header }: { row: SpectrumRow; cell: SpectrumCell; header: string }) {
  const { t } = useTranslation()
  const word = t(`antibacterials.spectrum.value.${cell.value}`)
  return (
    <Popover width={260} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <UnstyledButton
          aria-label={`${row.label}, ${header}: ${word}`}
          w="100%"
          py={4}
          style={{ background: COLOR[cell.value], borderRadius: 4, textAlign: 'center' }}
        >
          <Text size="sm" fw={700} c={cell.value === 'unstated' ? 'dimmed' : undefined}>
            {MARK[cell.value]}
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={4}>
          <Text size="xs" fw={700}>
            {row.label} · {header}: {word}
          </Text>
          <Text size="sm">{cell.note}</Text>
          <Anchor href={`${MSD_BASE}/${cell.page}`} target="_blank" rel="noreferrer" size="xs">
            MSD: {cell.page}
          </Anchor>
          <Text size="xs" c="dimmed">
            {t('antibacterials.checkedOn')} {cell.checkedOn}
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

/**
 * Which class reaches which hard pathogen, as one compact grid: a mark per cell, and a tap on
 * the mark opens what the source says and where. The grid scrolls sideways on a phone while the
 * class name stays pinned on the left.
 */
export function SpectrumTable() {
  const { t } = useTranslation()
  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {t('antibacterials.spectrum.hint')}
      </Text>
      <Group gap="sm">
        {COVERAGES.map((value) => (
          <Group gap={4} key={value} wrap="nowrap">
            <Text
              size="sm"
              fw={700}
              px={6}
              style={{ background: COLOR[value], borderRadius: 4 }}
              c={value === 'unstated' ? 'dimmed' : undefined}
            >
              {MARK[value]}
            </Text>
            <Text size="xs">{t(`antibacterials.spectrum.value.${value}`)}</Text>
          </Group>
        ))}
      </Group>
      <Table.ScrollContainer minWidth={640}>
        <Table withTableBorder withColumnBorders verticalSpacing={4} horizontalSpacing={4}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={sticky} w={170}>
                <Text size="xs" fw={700}>
                  {t('antibacterials.spectrum.rowHeader')}
                </Text>
              </Table.Th>
              {PATHOGENS.map((pathogen) => (
                <Table.Th key={pathogen} ta="center">
                  <Text size="xs" fw={700}>
                    {t(`antibacterials.spectrum.pathogen.${pathogen}`)}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {SPECTRUM.map((row) => (
              <Table.Tr key={row.label}>
                <Table.Td style={sticky}>
                  <Text size="xs" fw={600}>
                    {row.label}
                  </Text>
                </Table.Td>
                {PATHOGENS.map((pathogen) => (
                  <Table.Td key={pathogen}>
                    <Cell
                      row={row}
                      cell={row.cells[pathogen]}
                      header={t(`antibacterials.spectrum.pathogen.${pathogen}`)}
                    />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Text size="xs" c="dimmed">
        {t('antibacterials.spectrum.legend')}
      </Text>
    </Stack>
  )
}
