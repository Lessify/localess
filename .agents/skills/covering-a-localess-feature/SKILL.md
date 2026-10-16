---
name: covering-a-localess-feature
description: Use when asked to cover a Localess feature with end-to-end tests, to find what a feature lacks in tests, or to review how well an area (translations, contents, assets, schemas, settings, users, APIs) is tested.
---

# Covering a Localess feature

## Overview

Coverage is a conversation in rounds, not a dump: understand the feature end to end, **propose** prioritised scenarios,
let the user choose, implement one area at a time with **REQUIRED SUB-SKILL: writing-localess-e2e-tests**, and turn
every surprise into a confirmed finding with a decision.

## 1. Understand the feature (read before proposing)

| Layer | Where |
|---|---|
| What it is for | `docs/features/**`, `docs/concepts.md`; CLAUDE.md's knowledge-base table names the doc per area |
| UI | `apps/web/src/app/features/<area>/` — templates (labels, buttons, toasts, dialogs), the component, its service |
| Access | route guards (`features-routing.module.ts`), the server's `@RequirePermission` on the route |
| Server | `apps/server/src/modules/<area>/` — controller, service; what it stores; events, webhooks, CDN output |
| Already covered | `apps/e2e/TEST-PLAN.md`, the specs it names, `apps/e2e/tests/support/` helpers, unit and server tests |

Unfamiliar page? The `playwright-test-planner` agent (`.claude/agents/`) can explore it in a live browser from the
seed `apps/e2e/tests/seed.spec.ts` and save a draft to `apps/e2e/specs/`; its plan is input to the proposal, not the
proposal.

## 2. Confirm every suspicion before reporting it

A suspected bug is a hypothesis. Settle it with the cheapest probe — an API call, a throwaway spec, the running app —
then report it as **confirmed** (with what you saw) or drop it. "Needs verification" is not a finding.

A throwaway probe is a temporary spec in `apps/e2e/tests/`: add `test.use({ allowedAppErrors: [/.*/s] })` (the error
guard would fail it on the very error you are looking for), call the API with `api.get` / `api.send`, and delete the file
afterwards. It overwrites `test-results/` and `playwright-report/` (ignored by git).

## 3. Propose — this is the output of the first round

1. One paragraph: how the feature works, with file paths.
2. A TEST-PLAN-style table, ordered by priority:

   | Priority | Scenario | Pre-check → action → post-check | Status |
   |---|---|---|---|
   | Must | What a user does and must get | the starting state (UI + API) → the UI action → UI, after reload, API, CDN/webhook | ⬜ |

   A page that only shows data (no action of its own): the change is made through the API or another page, and the
   page is the post-check. Partly covered today: `⬜ (partly: <spec>, <what it checks>)`.

   **Must**: the feature's main jobs and its permission rules. **Should**: edge cases users hit (validation, empty,
   cancel, duplicates). **Could**: cosmetic or third-party behaviour. Mark ➖ what other layers already cover.
3. Confirmed findings, each with a proposal: **fix** (with a unit test) or **keep and record** (open finding or a
   `docs/roadmap/` to-do).
4. A question: which scenarios, and what to do with each finding.

Stop there and wait for the answer. The proposal stays in the conversation; TEST-PLAN.md changes when a scenario is
implemented.

## 4. Implement, round by round

Per agreed area: write the specs (writing-localess-e2e-tests), fix agreed bugs in the app with unit tests, keep the
others pinned by a "roadmap check" test plus a TEST-PLAN **Open findings** row. Report each round, then ask before
committing.

## Common mistakes

- Proposing without reading the template (wrong labels and toasts in the scenarios).
- A flat list of 20 scenarios with no priority.
- Unconfirmed "suspected bugs".
- Writing all tests before the user chose; fixing app behaviour the user may want kept.
