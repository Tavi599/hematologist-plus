# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project

**Hematologist+** — web app for adult hematologists of a single hospital department (Ukraine).

Core features:
1. Dose calculator for chemo-immunotherapy courses.
2. Drug catalog with parameters required for calculation (presentations, infusion params).
3. Disease catalog: ICD-10 codes, diagnostics, treatment, clinical course (free Markdown articles).
4. Regimen designs available for calculation.
5. Word (.docx) prescription sheets generated from JSON templates stored in the DB.

User-facing pages: calculator (input → calculation → print) and diseases (list → article → treatment hierarchy → regimen → "Calculate").

Full agreed requirements and open questions: [docs/requirements.md](docs/requirements.md). Read it before changing schema, calculation rules or print forms, and update it when a decision changes.

Staged development plan: [docs/development-plan.md](docs/development-plan.md). Check which stage is current before starting work; mark tasks done there.

## Architecture

- **Hosting:** GitHub Pages, public repo. Static SPA only — no server code.
- **Database:** Supabase free tier. The site is **read-only** against the DB (publishable key; RLS: `anon` role → `SELECT` only). No auth, no login.
- **Content updates** happen outside the site: admin supplies source files → converted into `data/` → validated → synced to Supabase by scripts using the `service_role` key.
- **All logic runs in the browser:** calculation, schedule building, .docx generation.
- **PWA / offline:** app shell and reference data cached (IndexedDB); calculator and printing must work offline.
- **Keep-alive:** GitHub Actions cron pings Supabase so the free project is not paused.

## Stack

Node 24 · Vite 8 · React 19 · TypeScript 6 (strict, `noUncheckedIndexedAccess`) · Mantine 9 (UI) · react-router 8 (`HashRouter`, required for GitHub Pages) · TanStack Query · @supabase/supabase-js · react-i18next · vite-plugin-pwa · Vitest + Testing Library · oxlint · Prettier.
Planned: react-hook-form + Zod · `docx` · react-markdown · Playwright.

## Commands

```bash
npm run dev          # http://localhost:5173/hematologist-plus/
npm run build        # tsc -b && vite build → dist/
npm run preview      # serve dist at http://localhost:4173/hematologist-plus/
npm test             # Vitest (jsdom)
npm run test:coverage  # with coverage; src/domain must stay ≥ 95%
npm run lint         # oxlint
npm run typecheck    # tsc -b --noEmit
npm run format       # Prettier (format:check in CI)
npm run pwa:assets   # regenerate PWA icons from public/icon.svg
# planned (stage 2):
npm run data:validate  # Zod-validate everything in data/
npm run data:sync      # upsert data/ into Supabase (needs SUPABASE_SECRET_KEY in .env.local, never in the site)
npm run db:types       # regenerate src/types/database.types.ts
```

Run all of lint, format:check, typecheck, test, build before declaring work done — CI runs the same.

Environment quirks (Windows dev machine):
- Node is not on PATH in the Bash tool: prefix commands with `export PATH="/c/Program Files/nodejs:$PATH";`.
- `.claude/launch.json` starts `preview`/`dev` via `node.exe node_modules/vite/bin/vite.js`. Open `/hematologist-plus/` — the base path applies in dev, preview and build.
- The preview registers a service worker; after rebuilding, unregister it (or accept the update prompt) to see fresh code.

## Structure

```
.github/workflows/     ci.yml, deploy.yml, supabase-keep-alive.yml
supabase/migrations/   SQL schema + RLS policies (one migration per change, never edit applied ones)
data/                  source of truth for content (drugs, regimens, diseases, hospitals)
scripts/               import-sources, validate-data, sync-supabase (Node, run outside the site)
docs/                  requirements.md, architecture/data-model notes
src/
  app/                 router, providers, layout, language switcher
  pages/               CalculatorPage, DiseasesPage, DiseaseDetailPage
  features/            patient-form, regimen-picker, dose-table, print (multi-day-sheet, infusion-sheet)
  domain/              pure calculation logic — no React, no I/O
  schemas/             Zod schemas (regimen, print template, patient input)
  lib/                 supabase client, i18n, pwa, offline-cache, localized-field helpers
  types/               generated DB types
  locales/{uk,en}/     UI strings
```

## Conventions

- **English only** for code, identifiers, file names, DB tables/columns, commit messages.
- UI text never hardcoded — always via i18n keys in `src/locales/{uk,en}`. Both files must have the same keys.
- DB tables `snake_case` plural; TS types `PascalCase`; files `kebab-case`, React components `PascalCase.tsx`.
- Generated DB types are not edited by hand.
- Localized DB/content text is read only through `localize` / `resolveLocalized` from `src/lib/localized.ts`.
- Tests sit next to the code (`*.test.ts(x)`); render components with `renderWithProviders` from `src/test/render.tsx`.
- Service worker update is user-confirmed (`registerType: 'prompt'`) so an in-progress form is never lost to an auto-reload.

## Localization rules

- UI: Ukrainian and English with a switcher; default `uk`.
- Localized DB fields are `jsonb` shaped `{"uk": "...", "en": "..."}`; **either key may be missing**.
- Display rule: user's language if present, otherwise any available language. Implement once in `src/lib` and reuse — never read `.uk`/`.en` directly in components.
- Printed .docx forms are **Ukrainian only**.

## Domain rules (medical — correctness first)

- Calculation code lives in `src/domain/` as pure functions with unit tests. Every rule change needs a test with a worked example. Coverage threshold for `src/domain` is 95% (`npm run test:coverage`).
- **Not calibrated yet.** All tunable defaults live in `src/domain/config.ts` (`DOMAIN_DEFAULTS`); unconfirmed rules are marked `CALIBRATION:` in code. Calibration against real prescription-sheet templates happens in stage 5 — see [docs/calibration.md](docs/calibration.md). Change a default there and in the table, never inline in a formula.
- Invalid inputs throw `DomainInputError` (with `field`); clinical concerns are returned as `DomainWarning`s and never alter a dose.
- BSA: **Mosteller**. Every dose is computed **twice**: on actual BSA and on BSA capped at 2.0 m²; both are shown.
- Dose units: `mg_m2`, `mg_kg`, `mg_flat` (with optional `capMg`), `auc` (Calvert: dose = AUC × (GFR + 25), GFR via Cockcroft-Gault).
- Rounding to 1 mg; vial-content snapping overrides when enabled (disabled until calibration). The **unrounded** dose is printed as a note on the 2nd page of the .docx.
- Vial/tablet counts per day and per course.
- Dose reduction: manual % per course and per drug. Automatic checks only **suggest** reductions — never change a dose silently.
- Solvent volume and infusion rate are calculated from drug infusion params (fallback: values from the regimen template).
- Drugs in a course can be disabled or added by the user.
- Calendar dates derive from course start date; infusion times are auto-scheduled from day start + durations and can be shifted manually.
- The UI shows the calculation chain for each dose (`CalculationStep[]`: BSA → per-unit dose → cap → reduction → rounding).
- Never invent clinical values (doses, caps, concentrations). If data is missing, surface it to the user and ask.

## Print forms

- Output: `.docx` only, generated in the browser, visually as close to the supplied hospital blanks as possible.
- Templates and the list of forms per regimen live in `regimens.print_forms` (jsonb), validated by Zod before rendering and before sync.
- Two form kinds:
  - **multi-day sheet** — tablets and daily injections, one sheet for many days;
  - **infusion sheet** — one sheet per infusion day.
- Number of days/columns is always dynamic, driven by regimen and course parameters — never hardcoded.
- Header (hospital, department, doctor, head of department) defaults from `hospitals`, editable on the form.

## Data and privacy

- **No patient data is ever sent to Supabase or any external service**, logged, or cached in the service worker. Patient input lives in component state only.
- Supabase project `hematologist-plus` (ref `lenftpktjlxpqaajgqtm`, Frankfurt). URL + **publishable** key are committed in `.env` (browser-safe by design). The **secret** key is used only by `scripts/`, read from git-ignored `.env.local` or GitHub secrets — never committed, never in `VITE_*` vars.
- Every table in an exposed schema must have RLS enabled in the same migration that creates it; the publishable key would otherwise expose it.
- Diseases: WHO ICD-10 by default; additional classifications plug in via `classification_systems` / `disease_codes`.

## Workflow notes

- The user is a hematologist, communicates in Ukrainian — reply in Ukrainian.
- Ask before inventing structure for print forms or calculation rules not covered by `docs/requirements.md`.
