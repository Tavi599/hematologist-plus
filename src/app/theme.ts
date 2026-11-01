import {
  Card,
  Checkbox,
  createTheme,
  NumberInput,
  SegmentedControl,
  Select,
  Table,
  Textarea,
  TextInput,
  type MantineColorsTuple,
} from '@mantine/core'

import type { Palette } from '../lib/appearance'

/**
 * Accent scales of the colour palettes (src/app/palettes.css). Shade 8 is the one filled
 * controls use, and carries white text at more than 4.5:1.
 */
const hpBlue: MantineColorsTuple = [
  '#e8f1fb',
  '#d0e1f4',
  '#a4c4e9',
  '#76a6dd',
  '#4f8cd2',
  '#3a7cc9',
  '#1f5fa8',
  '#1b5a9c',
  '#164b85',
  '#123f70',
]

const hpSage: MantineColorsTuple = [
  '#e9f3ef',
  '#d3e6de',
  '#a8cfbf',
  '#7ab59e',
  '#559f84',
  '#3f9074',
  '#2b6a5c',
  '#285f53',
  '#245a4e',
  '#1b453b',
]

/**
 * The accent of each palette. Only what takes the default colour follows it: a control given
 * `color="red"` explicitly — a warning — stays red in every palette.
 */
export const PALETTE_PRIMARY: Record<Palette, string> = {
  neutral: 'red',
  blue: 'hpBlue',
  sage: 'hpSage',
  red: 'red',
}

/**
 * A compact scale: a physician works with many fields on one screen, so the controls, tables and
 * cards are a step smaller than Mantine's defaults. Only sizes and spacing change here — every
 * component keeps its behaviour, and a size set on a single component still wins.
 */
export const theme = createTheme({
  primaryColor: 'red',
  colors: { hpBlue, hpSage },
  primaryShade: 8,
  defaultRadius: 'md',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  spacing: { xs: '6px', sm: '10px', md: '14px', lg: '20px', xl: '28px' },
  headings: {
    sizes: {
      h1: { fontSize: '1.5rem', lineHeight: '1.25' },
      h2: { fontSize: '1.25rem', lineHeight: '1.3' },
      h3: { fontSize: '1.1rem', lineHeight: '1.3' },
      h4: { fontSize: '1rem', lineHeight: '1.3' },
    },
  },
  components: {
    TextInput: TextInput.extend({ defaultProps: { size: 'xs' } }),
    NumberInput: NumberInput.extend({ defaultProps: { size: 'xs' } }),
    Select: Select.extend({ defaultProps: { size: 'xs' } }),
    Textarea: Textarea.extend({ defaultProps: { size: 'xs' } }),
    SegmentedControl: SegmentedControl.extend({ defaultProps: { size: 'xs' } }),
    Checkbox: Checkbox.extend({ defaultProps: { size: 'xs' } }),
    Card: Card.extend({ defaultProps: { padding: 'sm' } }),
    Table: Table.extend({ defaultProps: { verticalSpacing: 4, horizontalSpacing: 'xs' } }),
  },
})
