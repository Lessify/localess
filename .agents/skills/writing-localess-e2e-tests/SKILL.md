---
name: writing-localess-e2e-tests
description: Use when writing, changing or fixing a Playwright end-to-end test in the Localess repository (apps/e2e), when an e2e test is flaky, when a UI change touches a flow the e2e suite covers (labels, buttons, dialogs, toasts), or when asked to cover a Localess feature with e2e tests, find what a feature lacks in tests, or review how well an area (translations, contents, assets, schemas, settings, users, APIs) is tested.
---

# Writing Localess e2e tests

## Overview

A Localess e2e test proves a user-visible result three ways: **pre-check → action (in the UI) → post-check** in the UI,
after a reload, and through the API (and the CDN when the action changes what it delivers). A test is done only when it
passed a stress run and the full suite, and TEST-PLAN.md says what it covers.

Two kinds of work use this skill:

- **One test** (write, change, fix, de-flake): follow *The shape of a test*, *Rules* and *Done means*.
- **A whole feature** (cover it, find its gaps, review an area): first *Covering a feature*, which proposes scenarios
  in rounds and waits for the user; then each agreed test as above.

**REQUIRED READING before the first test of a session:** `apps/e2e/README.md` (fixtures, error guard, offline browser,
page objects, writing rules). Copying a neighbouring spec is not a substitute: it carries its shortcuts with it.

## The shape of a test

```ts
// tests/space/environments.spec.ts (real page object and API helpers)
test('edits an environment', async ({ page, api, space }) => {
  await api.addEnvironment(space.id, { name: 'Staging', url: 'https://staging.example.com/' }); // data via the API
  const environments = new EnvironmentsPage(page);

  // Pre-check: UI and API agree on the starting state.
  await environments.goto(space.id);
  await expect(environments.item('Staging')).toBeVisible();
  expect((await api.findSpace(space.id))?.environments).toMatchObject([{ name: 'Staging' }]);

  // Action: in the UI, through the page object (it waits for the toast).
  await environments.edit('Staging', { name: 'Production', url: 'https://www.example.com/' });

  // Post-check: the UI, again after a reload, and the API.
  await expect(environments.item('Production')).toBeVisible();
  await expect(environments.item('Staging')).toHaveCount(0);
  await page.reload();
  await expect(environments.item('Production')).toBeVisible();
  expect((await api.findSpace(space.id))?.environments).toMatchObject([{ name: 'Production' }]);
});
```

## Rules

| Area | Rule |
|---|---|
| Data | Own it: `space` / `createUser` fixtures, unique names (`uniqueName`). Never change the shared admin or "Hello World". |
| Setup | Through `api` (`tests/support/app-api.ts`), not the UI — the UI is for the action under test. |
| Page objects | Selectors live in `tests/pages/<area>.page.ts`. The area has one → extend it; it has none and a second spec needs the same selectors → create it; one small spec alone may keep inline locators. |
| Refusals | For "is refused" (validation, permissions, cancel), the post-check also proves **nothing changed**: the API state equals the pre-check. Exact messages come from the template or `apps/web/src/app/core/error-handler/form-error-handler.service.ts` (form errors). |
| Locators | By role and label. An icon-only control without a name → add `aria-label` to the app (and say so). No CSS or text-regex hacks. Third-party markup the app can't label (Stoplight Elements, the TipTap toolbar): scope to its container, then `getByText(…, { exact: true })`. |
| Waiting | `expect(...)` / `expect.poll`, never `waitForTimeout`. A repeated toast can be the previous one: confirm with the row or the API. |
| Live lists | Row menus close when a list re-renders: use `rowMenu` / `expectRowMenu`. After a select, `choose()` waits for the list to close. |
| Dialogs | `dialog(page, title)`; confirmations `confirmDialog`; a native `confirm()` via `page.once('dialog')`. |
| Bugs | A failing test may be a bug: confirm it (*Confirm every suspicion* below), then fix it with a unit test (the e2e test stays as the regression test) or ask to pin today's behaviour as an open finding. Never weaken an assertion to make it pass. |

## Done means

1. App code changed? `pnpm build:prod` (and `pnpm server:build` for the server) — the suite runs the **built** app.
   Only `apps/e2e` changed? No build and no `pnpm lint:fix` needed (CLAUDE.md's "after every change" is for app code).
2. `pnpm --filter @localess/e2e exec tsc -p tsconfig.json` and `pnpm exec prettier --check <files>` (`pnpm lint` does not cover apps/e2e).
3. Stress: `pnpm --filter @localess/e2e exec playwright test <spec> --repeat-each 5` — all green.
4. Whole suite as CI runs it: `CI=1 pnpm e2e:run` (about 7 minutes; run it in the background, once per round).
5. TEST-PLAN.md: the scenario row (✅ + spec), and any bug in **Findings** (fixed) or **Open findings** (kept).

Pass Playwright options **without** `--` (`pnpm e2e:run tests/contents --headed`): after `--` every option becomes a
test filter and a full run starts.

## Covering a feature

Coverage is a conversation in rounds, not a dump: understand the feature end to end, **propose** prioritised scenarios,
let the user choose, implement one area at a time, and turn every surprise into a confirmed finding with a decision.

### 1. Understand the feature (read before proposing)

| Layer | Where |
|---|---|
| What it is for | `docs/features/**`, `docs/concepts.md`; CLAUDE.md's knowledge-base table names the doc per area |
| UI | `apps/web/src/app/features/<area>/` — templates (labels, buttons, toasts, dialogs), the component, its service |
| Access | route guards (`features-routing.module.ts`), the server's `@RequirePermission` on the route |
| Server | `apps/server/src/modules/<area>/` — controller, service; what it stores; events, webhooks, CDN output |
| Already covered | `apps/e2e/TEST-PLAN.md`, the specs it names, `apps/e2e/tests/support/` helpers, unit and server tests |

Unfamiliar page? The `playwright-test-planner` agent can explore it in a live browser from the seed
`apps/e2e/tests/seed.spec.ts` and save a draft to `apps/e2e/specs/`; its plan is input to the proposal, not the
proposal.

### 2. Confirm every suspicion before reporting it

A suspected bug is a hypothesis. Settle it with the cheapest probe — an API call, a throwaway spec, the running app —
then report it as **confirmed** (with what you saw) or drop it. "Needs verification" is not a finding.

A throwaway probe is a temporary spec in `apps/e2e/tests/`: add `test.use({ allowedAppErrors: [/.*/s] })` (the error
guard would fail it on the very error you are looking for), call the API with `api.get` / `api.send`, and delete the file
afterwards. It overwrites `test-results/` and `playwright-report/` (ignored by git).

### 3. Propose — this is the output of the first round

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

### 4. Implement, round by round

Per agreed area: write the specs (the shape, rules and *Done means* above), fix agreed bugs in the app with unit tests,
keep the others pinned by a "roadmap check" test plus a TEST-PLAN **Open findings** row. Report each round, then ask
before committing.

## Other tools

- **Generic Playwright topics** (sharding, `test.step`, multi-user, network or clock mocking, visual regression): the
  `playwright-best-practices` skill. This skill wins where they disagree: never `waitForLoadState('networkidle')` (live
  SSE updates keep the network busy); CDK drag and drop with `dragAbove` (`tests/pages/drag.ts`), not `dragTo`.
- **Playwright Test Agents** (`.claude/agents/playwright-test-{planner,generator,healer}`): drafts only. Rewrite a
  generated test to this skill's shape (fixtures, page objects, API checks); never accept a healer change that skips a
  test or loosens an assertion.

## Common mistakes

- Pre-check only in the UI; post-check without a reload or without the API.
- One green run taken as proof (flakes show at `--repeat-each 5`).
- Testing a stale build after changing apps/web.
- Leaving TEST-PLAN.md untouched.
- Covering a feature: proposing without reading the template (wrong labels and toasts in the scenarios); a flat list of
  20 scenarios with no priority; unconfirmed "suspected bugs"; writing all tests before the user chose; fixing app
  behaviour the user may want kept.
