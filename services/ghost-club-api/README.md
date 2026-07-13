# copa.life Ghost Club API

This Worker stores completed run snapshots and returns a compatible Ghost Club for a future run. It is deliberately separate from the static GitHub Pages client: the game always falls back to AI when this API is unreachable.

## Deploy

1. Create a Cloudflare D1 database named `copa-life-ghosts`.
2. Run `wrangler d1 execute copa-life-ghosts --file=schema.sql` from this folder.
3. Copy `wrangler.toml.example` to `wrangler.toml` and fill in the D1 database id.
4. Deploy with `wrangler deploy`.
5. Add the resulting Worker URL to `<meta name="copa-ghost-api" content="...">` in `index.html`.

The browser queues every completed run locally when offline or before an API URL is configured. The **Play Against Ghost Clubs** setting only controls opponent matching; it never disables run capture.
