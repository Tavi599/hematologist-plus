import { z } from 'zod'

/** Stable text identifier used as primary key in every catalog table. */
export const ID_PATTERN = /^[a-z0-9][a-z0-9_.-]*$/
export const idSchema = z.string().regex(ID_PATTERN, 'lowercase letters, digits, "_", "." or "-"')

/** Local key inside a data file; combined with the parent id into a full id. */
export const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/
export const keySchema = z.string().regex(KEY_PATTERN, 'lowercase letters, digits, "_" or "-"')

export const nonEmptyTextSchema = z.string().trim().min(1)
export const positiveNumberSchema = z.number().positive()
export const nonNegativeIntSchema = z.number().int().nonnegative()
export const sortOrderSchema = z.number().int()

/**
 * Localized text as stored in jsonb: {"uk": "...", "en": "..."}.
 * Either language may be missing, but at least one must contain text.
 * Keep keys in sync with SUPPORTED_LANGUAGES (checked by a type test).
 */
export const localizedTextSchema = z
  .strictObject({
    uk: z.string().nullable().optional(),
    en: z.string().nullable().optional(),
  })
  .refine(
    (value) => Object.values(value).some((text) => typeof text === 'string' && text.trim() !== ''),
    { message: 'at least one language must contain text' },
  )

export const SOLVENTS = ['sodium_chloride_0_9', 'glucose_5', 'water_for_injection'] as const
export const solventSchema = z.enum(SOLVENTS)
export type Solvent = (typeof SOLVENTS)[number]

export const PRESENTATION_FORMS = [
  'vial',
  'ampoule',
  'tablet',
  'capsule',
  'syringe',
  'other',
] as const
export const presentationFormSchema = z.enum(PRESENTATION_FORMS)

export const ROUTES = [
  'iv_infusion',
  'iv_bolus',
  'subcutaneous',
  'intramuscular',
  'oral',
  'intrathecal',
  /** Drops, ointments, gels — applied where they act, and counted by the pack, not by BSA. */
  'topical',
] as const
export const routeSchema = z.enum(ROUTES)

export const ITEM_ROLES = ['main', 'premedication', 'supportive'] as const
export const itemRoleSchema = z.enum(ITEM_ROLES)

/**
 * The unit a drug is measured in. Milligrams for most, but bleomycin and interferon are dosed
 * in international units and filgrastim in micrograms. Mass (mg, mcg) and biological activity
 * (iu, miu) are never converted into each other: the factor is drug-specific, not arithmetic.
 */
export const AMOUNT_UNITS = ['mg', 'mcg', 'iu', 'miu'] as const
export const amountUnitSchema = z.enum(AMOUNT_UNITS)

/**
 * How a regimen expresses a dose: the amount unit plus the basis (per m², per kg, flat).
 * `auc` is the Calvert formula, which is defined in milligrams only.
 */
export const DOSE_UNITS = [
  'mg_m2',
  'mg_kg',
  'mg_flat',
  'mcg_m2',
  'mcg_kg',
  'mcg_flat',
  'iu_m2',
  'iu_kg',
  'iu_flat',
  'miu_m2',
  'miu_kg',
  'miu_flat',
  'auc',
] as const
export const doseUnitSchema = z.enum(DOSE_UNITS)

/**
 * What one drug's label says its mass is worth in biological activity, for the few drugs sold
 * and prescribed both ways — filgrastim is written as 300 mcg or as 30 million IU for the same
 * syringe. This is the only bridge between mass and activity, and it is a fact read off the
 * pack, never a calculation: without it the two families stay strictly apart.
 */
export const unitEquivalenceSchema = z
  .strictObject({
    amount: positiveNumberSchema,
    amount_unit: z.enum(['mg', 'mcg']),
    activity: positiveNumberSchema,
    activity_unit: z.enum(['iu', 'miu']),
  })
  .describe('e.g. 300 mcg = 30 miu for filgrastim')

export type UnitEquivalence = z.infer<typeof unitEquivalenceSchema>

/**
 * How the drug can actually be obtained. A regimen is never left out of the catalog because one
 * of its drugs is missing — the drug is marked instead, and regimens can be filtered by this.
 *   department  — in the department's own procurement list
 *   registered  — registered in Ukraine, obtainable, but not on the department's list
 *   unavailable — not registered in Ukraine or otherwise not obtainable
 */
export const DRUG_AVAILABILITY = ['department', 'registered', 'unavailable'] as const
export const drugAvailabilitySchema = z.enum(DRUG_AVAILABILITY)

/**
 * The clinical group a disease is listed under. Not a classification — the department's own way
 * of finding a disease in the list, agreed with the physician: the ICD-10 chapter put the
 * lymphomas, the leukaemias and the myeloma under one letter and helped nobody. A disease with
 * no group is shown under "Other", so the list never hides one. The order here is the order the
 * list shows the groups in.
 *
 * Where a disease belongs follows the WHO classification, by the physician's decision of
 * 2026-10-17: `chronic-leukemia` holds the chronic *lymphoid* leukaemias (CLL, hairy cell), while
 * chronic myeloid leukaemia is a myeloproliferative neoplasm and sits with them; Waldenström
 * macroglobulinemia is lymphoplasmacytic lymphoma and sits with the lymphomas, not with the
 * plasma cell disorders. The key is kept as it is so that an installed copy keeps reading the
 * group it already knows; what it is called is in the locale files.
 */
export const CLINICAL_GROUPS = [
  'lymphoma',
  'acute-leukemia',
  'chronic-leukemia',
  'plasma-cell',
  'mds',
  'myeloproliferative',
] as const
export const clinicalGroupSchema = z.enum(CLINICAL_GROUPS)
export type ClinicalGroup = (typeof CLINICAL_GROUPS)[number]

export const TREATMENT_NODE_KINDS = [
  'treatment',
  'line',
  'stage',
  'group',
  'trial',
  'reference',
  'situation',
  'pathway',
] as const
export const treatmentNodeKindSchema = z.enum(TREATMENT_NODE_KINDS)

/** How a guideline ranks an option: preferred, other recommended, useful in certain circumstances. */
export const RECOMMENDATION_PREFERENCES = ['preferred', 'other', 'circumstances'] as const
export const recommendationPreferenceSchema = z.enum(RECOMMENDATION_PREFERENCES)
export type RecommendationPreference = (typeof RECOMMENDATION_PREFERENCES)[number]

/** NCCN categories of evidence and consensus; a recommendation without one is 2A. */
export const EVIDENCE_CATEGORIES = ['1', '2a', '2b', '3'] as const
export const evidenceCategorySchema = z.enum(EVIDENCE_CATEGORIES)
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number]

/** A pathway step that is not a regimen. Only decides an icon and a label. */
export const PATHWAY_STEP_KINDS = [
  'hct',
  'trial',
  'surveillance',
  'maintenance',
  'assessment',
  'supportive',
  'page',
  'other',
] as const
export type PathwayStepKind = (typeof PATHWAY_STEP_KINDS)[number]

/** 'treatment' stands beside the row's regimens; 'next' is the arrow out of the row. */
export const PATHWAY_COLUMNS = ['treatment', 'next'] as const
export type PathwayColumn = (typeof PATHWAY_COLUMNS)[number]
export const pathwayStepKindSchema = z.enum(PATHWAY_STEP_KINDS)
export const pathwayColumnSchema = z.enum(PATHWAY_COLUMNS)

/**
 * A pathway step as stored in `treatment_nodes.steps`. Everything here is a label or a link, so a
 * value added later falls back instead of failing the catalog load (see catalog.ts).
 */
export const pathwayStepRowSchema = z.object({
  kind: pathwayStepKindSchema.catch('other'),
  column: pathwayColumnSchema.catch('next'),
  label: localizedTextSchema,
  /** The treatment node the step leads to: another page or row of the same pathway. */
  target_id: idSchema.nullable().default(null),
  preference: recommendationPreferenceSchema.nullable().default(null).catch(null),
  category: evidenceCategorySchema.nullable().default(null).catch(null),
  notes: localizedTextSchema.nullable().default(null),
})
export type PathwayStep = z.infer<typeof pathwayStepRowSchema>

/**
 * Where a clinical value comes from. Every dose, cap and dilution parameter that is not
 * the hospital’s own must name its protocol and the date it was checked.
 */
export const sourceSchema = z.strictObject({
  name: nonEmptyTextSchema,
  url: z.url().optional(),
  /** Document version or revision date as printed in the source. */
  version: z.string().optional(),
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
})

export const sourcesSchema = z.array(sourceSchema)

export type Source = z.infer<typeof sourceSchema>

/**
 * Routes by which the label lets this drug be given at the same dose — azacitidine
 * subcutaneously or intravenously, bortezomib subcutaneously or as an intravenous bolus. The
 * calculator offers a switch between them only when a regimen gives the drug by one of them.
 * A route that needs another dose or another product (daratumumab IV and SC, oral azacitidine)
 * is never listed here: switching it would leave the dose wrong.
 */
export const routeAlternativeSchema = z.strictObject({
  routes: z.array(routeSchema).min(2),
  /** How to dilute and run it when the switch lands on an IV infusion the drug has no
   *  infusion parameters for. */
  infusion: z
    .strictObject({
      solvent: solventSchema,
      volume_ml: positiveNumberSchema,
      duration_min: positiveNumberSchema.int(),
    })
    .nullable()
    .default(null),
  notes: localizedTextSchema.nullable().default(null),
  sources: z.array(sourceSchema).min(1),
})

export type RouteAlternative = z.infer<typeof routeAlternativeSchema>

/**
 * Conditions of the patient a regimen is filtered by on a disease page: kidney or liver
 * impairment, heart disease, severe peripheral neuropathy, lung disease.
 */
export const PATIENT_CONDITIONS = [
  'renal',
  'hepatic',
  'cardiac',
  'neuropathy',
  'pulmonary',
] as const
export const patientConditionSchema = z.enum(PATIENT_CONDITIONS)
export type PatientCondition = (typeof PATIENT_CONDITIONS)[number]

/**
 * How strongly the label speaks: contraindicated — do not give; dose_reduction — give at a lower
 * dose the label states; caution — the label warns without a threshold or a dose.
 */
export const CAUTION_LEVELS = ['contraindicated', 'dose_reduction', 'caution'] as const
export const cautionLevelSchema = z.enum(CAUTION_LEVELS)
export type CautionLevel = (typeof CAUTION_LEVELS)[number]

/**
 * What the drug's label says for a patient with one of these conditions. Written only from the
 * label, with the section cited: the threshold and the reduced dose go into the notes as the
 * label states them, since a filter that invented one would be worse than none. A drug can have
 * several for one condition — doxorubicin is reduced by the bilirubin and contraindicated above it.
 */
export const drugCautionSchema = z.strictObject({
  condition: patientConditionSchema,
  level: cautionLevelSchema,
  notes: localizedTextSchema,
  source: sourceSchema,
})
export type DrugCaution = z.infer<typeof drugCautionSchema>

/**
 * What the label (or a reference it is checked against) says to watch while the drug is given:
 * blood levels, the kidneys, the blood count, hearing. Shown in the drug's row of the calculator
 * as a reminder; it changes no dose.
 */
export const drugMonitoringSchema = z.strictObject({
  notes: localizedTextSchema,
  source: sourceSchema,
})
export type DrugMonitoring = z.infer<typeof drugMonitoringSchema>

/**
 * How the label says to prepare the drug for a route: what to reconstitute a powder in, what
 * and how much to dilute it in, how long the solution keeps, light, filters. Shown on the
 * preparation tab of the calculator as the label says it; it changes no dose and no volume.
 */
export const drugPreparationSchema = z.strictObject({
  routes: z.array(routeSchema).min(1),
  notes: localizedTextSchema,
  source: sourceSchema,
})
export type DrugPreparation = z.infer<typeof drugPreparationSchema>

/**
 * How strongly a label speaks of giving two drugs together: contraindicated; avoid; give at the
 * lower dose it states; give with caution and monitoring.
 */
export const INTERACTION_LEVELS = ['contraindicated', 'avoid', 'dose_adjust', 'caution'] as const

/**
 * What the drug's label says of giving it with others: written once, on the drug whose label
 * says it, naming the drugs of the catalog it concerns. The calculator shows it when both are in
 * the course; it changes no dose.
 */
export const drugInteractionSchema = z.strictObject({
  with: z.array(idSchema).min(1),
  level: z.enum(INTERACTION_LEVELS),
  notes: localizedTextSchema,
  source: sourceSchema,
})
export type DrugInteraction = z.infer<typeof drugInteractionSchema>

/**
 * One phase of a course split into several records — cycle 1 with its premedication and slow
 * first infusion, cycles 2–6, maintenance. The phases share the course id and title; a phase
 * that follows the cycle count says which cycles it covers, so the calculator can give the right
 * one for the cycle being written. Induction, consolidation and maintenance follow one another
 * by `order` and carry no cycles.
 */
export const regimenCourseSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: localizedTextSchema,
  phase: localizedTextSchema,
  order: z.number().int().min(1),
  cycles: z
    .strictObject({
      from: z.number().int().min(1),
      /** Null: this cycle and every one after it. */
      to: z.number().int().min(1).nullable(),
    })
    .nullable(),
})
export type RegimenCourse = z.infer<typeof regimenCourseSchema>

/**
 * How good the publication is, and the resource that carries it — by published instruments, not
 * by our opinion. Three independent things are recorded, and each is left out when it cannot be
 * read from a document:
 *
 *   level              — the level of evidence on the Oxford CEBM 2011 scale for "does this
 *                        intervention help?": 1 systematic review of randomised trials,
 *                        2 a randomised trial, 3 a non-randomised controlled study, 4 a case
 *                        series or a single-arm study, 5 mechanism-based reasoning. It follows
 *                        from the design of the study and nothing else.
 *   publication_types  — NLM's own classification of the article, copied from its PubMed record
 *                        ("Clinical Trial, Phase II", "Multicenter Study"), never paraphrased.
 *   journal            — the resource: whether NLM indexes it for MEDLINE (its catalogue says so
 *                        in as many words) and, where someone with access has entered it, the
 *                        SCImago quartile. A quartile is never guessed; the field stays empty.
 *
 * Deliberately absent: GRADE. It grades a body of evidence behind a recommendation, not a single
 * paper, so a GRADE letter beside one trial would be our judgement wearing an official name.
 */
export const EVIDENCE_LEVEL_SCALES = ['oxford-cebm-2011'] as const
export const JOURNAL_QUARTILES = ['Q1', 'Q2', 'Q3', 'Q4'] as const

export const appraisalSchema = z.strictObject({
  /** Which cited work this describes, as the source list names it. */
  publication: nonEmptyTextSchema,
  /** PubMed identifier, the shortest way back to the record these fields were read from. */
  pmid: z.string().regex(/^\d+$/, 'digits only').optional(),
  level: z
    .strictObject({
      scale: z.enum(EVIDENCE_LEVEL_SCALES),
      value: z.enum(['1', '2', '3', '4', '5']),
      /** Why the design lands on that level. */
      notes: localizedTextSchema.optional(),
    })
    .optional(),
  publication_types: z.array(nonEmptyTextSchema).default([]),
  journal: z
    .strictObject({
      name: nonEmptyTextSchema,
      issn: z.string().optional(),
      medline_indexed: z.boolean().optional(),
      sjr_quartile: z.enum(JOURNAL_QUARTILES).optional(),
      sjr_year: z.number().int().optional(),
    })
    .optional(),
  /** Where these indicators were read: the PubMed record, the NLM catalogue, SCImago. */
  sources: sourcesSchema.default([]),
})

export type Appraisal = z.infer<typeof appraisalSchema>

/**
 * The clinical situation a study enrolled, from a closed list so that a search by situation finds
 * every regimen written for it. A study that enrolled several situations lists each.
 *   ndmm-te / ndmm-ti — newly diagnosed, eligible / ineligible for an autologous transplant
 *   frail             — frail by a published score (IMWG frailty index, IFM proxy score)
 *   rrmm-early        — relapse after one to three lines; rrmm-late — after more
 *   len-refractory, pi-refractory — refractory to lenalidomide / to a proteasome inhibitor
 *   t11-14, pcl, renal, neuropathy, high-risk — a feature of the disease or of the patient
 *   maintenance       — after induction or a transplant
 * The first four are the same words for any disease, for studies that a myeloma term does not fit:
 *   first-line, relapse, refractory, pre-transplant (salvage meant to lead to a transplant),
 *   elderly (by the study's own age limit)
 */
export const TRIAL_SETTINGS = [
  'first-line',
  'relapse',
  'refractory',
  'pre-transplant',
  'elderly',
  'ndmm-te',
  'ndmm-ti',
  'frail',
  'rrmm-early',
  'rrmm-late',
  'len-refractory',
  'pi-refractory',
  't11-14',
  'pcl',
  'renal',
  'neuropathy',
  'high-risk',
  'maintenance',
] as const
export type TrialSetting = (typeof TRIAL_SETTINGS)[number]

/**
 * What a study means for practice. A study that refuted a combination is kept as carefully as one
 * that supports it: it is what stops "found it in a paper, gave it to a patient".
 *   option  — the study supports the regimen
 *   caution — it works, but the study found a harm that needs selection or prophylaxis
 *   avoid   — a randomised study found no benefit or found harm; kept only as a warning
 */
export const TRIAL_VERDICTS = ['option', 'caution', 'avoid'] as const
export type TrialVerdict = (typeof TRIAL_VERDICTS)[number]

export const TRIAL_PHASES = ['I', 'I-II', 'II', 'III'] as const

/** The facts of a study, as its publication states them; anything not stated is left out. */
export const trialFactsSchema = z.strictObject({
  acronym: nonEmptyTextSchema.optional(),
  nct: z
    .string()
    .regex(/^NCT\d{8}$/, 'NCT and eight digits')
    .optional(),
  phase: z.enum(TRIAL_PHASES),
  randomized: z.boolean(),
  /** Patients enrolled, or randomised for a randomised study. */
  n: positiveNumberSchema.int().optional(),
  /** What the regimen was compared with, as the study names it. */
  comparator: nonEmptyTextSchema.optional(),
  /** Whether the study met its primary endpoint. */
  primary_met: z.boolean().optional(),
})

export type TrialFacts = z.infer<typeof trialFactsSchema>

/**
 * The study a regimen comes from, for the regimens that come from a study rather than from a
 * protocol or a label. Every field is optional: an abstract states the design and the numbers,
 * rarely everything, and a field is left out instead of being filled from somewhere else.
 *   design     — phase, number of arms, how the dose was arrived at
 *   population — who was enrolled, including how heavily pretreated
 *   results    — what the study reported, in its own numbers
 *   conduct    — what giving it demands: monitoring, prophylaxis, the toxicity to expect
 */
export const evidenceSchema = z.strictObject({
  design: localizedTextSchema.optional(),
  population: localizedTextSchema.optional(),
  results: localizedTextSchema.optional(),
  conduct: localizedTextSchema.optional(),
  /** The facts of the study a search filters on, so nobody has to read them out of the text. */
  trial: trialFactsSchema.optional(),
  /** The clinical situations the study enrolled; see TRIAL_SETTINGS. */
  settings: z.array(z.enum(TRIAL_SETTINGS)).default([]),
  /** What the study means for practice; see TRIAL_VERDICTS. */
  verdict: z.enum(TRIAL_VERDICTS).default('option'),
  /** One entry per cited publication; see appraisalSchema. */
  appraisal: z.array(appraisalSchema).default([]),
})

export type Evidence = z.infer<typeof evidenceSchema>

/**
 * A course described but not calculated: the sources name it and its drugs, yet leave out a
 * piece of the schedule the calculator cannot do without (the day of a drug within the cycle, a
 * ramp-up step), and a dose list written down from memory would be a dose for a patient. The
 * regimen keeps a card in the treatment tree instead of items, and is never offered in the
 * calculator.
 *   summary      — what the course is and who it is for
 *   drugs        — the drugs of the course as the source names them
 *   key_info     — the short facts worth knowing: how long, how often, what it demands
 *   gap          — what the source does not say, which is why there is no calculation
 *   availability — whether the course can be given in Ukraine; unknown until someone checks
 */
export const REFERENCE_AVAILABILITY = ['unknown', 'registered', 'unavailable'] as const

export const referenceSchema = z.strictObject({
  summary: localizedTextSchema,
  drugs: z
    .array(z.strictObject({ name: localizedTextSchema, drug_id: idSchema.optional() }))
    .min(1),
  key_info: z.array(localizedTextSchema).default([]),
  gap: localizedTextSchema.optional(),
  availability: z.enum(REFERENCE_AVAILABILITY).default('unknown'),
})

export type Reference = z.infer<typeof referenceSchema>

/** Which of the four fields exist, in the order they are read. */
export const EVIDENCE_FIELDS = ['design', 'population', 'results', 'conduct'] as const

/**
 * The same dose as another protocol writes it. A regimen item keeps its own dose as the default
 * and lists the alternatives here, so the physician chooses the protocol instead of retyping mg.
 */
export const doseOptionSchema = z.strictObject({
  dose_value: positiveNumberSchema,
  dose_unit: doseUnitSchema,
  cap_amount: positiveNumberSchema.nullable().default(null),
  notes: localizedTextSchema.nullable().default(null),
  /** Where this dose comes from; `name` is what the physician picks in the list. */
  source: sourceSchema,
})

export const doseOptionsSchema = z.array(doseOptionSchema)

/**
 * A circumstance that changes the dose and is switched on or off for this patient: an
 * interaction, an organ, an age. Unlike a dose option — which asks "by which protocol?" and
 * admits one answer — several modifiers can hold at once, and two of them may well arrive at the
 * same milligrams.
 *
 * A modifier states the whole dose, never a percentage, and always in the unit the item is
 * already written in: the catalog records what a document says, and the arithmetic of "minus
 * 50%" is the document's, not ours. When several are on, the lowest dose applies — the safest of
 * the circumstances the physician ticked.
 */
export const doseModifierSchema = z.strictObject({
  key: idSchema,
  /** What the checkbox says, e.g. «Сильний інгібітор CYP3A». */
  label: localizedTextSchema,
  dose_value: positiveNumberSchema,
  cap_amount: positiveNumberSchema.nullable().default(null),
  notes: localizedTextSchema.nullable().default(null),
  /** On from the start, for a circumstance the protocol itself assumes (its own antifungal). */
  default_on: z.boolean().default(false),
  source: sourceSchema,
})

export const doseModifiersSchema = z.array(doseModifierSchema)
export type DoseModifier = z.infer<typeof doseModifierSchema>

/**
 * The dose and interval a label gives for one range of creatinine clearance, written for the
 * regimen item's own dose (cefepime 2 g every 8 h: 30-60 mL/min, 2 g every 12 h). Whole mL/min,
 * both ends included; above the highest range the item's own dose stands.
 */
export const renalBandSchema = z.strictObject({
  crcl_min: nonNegativeIntSchema,
  crcl_max: nonNegativeIntSchema,
  /** Dose per administration, in the item's own dose unit; null when the range withholds. */
  dose_value: positiveNumberSchema.nullable().default(null),
  administrations_per_day: positiveNumberSchema.int().nullable().default(null),
  /**
   * No dose in this range: the label does not recommend the drug (`not_recommended`), or the
   * doses are set by its concentration in the blood (`levels`). Nothing is calculated.
   */
  withhold: z.enum(['not_recommended', 'levels']).nullable().default(null),
  /**
   * The label's range per administration when it gives one rather than a single dose; the
   * physician may put the dose at either end or the middle. `dose_value` is one of the ends.
   */
  dose_min: positiveNumberSchema.nullable().default(null),
  dose_max: positiveNumberSchema.nullable().default(null),
  /** Minutes between administrations within a day; null for once a day. */
  interval_min: positiveNumberSchema.int().nullable().default(null),
  /**
   * The label gives the first dose in full, as with normal kidneys, and corrects the ones after
   * it (cefepime, fluconazole). Written only for a range given once a day; absent otherwise.
   */
  first_dose_full: z.literal(true).optional(),
  /**
   * Offered as an alternative the physician may switch to: the regimen's full dose every other
   * day instead of the lower daily one, where the lower dose cannot be made from the forms on
   * hand (fluconazole 25 mg with only 50 mg capsules). Absent otherwise.
   */
  every_other_day_full: z.literal(true).optional(),
  notes: localizedTextSchema.nullable().default(null),
  source: sourceSchema,
})

export const renalBandsSchema = z.array(renalBandSchema)
export type RenalBandRow = z.infer<typeof renalBandSchema>

/**
 * Where a physician reads more about a disease. The app only links out: guideline text is
 * copyrighted and is never copied into the catalog.
 */
export const REFERENCE_KINDS = ['nccn', 'uptodate', 'eviq', 'nssg', 'other'] as const
export const referenceKindSchema = z.enum(REFERENCE_KINDS)

export const diseaseReferenceSchema = z.strictObject({
  kind: referenceKindSchema,
  url: z.url(),
  /** Shown instead of the name of the source, for a link that needs saying what it is. */
  label: localizedTextSchema.nullable().default(null),
  /** Edition the article was written against, as the source itself numbers it, e.g. '2.2026'. */
  version: z.string().nullable().default(null),
  /** The day that edition was issued — what the reader checks before trusting the article. */
  updated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .nullable()
    .default(null),
})

export const diseaseReferencesSchema = z.array(diseaseReferenceSchema)
export type DiseaseReference = z.infer<typeof diseaseReferenceSchema>

/**
 * Which part of a disease's article a row holds. `own` is the department's own write-up; the
 * rest are what the department wrote from that guideline, kept apart so a reader can ask what
 * one source says without the others in the way. The text never leaves the private table.
 */
export const ARTICLE_SECTIONS = ['own', ...REFERENCE_KINDS] as const
export const articleSectionSchema = z.enum(ARTICLE_SECTIONS)
export type ArticleSection = z.infer<typeof articleSectionSchema>

/**
 * Where a row of the course is timed and printed.
 *   infusion    — the hourly chain of the infusion sheet; shifting one row moves the rest
 *   day_support — the infusion sheet, timed from the day's first chained drug (ondansetron
 *                 30 min before the cytostatic and then every 8 hours)
 *   ward        — the inpatient sheet: a count per day, never placed in the hourly grid,
 *                 so tablets keep their time when an infusion is shifted
 */
export const SCHEDULE_BLOCKS = ['infusion', 'day_support', 'ward'] as const
export const scheduleBlockSchema = z.enum(SCHEDULE_BLOCKS)

/**
 * A rate that is raised in steps instead of running at one speed, in mL/h: rituximab and the
 * other antibodies. `first` is the patient's first infusion of that drug, `next` every later one.
 */
export const rateStepsSchema = z.strictObject({
  start_ml_h: positiveNumberSchema,
  step_ml_h: positiveNumberSchema,
  every_min: positiveNumberSchema.int(),
  max_ml_h: positiveNumberSchema,
})

export const rateRampSchema = z.strictObject({
  first: rateStepsSchema,
  /** Null when later infusions are given exactly like the first one. */
  next: rateStepsSchema.nullable().default(null),
})

/**
 * What tells the infusions of an antibody apart beyond "first" and "later" (daratumumab IV,
 * isatuximab): the rate of the second infusion, the larger bag of an undivided first dose, and
 * whether a first dose split over consecutive days is one first infusion.
 */
const rampSequenceFields = {
  /** Steps of the second infusion; null when it already runs like the later ones. */
  second: rateStepsSchema.nullable().default(null),
  /** Dilution of the first dose given whole, mL (daratumumab 16 mg/kg: 1000 mL); null if none. */
  first_bag_ml: positiveNumberSchema.nullable().default(null),
  /** Doses on consecutive days of the first week are halves of one first infusion. */
  split_first: z.boolean().default(false),
}
export const rampSequenceSchema = z.strictObject(rampSequenceFields)
/** The same, read from the database: a key a later build adds must not break this one. */
export const rampSequenceRowSchema = z.object(rampSequenceFields)

/** Drug-specific organ-function checks; same shape as ReviewRules in src/domain/warnings.ts. */
export const reviewRulesSchema = z.strictObject({
  renal: z.union([z.boolean(), z.strictObject({ belowMlMin: positiveNumberSchema })]).optional(),
  hepatic: z.union([z.boolean(), z.strictObject({ aboveUmolL: positiveNumberSchema })]).optional(),
  elderly: z
    .union([z.boolean(), z.strictObject({ fromAgeYears: positiveNumberSchema })])
    .optional(),
})
