# Hematologist+

Dose calculator for chemo-immunotherapy courses and a reference of hematological diseases for adult hematologists.

> Decision-support tool. Final dosing and prescribing decisions rest with the physician.

- **Frontend:** Vite · React · TypeScript · Mantine · react-i18next (uk/en) · PWA
- **Data:** Supabase (read-only from the site)
- **Hosting:** GitHub Pages

Requirements: [docs/requirements.md](docs/requirements.md) · Plan: [docs/development-plan.md](docs/development-plan.md)

## Local development

Requires Node.js 24+.

```bash
npm install
npm run dev                  # http://localhost:5173/hematologist-plus/
```

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | oxlint |
| `npm run typecheck` | TypeScript |
| `npm run format` | Prettier |
| `npm run pwa:assets` | Regenerate PWA icons from `public/icon.svg` |

## Deployment

Push to `main` → GitHub Actions builds and publishes to Pages.

Pages source is set to GitHub Actions. Site: https://tavi599.github.io/hematologist-plus/

Supabase URL and the browser-safe publishable key live in the committed `.env`. Secrets (e.g. `SUPABASE_SECRET_KEY` for data sync scripts) go only into git-ignored `.env.local` — see `.env.example`.

`supabase-keep-alive.yml` pings the project every 3 days so the free tier is not paused.

`BASE_PATH` defaults to `/hematologist-plus/` and is set from the repository name in CI.
