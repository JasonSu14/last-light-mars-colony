# LAST LIGHT: Mars Colony

A three-minute survival game. You create chaos; the colony operator tries to keep 42 people alive on Mars.

**Status:** playable rehearsal controller. The GPT-6 Astra integration is implemented and covered by protocol fixtures, but live API access has not yet been verified. Live mode is disabled by default.

## Play

[Play LAST LIGHT](https://last-light-mars-colony.skater9114.chatgpt.site)

Press **Begin rehearsal**, inject a preset disaster or describe one, and watch repairs, diagnostics, resources, and priorities change. **Random chaos** supplies an event when you need inspiration. Survive 180 seconds with at least 34 colonists and nonzero essential supplies.

Rehearsal runs entirely in the browser using a deterministic local controller and a keyword-based disaster interpreter. It makes no OpenAI calls. Its reasoning indicator explicitly identifies the simulated effort.

## Run locally

Use Node.js 24 LTS and npm. No API key is required for rehearsal.

```bash
git clone https://github.com/JasonSu14/last-light-mars-colony.git
cd last-light-mars-colony
npm run install:ci
npm run dev
```

Open http://localhost:5173. For a production-style local preview:

```bash
npm run build
npm start
```

Wrangler prints the preview URL, normally http://127.0.0.1:8787.

## Checks

```bash
npm run typecheck
npm test
npm run check:socket
```

The socket check needs the development server running. For the production preview, run `npm run check:socket -- http://127.0.0.1:8787`.

Seventeen tests cover resource bounds, survival, chaos limits, repair/diagnostic timing, action deduplication, steering boundaries, async call IDs, and effort updates. A socket smoke check exercises a real mission, oxygen failure, cooldown rejection, diagnostic scheduling, and repair completion. WebMCP rehearsal controls were also exercised in the browser. These checks do not establish live Astra compatibility; that requires an actual API run.

## Architecture

- React + TypeScript, Vinext, Tailwind, and Cloudflare Workers through Sites.
- `game/engine.ts`: shared simulation rules and rehearsal controller.
- `game/rehearsal.ts`: browser rehearsal clock and command driver.
- `server/mission.ts`: same-origin mission WebSocket, validation, elapsed-time advancement, and bounded live access.
- `server/astra.ts`: Responses WebSocket adapter with native async diagnostics, `response.steer`, and between-response `configuration_update` effort changes.
- `app/use-mission.ts`: client connection and optional WebMCP tools.
- `app/page.tsx` and `app/globals.css`: mission-control interface.
- `worker.ts`: API routing and application rendering.

Live actions change server-owned state; rehearsal actions change browser-local simulation state. Diagnostic jobs finish later with their original call ID. A crisis during an active response sends native steering; completed diagnostics wait for the legal continuation boundary. The UI shows short operator decisions, not private chain-of-thought.

## Connect live Astra

See [the setup guide](docs/MARS_COLONY_SETUP.md). Configure `OPENAI_API_KEY` only as a server secret. Set `LIVE_MODE_ENABLED=true` only after checking access and completing a live rehearsal. No key belongs in source, browser code, a screenshot, or chat.

**Hosting limitation:** Sites currently returns a gateway error for the inbound mission WebSocket. Rehearsal avoids this transport. Before enabling hosted live play, resolve the gateway support or move the live mission server to a WebSocket-capable host and configure a secure browser connection. The local server socket smoke check passes.

Live mode stops visibly on upstream errors rather than silently substituting rehearsal. The configured model is `gpt-6-astra`.

## Hackathon limits

A round is three minutes, with six disaster templates, a 12-second injection cooldown, twelve injections, three simultaneous ongoing crises, two repair crews, six spare parts, and two oxygen canisters. Free-text disasters map into the same bounded templates.

Rehearsal lives in browser memory and remains playable without a socket connection. Live sessions live in a server WebSocket closure. Refreshing ends the round; there is no database, account system, or resume feature. Both clocks catch up after delayed heartbeats; background-tab throttling may delay displayed updates.

Live requests are limited to 24 responses per round. Two concurrent sessions and five starts per IP per hour are **per Worker isolate**, not global billing guarantees. Before a widely shared live launch, add durable global quotas or authenticated access. Public rehearsal requires no API spending.

## Publish and continue building

This project is registered with Sites using `.openai/hosting.json`. In Codex, open this project and ask to validate and publish it using the Sites plugins. Existing registration must be reused. Hosting is independent of GitHub; pushing GitHub alone does not deploy.

For a fresh independent deployment, ask Codex to register a new Site for your copy rather than reusing another owner's project ID. Preserve the Sites build plugin and the custom Worker entrypoint.

The [build brief](docs/MARS_COLONY_BUILD_BRIEF.md) records the initial product scope. Its original Node/Express/Render architecture was adapted to the built-in Sites/Workers runtime for this implementation; this README and the setup guide describe the actual code.
