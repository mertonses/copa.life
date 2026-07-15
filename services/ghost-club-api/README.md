# copa.life Ghost Club API

Cloudflare Worker + D1 service for opt-in anonymous completed-run opponents, plus a privacy-minimised aggregate product-event endpoint. The game always falls back to AI and analytics calls fail silently when this service is unavailable.

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
- `wrangler.staging.jsonc`: isolated staging Worker. Its D1 database intentionally has no committed ID so Wrangler provisions/links the staging resource independently.
- Production allows only `https://copa.life` and `https://www.copa.life` browser origins.

Before the first staging deployment:

```powershell
npx wrangler d1 migrations apply GHOSTS --remote --config wrangler.staging.jsonc
npx wrangler deploy --config wrangler.staging.jsonc
```

Production deployment:

```powershell
npx wrangler d1 migrations apply GHOSTS --remote --config wrangler.jsonc
npx wrangler deploy --config wrangler.jsonc
```

GitHub Actions performs tests and dry-run builds on pull requests. `main` deploys production after migrations; staging is an explicit manual workflow choice. Required GitHub environment secrets are `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Health and observability

- `GET /v1/health` checks Worker execution and a real D1 query.
- `ghost-health.yml` probes production every 30 minutes and fails visibly in GitHub Actions.
- Set the repository/environment variable `GHOST_API_HEALTH_URL` to the canonical production `/v1/health` URL; the script's workers.dev URL is only a fallback.
- Workers Logs sample 10% and traces sample 1% in production; staging uses higher sampling.
- Errors are emitted as structured JSON with event, path, and message.

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
