/** Header of the printed sheets; prefilled from the hospitals table and editable on the form. */
export interface HeaderValue {
  hospitalId: string | null
  institution: string
  department: string
  /** Printed under the institution, as the stamp on the blanks has it. */
  address: string
  /** Код за ЄДРПОУ from the same stamp. */
  registryCode: string
  head: string
  doctor: string
}

export function emptyHeader(): HeaderValue {
  return {
    hospitalId: null,
    institution: '',
    department: '',
    address: '',
    registryCode: '',
    head: '',
    doctor: '',
  }
}
