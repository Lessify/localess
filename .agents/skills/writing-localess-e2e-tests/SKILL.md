---
name: writing-localess-e2e-tests
description: Use when writing, changing or fixing a Playwright end-to-end test in the Localess repository (apps/e2e), when an e2e test is flaky, or when a UI change touches a flow the e2e suite covers (labels, buttons, dialogs, toasts).
---

# Writing Localess e2e tests

## Overview

A Localess e2e test proves a user-visible result three ways: **pre-check → action (in the UI) → post-check** in the UI,
after a reload, and through the API (and the CDN when the action changes what it delivers). A test is done only when it
passed a stress run and the full suite, and TEST-PLAN.md says what it covers.

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
| Bugs | A failing test may be a bug: read the app code, reproduce, then fix it with a unit test (the e2e test stays as the regression test) or ask to pin today's behaviour as an open finding. Never weaken an assertion to make it pass. |

## Done means

1. App code changed? `pnpm build:prod` (and `pnpm server:build` for the server) — the suite runs the **built** app.
   Only `apps/e2e` changed? No build and no `pnpm lint:fix` needed (CLAUDE.md's "after every change" is for app code).
2. `pnpm --filter @localess/e2e exec tsc -p tsconfig.json` and `pnpm exec prettier --check <files>` (`pnpm lint` does not cover apps/e2e).
3. Stress: `pnpm --filter @localess/e2e exec playwright test <spec> --repeat-each 5` — all green.
4. Whole suite as CI runs it: `CI=1 pnpm e2e:run` (about 7 minutes; run it in the background, once per round).
5. TEST-PLAN.md: the scenario row (✅ + spec), and any bug in **Findings** (fixed) or **Open findings** (kept).

Pass Playwright options **without** `--` (`pnpm e2e:run tests/contents --headed`): after `--` every option becomes a
test filter and a full run starts.

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
