# Copa Agent — Autonomous Playtesting System

Persistent autonomous playtesting for the Copa.life browser game.

**What it does:**
- Opens and plays the game repeatedly in a real browser
- Tests the full player journey: intro → draft → hub → sim → result
- Continues until all 6 presidents (chairs) are unlocked through normal gameplay
- Saves progress and resumes after interruptions
- Produces structured bug/balance/UX reports

**What it never does:**
- Modifies game source code
- Uses internal unlock functions (presidents unlocked through wins only)
- Auto-fixes detected issues
- Min-maxes or exploits hidden information

---

## Setup

```bash
cd playtest/runner
npm install
npx playwright install chromium
```

## Running

Start the game's local dev server first (e.g. Live Server on port 5500), then:

```bash
# New session
npx ts-node src/cli.ts

# Headless mode
npx ts-node src/cli.ts --headless

# Custom URL
npx ts-node src/cli.ts --url "http://localhost:3000?autotest=1"

# Resume a prior session
npx ts-node src/cli.ts --resume <sessionId>

# Limit runs
npx ts-node src/cli.ts --max-runs 10
```

Press `Ctrl+C` at any time — the checkpoint is saved automatically.

## Tests

```bash
# Unit tests (no browser required)
npx playwright test tests/session.test.ts tests/issues.test.ts

# Bridge smoke tests (requires game server on port 5500)
GAME_URL=http://localhost:5500?autotest=1 npx playwright test tests/bridge.test.ts
```

## Output

All output goes to `playtest/playtest-output/`:

| Directory | Contents |
|-----------|----------|
| `sessions/` | Session metadata |
| `checkpoints/` | Resume state (JSON) |
| `screenshots/` | Issue & result screenshots |
| `telemetry/` | JSONL event stream (every action + state) |
| `issues/` | JSONL issue log (deduped, with occurrences) |
| `reports/` | Per-run Markdown + campaign JSON/Markdown |
| `saves/` | Game localStorage backups after each run |

## Configuration

Edit `playtest/config.json`:

| Key | Default | Description |
|-----|---------|-------------|
| `gameUrl` | `http://localhost:5500?autotest=1` | Game URL — must include `?autotest=1` |
| `maxRunsPerSession` | 100 | Stop after N runs |
| `maxSessionDurationMs` | 28800000 (8h) | Stop after N milliseconds |
| `headless` | false | Hide browser window |
| `slowMoMs` | 150 | Delay between Playwright actions (ms) |
| `thinkTimeMs` | `{min:400,max:1200}` | Simulated human think time |
| `stagnationTimeoutMs` | 90000 | Declare stuck if no state change for 90s |
| `screenshotOnIssue` | true | Screenshot on every detected issue |
| `screenshotOnResult` | true | Screenshot every result screen |

## Architecture

```
bridge/copa-test-bridge.js     In-page bridge (injected by Playwright)
runner/src/
  types.ts                     Shared TypeScript types
  config.ts                    Config loading
  bridge.ts                    Playwright ↔ bridge wrapper
  agent.ts                     Main observe-decide-act loop
  actions.ts                   Semantic action layer
  session.ts                   Session identity + checkpointing
  issues.ts                    Issue deduplication + persistence
  stagnation.ts                Stuck-game detector
  coverage.ts                  Coverage matrix tracker
  reports.ts                   JSON + Markdown report generator
  cli.ts                       CLI entry point
```

## How the bridge works

The bridge file is injected into the game page via Playwright's `addInitScript()` before every navigation. It only activates when `?autotest=1` is present in the URL — in all other cases it exits immediately, leaving the game completely unmodified.

When active, it:
1. Reads game globals (`round`, `budget`, `cards`, etc.) directly — no source modifications
2. Exposes `window.CopaTestBridge` with `snapshot()`, `action()`, `on()`, and coverage APIs
3. Patches key game functions on `window` (non-destructively via wrapper) to emit telemetry events

The runtime agent reads state, decides what an ordinary player would do, executes one semantic action, and repeats.
