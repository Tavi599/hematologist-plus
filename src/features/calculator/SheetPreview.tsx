import { SegmentedControl, Stack, Tabs, Text } from '@mantine/core'
import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import type { XlsxFormat, XlsxLine, XlsxSheet } from '../../lib/xlsx-writer'

import classes from './SheetPreview.module.css'
import { heightPx, previewGrid, widthPx, type PreviewCell } from './sheet-preview'

/** Zoom of the preview: the course sheet is a landscape blank, wider than any screen. */
const SCALES = ['0.5', '0.75', '1'] as const

/**
 * The workbook on screen before it is downloaded: one tab per sheet, as Excel will show them.
 * It is built from the same sheets the file is, so what the physician checks here is what prints.
 */
export function SheetPreview({ sheets }: { sheets: XlsxSheet[] }) {
  const { t } = useTranslation()
  // A phone opens the blank zoomed out, or the screen holds a couple of columns and the sheet
  // reads as an empty white field; on a desktop three quarters is close to the printed page.
  const [scale, setScale] = useState<string>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? '0.5' : '0.75',
  )
  // A course of one day has a single sheet, a long one has a tab per infusion day: the first is
  // open, and the physician steps through the rest.
  const [tab, setTab] = useState<string | null>(null)

  if (sheets.length === 0) return <Text c="dimmed">{t('calculator.preview.empty')}</Text>

  const names = sheets.map((_, index) => `${index}`)
  const current = tab !== null && names.includes(tab) ? tab : '0'

  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {t('calculator.preview.hint')}
      </Text>
      <SegmentedControl
        size="xs"
        value={scale}
        onChange={setScale}
        data={SCALES.map((value) => ({
          value,
          label: `${Math.round(Number(value) * 100)}%`,
        }))}
        aria-label={t('calculator.preview.scale')}
      />
      <Tabs value={current} onChange={setTab} keepMounted={false}>
        <Tabs.List>
          {sheets.map((sheet, index) => (
            <Tabs.Tab key={index} value={`${index}`}>
              {sheet.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {sheets.map((sheet, index) => (
          <Tabs.Panel key={index} value={`${index}`} pt="xs">
            <SheetTable sheet={sheet} scale={Number(scale)} />
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  )
}

function SheetTable({ sheet, scale }: { sheet: XlsxSheet; scale: number }) {
  const grid = previewGrid(sheet)
  const total = grid.widths.reduce((sum, width) => sum + widthPx(width, scale), 0)

  return (
    <div className={classes.paper}>
      <table className={classes.sheet} style={{ width: total }} aria-label={sheet.name}>
        <colgroup>
          {grid.widths.map((width, index) => (
            <col key={index} style={{ width: widthPx(width, scale) }} />
          ))}
        </colgroup>
        <tbody>
          {grid.rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={
                row.heightPt === undefined ? undefined : { height: heightPx(row.heightPt, scale) }
              }
            >
              {row.cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  rowSpan={cell.rowSpan === 1 ? undefined : cell.rowSpan}
                  colSpan={cell.colSpan === 1 ? undefined : cell.colSpan}
                  style={cellStyle(cell, scale)}
                >
                  {cell.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The default size of the workbook font, kept in step with the writer. */
const DEFAULT_FONT_SIZE = 11

function cellStyle(cell: PreviewCell, scale: number): CSSProperties {
  const format: XlsxFormat = cell.format ?? {}
  const font = format.font ?? {}
  const style: CSSProperties = {
    fontFamily: font.name ?? 'Arial',
    fontSize: Math.max(6, Math.round((font.size ?? DEFAULT_FONT_SIZE) * scale * 10) / 10),
    fontWeight: font.bold === true ? 700 : 400,
    fontStyle: font.italic === true ? 'italic' : 'normal',
    textDecoration: font.underline === true ? 'underline' : 'none',
    textAlign: format.align ?? 'left',
    verticalAlign: format.valign === 'center' ? 'middle' : (format.valign ?? 'bottom'),
    whiteSpace: format.wrap === true ? 'pre-wrap' : 'nowrap',
  }
  const box = format.box
  if (box) {
    // Only the rules the blank itself draws: a cell with no border set has none, as on paper.
    if (box.left) style.borderLeft = rule(box.left)
    if (box.right) style.borderRight = rule(box.right)
    if (box.top) style.borderTop = rule(box.top)
    if (box.bottom) style.borderBottom = rule(box.bottom)
  }
  return style
}

function rule(line: XlsxLine): string {
  return line === 'medium' ? '2px solid #000' : '1px solid #000'
}
