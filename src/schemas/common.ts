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

export const TREATMENT_NODE_KINDS = [
  'treatment',
  'line',
  'stage',
  'group',
  'trial',
  'reference',
] as const
export const treatmentNodeKindSchema = z.enum(TREATMENT_NODE_KINDS)

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

/** Drug-specific organ-function checks; same shape as ReviewRules in src/domain/warnings.ts. */
export const reviewRulesSchema = z.strictObject({
  renal: z.union([z.boolean(), z.strictObject({ belowMlMin: positiveNumberSchema })]).optional(),
  hepatic: z.union([z.boolean(), z.strictObject({ aboveUmolL: positiveNumberSchema })]).optional(),
  elderly: z
    .union([z.boolean(), z.strictObject({ fromAgeYears: positiveNumberSchema })])
    .optional(),
})
