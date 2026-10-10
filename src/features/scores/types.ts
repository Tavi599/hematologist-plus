/** Text in both languages of the site. */
export interface Text2 {
  uk: string
  en: string
}

export type Tone = 'green' | 'yellow' | 'orange' | 'red' | 'gray'

export type Field =
  | {
      kind: 'number'
      key: string
      label: Text2
      unit?: Text2
      min?: number
      max?: number
      step?: number
      hint?: Text2
    }
  | { kind: 'check'; key: string; label: Text2; hint?: Text2 }
  | {
      kind: 'select'
      key: string
      label: Text2
      options: { value: string; label: Text2 }[]
      /** Chosen when the form opens; left out, nothing is chosen until the physician picks. */
      initial?: string
      hint?: Text2
    }

/** What the physician has entered: a number, a tick, or the value of an option. */
export type Values = Record<string, number | boolean | string | undefined>

export interface Outcome {
  /** The number the formula gives, with how many decimals it is shown to. */
  value?: { amount: number; decimals: number; unit?: Text2; label?: Text2 }
  group?: { label: Text2; tone: Tone }
  /** What the result means and how it was reached, line by line. */
  notes: Text2[]
}

export interface Source {
  name: string
  url: string
  /** What was checked in it: the abstract, a table, a figure. */
  checked: Text2
}

export interface Score {
  id: string
  section: 'general' | 'risk'
  title: Text2
  /** One line under the title: what it is for. */
  purpose: Text2
  fields: Field[]
  /** Null while something the formula needs is still missing. */
  compute: (values: Values) => Outcome | null
  sources: Source[]
  /** A caveat that always applies: who the score is not for, a discrepancy between sources. */
  caveat?: Text2
}
