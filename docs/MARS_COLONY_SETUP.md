# LAST LIGHT: setup and handoff

Updated for the implemented Sites/Cloudflare Workers app, September 10, 2026. The initial proposal used Node/Express and Render; the actual app uses React/Vinext and one Worker to keep hosting inside Codex.

## 1. Start building in Codex

Open the cloned repository as a Codex project. Select GPT-6 Astra with medium reasoning for routine work; use high for a difficult integration problem. This coding setting is separate from the game's low/medium/high runtime effort.

Use this continuation prompt:

> Continue LAST LIGHT from README.md and docs/MARS_COLONY_BUILD_BRIEF.md. Preserve the polished three-minute rehearsal demo. Verify the native Astra integration with official documentation and an actual API run before enabling live mode. Keep secrets server-side. Run the relevant tests and production build, then publish the existing Sites project and update GitHub. Preserve the small D1 command mailbox; do not add accounts or a large game engine. Do not enable paid API requests until the owner approves a budget.

## 2. Run the existing app

Install Node.js 24 LTS, Git, and npm. Sign into GitHub with access to the repository.

```bash
git clone https://github.com/JasonSu14/last-light-mars-colony.git
cd last-light-mars-colony
npm run install:ci
npm run dev
```

Open http://localhost:5173 and press Start the chaos. Rehearsal does not need billing or an API key.

## 3. Create and store the API key securely

Codex sign-in and a connected plugin are not an API key for the deployed app. An OpenAI API project needs billing and access to `gpt-6-astra`.

In Codex, enable OpenAI Developers and connect its OpenAI Platform dependency. Ask Codex to create a project-scoped key securely for this app and store it as the Sites secret `OPENAI_API_KEY`. The owner has deferred API setup and budgeting. Keep live mode disabled until explicit approval to use credits. Secure key-creation tools were not available in the previous setup attempt. A fresh Codex task in this repository may be needed to load newly enabled tools. Do not paste a key into chat.

For manual local development, create a key in the OpenAI Platform dashboard and save it directly into an ignored `.dev.vars` file in a local editor:

```dotenv
OPENAI_API_KEY=YOUR_KEY_ENTERED_LOCALLY
LIVE_MODE_ENABLED=false
```

Do not commit this file. `.env.example` is a template with no credential. The Worker reads `.dev.vars` locally; the helper smoke script can read it too.

Run:

```bash
npm run check:model
```

This performs a small real request and can incur API usage. It prints status, not the key. A successful text request verifies basic model access only.

Then temporarily enable `LIVE_MODE_ENABLED=true` in your local `.dev.vars`, restart development, and select Launch with Astra. Verify a complete mission, diagnostics finishing during other work, an injected crisis during an active response, and effort changes at the next response boundary. If any native feature fails, repair the adapter and keep public live mode disabled.

Official references: [Astra model](https://developers.openai.com/api/docs/models/gpt-6-astra), [async tools](https://developers.openai.com/api/docs/guides/async-tool-calling), [steering](https://developers.openai.com/api/docs/guides/steering), [reasoning](https://developers.openai.com/api/docs/guides/reasoning), [WebSocket mode](https://developers.openai.com/api/docs/guides/websocket-mode).

## 4. Validate

```bash
npm run typecheck
npm test
npm run check:stream
npm run build
npm start
```

The HTTP stream check requires a local built server with D1. Follow the README migration setup first. It uses the free server rehearsal operator:

```bash
npm run check:stream -- http://127.0.0.1:8787
```

Native protocol tests use fixtures. Record actual live test results separately and never present fixture success as live model verification.

## 5. GitHub

The project repository is https://github.com/JasonSu14/last-light-mars-colony. It was created private; the playable website can be public independently. The full codebase is uploaded. Clone that repository for future GitHub work.

For a completely new repository instead, install GitHub CLI, authenticate, and run these commands from your new project root:

```bash
git init -b main
git add .
git commit -m "Build LAST LIGHT Mars colony"
gh auth login
gh repo create last-light-mars-colony --private --source=. --remote=origin --push
```

Do not run the creation command against the existing repository. Future updates from a GitHub clone use normal commits and `git push`.

## 6. Publish a playable URL

Public rehearsal: https://last-light-mars-colony.skater9114.chatgpt.site. Rehearsal executes in browser memory, using the shared simulation engine, and needs no API or WebSocket connection.

**Connection update:** the browser now uses HTTP event polling and authenticated commands through temporary D1 mailboxes. This avoids the gateway’s rejected inbound WebSocket upgrade. The outgoing Astra connection still needs a real, explicitly authorized API test.

The existing `.openai/hosting.json` identifies the registered Site. Ask Codex to use Sites to validate the app, push the exact source, package the Worker build, save it, and publish publicly. Codex should wait for successful hosting before returning the production URL.

Rehearsal works without environment configuration. For live operation, configure `OPENAI_API_KEY` as a Sites secret and `LIVE_MODE_ENABLED=true` only after the live checks pass. Changing local `.dev.vars` does not configure hosting.

The current deployment is designed for a hackathon. D1 enforces two active HTTP live sessions globally; IP start limits remain per Worker isolate. These are not a dollar spend cap. Keep the public rehearsal available and use controlled access or durable quotas before opening paid live play to a large audience.

## Suggested remaining demo work

1. Resolve secure API provisioning and verify native Astra end to end.
2. Rehearse a three-minute story: oxygen processor failure, repair in progress, then dust storm. Open the finite supply kit and action receipts to show costs, measured integrity changes, and the no-operator comparison. Label rehearsals as scripted.
3. Record a short backup rehearsal demo, clearly labeled as rehearsal.
4. Share the public game URL and GitHub source link.
