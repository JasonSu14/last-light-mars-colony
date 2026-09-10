# Next live test: Astra versus one opponent

Status: planned, not implemented or run. Public play remains a free scripted rehearsal. Do not enable API spending until the owner approves the test budget.

## The round

Choose exactly one opponent from a server-approved dropdown. Astra occupies the other side. Both colonies receive independent but identical starting kits: 42 colonists, two crews, six repair parts, two oxygen canisters, identical reserves, and the same 180-second rescue clock. Show two colonies and one shared chaos control. Pause both clocks and action execution while composing a disaster.

Optionally label the colonies A and B during the round, ask which operator handled the crisis better, then reveal the models and recorded results. Keep the ordinary named comparison available for a narrated hackathon demo.

## Fair conditions

- One server-owned clock, seed, rule version, event sequence, and global chaos allowance. Each accepted event has one ID and simulation tick and reaches both worlds exactly once.
- Validate a disaster against shared match limits, then apply its specified damage to both colonies. A struggling side must not become immune because its local crisis slots are full. Keep each side’s resulting health and repair outcomes independent.
- Identical tool meanings, action costs, job durations, starting supplies, and survival objective. Model decisions and latency determine how the worlds diverge.
- Preserve the exact event log for replay. Never select a more favorable random event for one model.
- Record each model’s native capabilities and adapter behavior. If Astra supports native mid-turn steering while the opponent receives updates at its next supported boundary, disclose that difference. This compares the complete operators under shared game rules; it is not a pure reasoning-quality benchmark.
- Freeze game effects for both sides on pause. An already-started API request can finish remotely; buffer its game effects until resume and retain actual usage in the report.

## What spectators see

Survivors and casualties are the primary result. Also show reserves, parts/canisters spent, crew occupancy, repairs completed, rejected actions, and time from each crisis to the first subsequent confirmed action. Link tool receipts to their model response ID and triggering event where available.

Show requested effort separately from queued changes and any API-reported effort. Display reported reasoning tokens, total tokens, and measured response latency; use “unavailable” when absent. Tokens and effort settings are not direct measurements of reasoning quality.

The end screen compares both outcomes, offers an optional spectator vote, reveals identities if hidden, and exports the common event log plus both models’ action/API receipts. Never present the existing no-operator replay as a second AI model.

## Small implementation path

1. Refactor the current mission controller into one match owning two isolated Game states and two operator adapters. Reuse the HTTP command/event mailboxes and image-based colony component; do not create a second independent clock.
2. Add an explicit, server-side model allowlist after checking project access and tool support. The browser cannot send arbitrary model IDs. Verify one opponent first; additional tested options can appear in the dropdown later.
3. Reuse Astra’s native adapter. Implement the selected opponent’s documented Responses tool loop, returning the same engine results and original tool call IDs. Keep model-specific protocol handling outside the game rules.
4. Reserve both live slots atomically before starting either request. Keep API credentials server-side. Add owner-approved per-match spending controls and a stop-both button before opening live comparison to visitors.
5. Add the two-colony layout, shared chaos composer, common timer, receipt panels, results comparison, and optional blind reveal. Update D1 through new migrations only.

## Acceptance checks before paying for a match

Fixture tests must prove synchronized ticks/pause, identical applied events, independent finite supplies, duplicate-event protection, legal tool continuation, missing-metadata handling, and an honest interrupted result if either connection fails. Run the UI with two clearly labeled scripted fixtures first.

Then, with the owner’s approved budget, verify both models separately and run one paired mission against a fixed disaster script. Record real IDs and usage. Repeat only within the approved allowance; one entertaining result is not evidence that a model is generally superior.

Out of scope: public rankings, multi-opponent tournaments, user accounts, persistent voting, automatic model discovery, and broad benchmark claims.
