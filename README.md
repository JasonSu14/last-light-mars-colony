# LAST LIGHT: Mars Colony

A three-minute survival game. You create chaos; the colony operator tries to keep 42 people alive on Mars.

**Status:** playable rehearsal controller. The GPT-6 Astra integration is implemented and covered by protocol fixtures, but live API access has not yet been verified. Live mode is disabled by default.

## Play

[Play LAST LIGHT](https://last-light-mars-colony.skater9114.chatgpt.site)

Press **Start the chaos**, then click a building or choose a disaster card. The illustrated colony shows damaged targets and active repair/diagnostic timers. **Surprise me** chooses a random available disaster; **Write your own** maps your description into a supported event.

Opening the chaos composer pauses the rescue clock, resources, cooldowns, diagnostics, and repairs. **Unleash disaster** applies the event and resumes time; **Cancel & resume** returns without a disaster. Survive 180 seconds with at least 34 colonists. Rescue ends the resource emergency; surviving people determine the result.

Rehearsal runs entirely in the browser using a deterministic local controller and a keyword-based disaster interpreter. It makes no OpenAI calls. Its pressure label describes colony danger, not model thinking. The action receipts and finite supply kit show exactly what the scripted controller spends and changes.

## Run locally

Use Node.js 24 LTS and npm. No API key is required for rehearsal.

```bash
git clone https://github.com/JasonSu14/last-light-mars-colony.git
cd last-light-mars-colony
npm run install:ci
npm run dev
```

Open http://localhost:5173. For the HTTP connection check or a production-style local preview, build and apply the migration **once per local database**, then start:

```bash
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_petite_cassandra_nova.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_blue_sphinx.sql
npm start
```

Wrangler prints the preview URL, normally http://127.0.0.1:8787.

## Checks

```bash
npm run typecheck
npm test
npm run check:stream
```

The HTTP stream check needs a built local server with the D1 migration applied (see below). It runs a server rehearsal, with no OpenAI calls. The normal browser rehearsal needs neither D1 nor a connection.

Twenty-four tests cover resource bounds, survival, chaos limits, repair/diagnostic timing, action deduplication, steering boundaries, async call IDs, and effort updates. The HTTP integration check verifies authenticated commands, duplicate connection rejection, a frozen simulation, disaster injection, resumed time, diagnostics, and repair completion. These checks do not establish live Astra compatibility; that requires an actual API run.

## Architecture

- React + TypeScript, Vinext, Tailwind, and Cloudflare Workers through Sites.
- `game/engine.ts`: shared simulation rules and rehearsal controller.
- `game/rehearsal.ts`: browser rehearsal clock and command driver.
- `server/mission.ts`: transport-independent mission controller and native upstream Astra connection.
- `server/http-mission.ts`: HTTP event polling with D1 command and event mailboxes, session tokens, and bounded sessions.
- `game/clock.ts`: shared pause-aware simulation clock.
- `server/astra.ts`: Responses WebSocket adapter with native async diagnostics, `response.steer`, and between-response `configuration_update` effort changes.
- `app/use-mission.ts`: client connection and optional WebMCP tools.
- `app/page.tsx` and `app/globals.css`: interactive colony scene, disaster cards, and pause-aware composer.
- `worker.ts`: API routing and application rendering.

Live actions change server-owned state; rehearsal actions change browser-local simulation state. Diagnostic jobs finish later with their original call ID. A crisis during an active response sends native steering; completed diagnostics wait for the legal continuation boundary. The UI shows short operator decisions, not private chain-of-thought.

## Connect live Astra

See [the setup guide](docs/MARS_COLONY_SETUP.md). Configure `OPENAI_API_KEY` only as a server secret. Set `LIVE_MODE_ENABLED=true` only after checking access and completing a live rehearsal. No key belongs in source, browser code, a screenshot, or chat.

**Hosted connection:** the browser now uses ordinary HTTP event polling and authenticated command requests, avoiding the inbound WebSocket upgrade rejected by the Sites gateway. A small D1 mailbox routes commands to the owning request across Worker instances and returns events through ordinary JSON responses. The client keeps the owning request open while polling, so a gateway that buffers streaming bodies cannot hide mission updates. The outgoing Astra WebSocket remains server-side. Real Astra access and native features still require an authorized API test before enabling live mode.

Live mode stops visibly on upstream errors rather than silently substituting rehearsal. The configured model is `gpt-6-astra`.

## Hackathon limits

A round is three minutes, with six disaster templates, a 12-second injection cooldown, twelve injections, three simultaneous ongoing crises, two repair crews, six spare parts, and two oxygen canisters. Free-text disasters map into the same bounded templates.

Rehearsal lives in browser memory and remains playable without a socket connection. Live sessions live in a server stream closure; D1 holds temporary session access hashes, commands, and game events; these expire after 15 minutes and are cleaned up when another server session starts. It stores no API keys and offers no save-game feature. Refreshing ends the round. There is no account system or resume feature. Both clocks catch up after delayed heartbeats while excluding explicitly paused time. A server connection expires after 15 wall-clock minutes.

Live requests are limited to 24 responses per round. The HTTP transport admits at most two active live sessions globally through D1. Five starts per IP per hour remain **per Worker isolate**. Neither is a dollar-denominated billing guarantee. Before a widely shared live launch, add durable global quotas or authenticated access. Public rehearsal requires no API spending.

## Publish and continue building

This project is registered with Sites using `.openai/hosting.json`. In Codex, open this project and ask to validate and publish it using the Sites plugins. Existing registration must be reused. Hosting is independent of GitHub; pushing GitHub alone does not deploy.

For a fresh independent deployment, ask Codex to register a new Site for your copy rather than reusing another owner's project ID. Preserve the Sites build plugin and the custom Worker entrypoint.

The [build brief](docs/MARS_COLONY_BUILD_BRIEF.md) records the initial product scope. Its original Node/Express/Render architecture was adapted to the built-in Sites/Workers runtime for this implementation; this README and the setup guide describe the actual code.

## Artwork

`public/mars-colony.png` is original generated artwork created for this game. Building interaction points align to this image. Keep its 3:2 aspect ratio when changing the scene layout.

## Fairness and observable results

Every round starts with two repair crews, six spare parts, and two oxygen canisters. A repair consumes one part and occupies one crew for 18 seconds (30 at low stability), restoring 40 integrity. A canister adds 12 oxygen. These supplies do not regenerate. Power allocation trades oxygen production against power use and food production; rationing reduces water/food use but costs stability.

The interface shows each accepted action, its cost, its running/completed state, and measured results. A repair receipt uses integrity immediately before and after completion, so another disaster cannot be hidden by a misleading starting value. Download the round report for the exact event/action records.

Oxygen at or below 15 for six consecutive seconds loses a colonist; water or food at or below 5 for ten seconds does too. Repairs and hazards stop while the chaos composer is open. Disasters hit harder and repairs take longer, making overlapping failures and exhausted crews consequential.

A no-operator replay applies the same accepted disasters at the same simulation ticks. The comparison is a counterfactual within the game rules, not a real-world survival claim or proof that Astra ran. Rehearsal makes no model calls. Live operator receipts record received response IDs, requested effort, any API-reported effort, and reported reasoning/total tokens; missing data remains unavailable. The adapter sends effort updates at response boundaries using `configuration_update`, while preserving the original request-level effort for caching.

Run `node scripts/check-balance.mjs` for deterministic balance checks across 50 seeds. This compares the scripted controller with no-operator replays and does not benchmark GPT-6 Astra.

## Planned head-to-head demo

The [Arena test plan](docs/MARS_COLONY_ARENA_PLAN.md) describes Astra versus one selected opponent, identical resources and disasters, an optional blind reveal, and measured results. It is a future live-test feature; no second model has been connected or run.
