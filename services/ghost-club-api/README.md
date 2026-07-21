# copa.life Ghost Club API

Cloudflare Worker + D1 service for opt-in anonymous completed-run opponents, a separately opt-in World Club Ranking, and a privacy-minimised aggregate product-event endpoint. The game always falls back to AI and online calls fail safely when this service is unavailable.

## Local validation

```powershell
npm ci
npm test
npm run types
npm run check:deploy
```

`migrations/` is the schema source of truth. `schema.sql` remains a readable bootstrap snapshot; new changes must be added as a numbered migration.

## Environments

- `wrangler.jsonc`: production Worker and production D1 binding.
- `wrangler.staging.jsonc`: isolated staging Worker bound to the dedicated `copa-life-ghosts-staging` D1 database.
- Production allows only `https://copa.life` and `https://www.copa.life` browser origins.

Before the first staging deployment:

```powershell
npx wrangler d1 migrations apply GHOSTS --remote --config wrangler.staging.jsonc
npx wrangler deploy --config wrangler.staging.jsonc
```

The Cloudflare account must have Analytics Engine enabled before either Worker can deploy with its analytics bindings. D1 migrations can be applied independently and are safe to rerun.

Production deployment:

```powershell
npx wrangler d1 migrations apply GHOSTS --remote --config wrangler.jsonc
npx wrangler deploy --config wrangler.jsonc
```

GitHub Actions performs tests and dry-run builds on pull requests. `main` deploys production after migrations; staging is an explicit manual workflow choice. Deployments require `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Reports use a separate read-only `CLOUDFLARE_ANALYTICS_TOKEN`.

## Health and observability

- `GET /v1/health` checks Worker execution and a real D1 query.
- `ghost-health.yml` probes production every 30 minutes and fails visibly in GitHub Actions.
- Set the repository/environment variable `GHOST_API_HEALTH_URL` to the canonical production `/v1/health` URL; the script's workers.dev URL is only a fallback.
- Workers Logs sample 10% and traces sample 1% in production; staging uses higher sampling.
- Errors are emitted as structured JSON with event, fixed route bucket, and message.
- `copa_life_worker_health` stores privacy-safe aggregate route, status, request-count and latency metrics; staging uses `copa_life_worker_health_staging`.
- `analytics-report.yml` writes a weekly seven-day KPI artifact; `analytics-monitor.yml` checks profile-open and Worker 5xx rates every 30 minutes.

Manual health check:

```powershell
node scripts/check-health.mjs
```

## Aggregate product analytics

- `POST /v1/analytics/events` accepts only the fixed event and dimension allowlists in `src/index.js`.
- The production Analytics Engine dataset is `copa_life_product_events`; staging writes to `copa_life_product_events_staging`.
- No user ID, session ID, install ID, player name, club name, email, free text or Analytics Engine index is stored.
- `blob1..8` and `double1..2` are documented in `docs/analytics.md`.
- The dataset is created automatically on the first production write after deployment.
- Android does not ship the analytics client; the endpoint currently receives web events only.

## World Club Ranking

- `POST /v1/leaderboard/runs` accepts a completed run only with `leaderboard-terms-v1` consent and the client-held deletion token.
- The Worker validates the six-match route and computes Reputation itself. Duplicate run IDs, cheat-marked runs and invalid histories never add score.
- `GET /v1/leaderboard` returns the current monthly top 100. `GET /v1/leaderboard/me` returns the participant's profile and nearby ranks.
- Monthly Club Coefficient is the sum of the participant's best 10 accepted runs. Lifetime Reputation and career totals do not reset.
- `DELETE /v1/me/leaderboard` removes the public profile and its run rows. `DELETE /v1/me/ghosts` removes both Ghost and ranking data owned by the same deletion token.
- Detailed career-run rows are purged after their monthly season; the aggregate public profile remains until opt-out/deletion.

## Rollback

1. Inspect versions: `npx wrangler versions list --config wrangler.jsonc`.
2. Roll back Worker code: `npx wrangler rollback --config wrangler.jsonc`.
3. Do not reverse an applied D1 migration destructively. Add a forward corrective migration and deploy it.
4. Verify `/v1/health`, then inspect Workers Logs for `ghost_api_error`.

## Security model

- Server-generated cryptographic public IDs; submitted IDs never overwrite rows.
- Actual streamed request bodies are capped at 64 KB.
- Rate limits are keyed by Cloudflare's connecting IP, with anonymous client ID only as a non-edge fallback.
- Stored snapshots receive a server-computed SHA-256 integrity value.
- CORS is an origin boundary, not authentication; schema checks and rate limiting remain mandatory.
- Uploads require the current explicit-consent version and a client-held deletion token.
- D1 stores only one-way hashes of installation and deletion identifiers.
- Reports immediately move a Ghost to review; three unique reports block it and repeat violations can block the submitting client.
- A daily scheduled handler physically deletes expired Ghost rows after 45 days and prunes reports after 90 days.
- The same scheduled handler removes detailed ranking runs outside the active monthly season.
