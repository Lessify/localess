# Localess end-to-end tests

Playwright tests that drive the real application: the production Angular build served by the built NestJS server,
on a fresh embedded Postgres. They answer one question after a change: does the application still work for a user,
and do the APIs other systems depend on still keep their contract?

What is covered, what is planned and how each area is tested: [TEST-PLAN.md](TEST-PLAN.md).

## Commands

From the repo root:

```bash
pnpm e2e:install   # once: download Chromium (and, on Linux, its system libraries)
pnpm e2e           # build the SPA (build:prod) and the server, then run every test   (CI runs this)
pnpm e2e:run       # every test, against the existing builds (rebuild after changing app code!)
pnpm e2e:smoke     # the critical path only (tests tagged @smoke, ~30 s), against the existing builds
pnpm e2e:ui        # Playwright UI mode: pick tests, watch them, time-travel through each step
```

Inside `apps/e2e` (or `pnpm --filter @localess/e2e <script>`): `test`, `test:smoke`, `test:ui`, `report` (open the
last HTML report), `typecheck`. Playwright options pass through: `pnpm e2e:run -- tests/content --headed`,
`--debug`, `--project=api`, `--repeat-each=3`, `--grep "Translations"`.

A failed test keeps a screenshot, a video and a trace in `test-results/`; `pnpm exec playwright show-trace <trace.zip>`
replays it step by step. In CI the HTML report (and the traces of failures) are uploaded as artifacts.

Environment: `E2E_PORT` (3100), `E2E_PG_PORT` (5544), `E2E_WORKERS` (CI 2, locally half the cores).

## How a run works

1. `playwright.config.ts` starts `scripts/start-server.mjs` (Playwright `webServer`) and waits for `/api/health`.
2. The script deletes `apps/e2e/.data` and starts `apps/server/dist/main.js` on port 3100 with an embedded Postgres
   on port 5544, serving `apps/web/dist/browser`. It refuses to start if either build is missing. The ports differ
   from `pnpm dev` (3000 / 5433), so both can run at once.
3. The server seeds the first admin from `LOCALESS_ADMIN_EMAIL` / `LOCALESS_ADMIN_PASSWORD` (`tests/support/env.ts`)
   with the "Hello World" space, as on a new installation. Machine translation uses the `stub` provider, and webhooks
   may call loopback addresses (for the local receiver).
4. The `setup` project (`tests/auth.setup.ts`) signs in through the login form and saves the session to
   `.auth/admin.json`. Two projects depend on it:
   - `ui`: Chromium, every spec except `tests/api`.
   - `api`: no browser, `tests/api` (CDN API, Management API, platform rules).
5. Tests run in parallel against that one server. That works because every test owns its data (below).

## Layout

```
playwright.config.ts        # server, ports, projects (setup → ui, api), reporters, traces
scripts/start-server.mjs    # wipes .data and starts the built server
TEST-PLAN.md                # the catalogue: what can be tested, how, and what is automated
tests/
├── support/
│   ├── env.ts              # port, seeded admin credentials, session file
│   ├── fixtures.ts         # `test`: api, space, createUser, signInAs, cleanup, error guard, offline browser
│   ├── app-api.ts          # App API client for test data (spaces, translations, schemas, contents, assets, ...)
│   ├── files.ts            # a 1×1 PNG for uploads
│   ├── webhook-receiver.ts # local HTTP endpoint for webhook deliveries
│   └── translations.ts     # English / German / Romanian setup, API and CDN read-back, the translation stub
├── pages/                  # page objects (one per page) and shared helpers (dialogs, row menus, toasts)
├── auth.setup.ts           # signs in once for the other specs
├── api/                    # platform, CDN API (translations, contents, assets), Management API, permissions
├── auth/                   # login, logout, deep links, password reset, what restricted users see
├── admin/                  # Admin → Users, Admin → Spaces
├── me/                     # profile
├── space/                  # settings (general, locales, environments, tokens), dashboard, navigation
├── translations/           # add, edit, delete, labels, search and language, machine translation, list and tree views
├── content/                # schemas, contents, assets
└── developers/             # webhooks
```

## Fixtures (`tests/support/fixtures.ts`)

Import `test` and `expect` from `./support/fixtures` (not `@playwright/test`):

| Fixture | What it gives |
|---|---|
| `space` | A new space (default locale English, plus its auto-generated preview token), deleted after the test |
| `api` | `AppApi` as the admin, for test data: `createTranslation`, `createSchema` (with fields), `createDocument`, `saveDocumentData`, `publishContent`, `uploadAsset`, `createToken`, `createWebhook`, `createUser`, ... It has its own session, so it works in specs that start signed out |
| `createUser(options)` | A user with a unique email and known password (`role` CUSTOM unless given, `permissions`, `lock`), deleted after the test |
| `signInAs(user)` | A page in its own browser context, signed in as that user (no localStorage: like a fresh browser) |
| `page` | As usual, plus the **error guard** (below) |
| `anonymousRequest()` | An HTTP client without the admin session (for token-only and signed-out checks) |

**Error guard.** Every page (`page` and `signInAs` pages) records uncaught errors and everything reported to
Angular's `ErrorHandler` (what users see as the "An error occurred." toast); the test fails if there were any. A test
that expects one (a known issue) declares it: `test.use({ allowedAppErrors: [/403 \S+\/api\/app\/spaces /] })`.
Errors after teardown has started deleting the test's data are ignored.

**Offline.** Every browser context aborts requests to anything but the server under test (GitHub's release check,
web fonts): runs don't depend on the internet, and the app is checked as an install without internet access.

## Writing tests

- **One test per user-visible flow**, named for the behaviour (`'regenerating a token cuts off the old value'`).
  Tag the critical path with `@smoke` in the title; keep that set small and fast.
- **Set up through the API, act through the UI, check both.** Only the flow under test goes through the browser.
  After the toast, check that the change was really saved: reload, or read it back through the API or the CDN.
- **Own your data.** Use `space` / `createUser`; give anything else unique names (`uniqueName`, `uniqueId`). Never
  change the seeded admin or the "Hello World" space: tests run in parallel.
- **Locate by role, label and text**, the way a user finds things. An icon-only button needs an `aria-label` (it
  also makes it usable with a screen reader): add one to the template rather than reaching for CSS selectors.
  Spartan selects and comboboxes need a `<label for>` pointing at their trigger (`buttonId`).
- **Keep selectors in page objects** (`tests/pages`), so a template change is fixed in one place.
- **Lists update live** (server-sent events), and a re-rendered row closes its open menu: use `rowMenu` /
  `expectRowMenu` from `pages/dialogs.ts`, which retry. Wait for a form to show its loaded value before typing into it.
- **Native dialogs** (`window.confirm` of the unsaved-changes guard) are answered in a `page.once('dialog')`
  listener registered before the click.
- Never use fixed waits (`waitForTimeout`); `expect` retries until its timeout, `expect.poll` for non-UI values.
- When a test finds a bug, fix it with a unit test next to the code, keep the e2e test, and add it to the findings in
  [TEST-PLAN.md](TEST-PLAN.md). If it can't be fixed now, allow the error in that test and list it as an open finding.
