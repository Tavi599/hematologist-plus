import { useTranslation } from 'react-i18next'

import { PATIENT_LIMITS, type PatientFormValues } from '../../schemas/patient'

/** What is wrong with a field of the patient form: outside its limits, or not a value at all. */
export function useFieldProblem() {
  const { t } = useTranslation()
  return (field: keyof PatientFormValues) => {
    const limits = (PATIENT_LIMITS as Record<string, readonly [number, number]>)[field]
    return limits
      ? t('calculator.patient.outOfRange', { min: limits[0], max: limits[1] })
      : t('calculator.patient.invalid')
  }
}
