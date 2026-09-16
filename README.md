# Portfolio

Griffin Tennent's personal site — portfolio and side projects. Built with Vite, React, TypeScript, and Tailwind CSS.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode with hot module reloading.\
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

Note: this serves the frontend only. To also exercise the `/api/*` routes locally
(Credit Union Lookup's branch search, financials, complaints, ratings, and news
cards), run `npm run dev:api` in a second terminal — Vite proxies `/api/*`
requests to it (see `vite.config.ts`).

### `npm run dev:api`

Runs a small local stand-in for Vercel's serverless functions (see
`scripts/dev-api-server.ts`) on port 3001, so `/api/branches`, `/api/call-report`,
`/api/complaints`, `/api/branch-rating`, and `/api/news` work during local
development without needing the Vercel CLI. Reads keys from `.env.local`. Not
used in production — Vercel deploys `api/*.ts` as real serverless functions there.

### `npm run build`

Type-checks the project and builds it for production to the `dist` folder.

### `npm run preview`

Serves the production build from `dist` locally, for a final check before deploying.

### `npm run lint`

Runs ESLint over the project.

### `npm run ingest:call-report`

Re-runs the one-time ETL that pulls NCUA's latest quarterly Call Report data into
`data/call-report.json`, served via `/api/call-report` (see `scripts/ingest-call-report.ts`). Re-run each
quarter to refresh the figures — update `CALL_REPORT_URL` in that script first.

### `npm run ingest:branches`

Re-runs the one-time ETL that snapshots HIFLD's NCUA-insured credit union branch dataset into
`data/branches.json`, served via `/api/branches` (see `scripts/ingest-hifld.ts`). The app reads this
snapshot instead of querying HIFLD's ArcGIS service live — that service is CORS-open and free, but
it's an unauthenticated, unversioned ArcGIS Online item with no SLA. Branch locations don't change
day-to-day, so re-run this occasionally (e.g. before a demo) rather than on any fixed schedule.

## API keys

The Credit Union Lookup project (`/api/news.ts`, `/api/branch-rating.ts`) needs two API keys,
set as environment variables (never commit real values — see `.env.example`):

- `NYT_API_KEY` — free, from [developer.nytimes.com](https://developer.nytimes.com/), enable "Article Search API"
- `GOOGLE_PLACES_API_KEY` — from a Google Cloud project with the "Places API (New)" enabled and
  billing set up ([developers.google.com/maps/documentation/places/web-service](https://developers.google.com/maps/documentation/places/web-service)).
  Unlike the other keys this project uses, this one isn't free — a monthly credit covers light
  use, but real traffic will incur cost. `/api/branch-rating.ts` caches responses for a week to
  keep call volume down.

For local development, copy `.env.example` to `.env.local` and fill in real values (used by
`npm run dev:api`). For production, add both as Environment Variables in the Vercel project
settings.

## Deployment

Hosted on [Vercel](https://vercel.com) — connect this GitHub repo in the Vercel dashboard and
it auto-deploys on every push to `master` (zero config needed; Vercel auto-detects the Vite
build and treats files under `api/` as serverless functions). To deploy manually instead:

```
npx vercel        # preview deploy
npx vercel --prod # production deploy
```
