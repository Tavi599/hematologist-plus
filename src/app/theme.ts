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
} from '@mantine/core'

/**
 * A compact scale: a physician works with many fields on one screen, so the controls, tables and
 * cards are a step smaller than Mantine's defaults. Only sizes and spacing change here — every
 * component keeps its behaviour, and a size set on a single component still wins.
 */
export const theme = createTheme({
  primaryColor: 'red',
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
