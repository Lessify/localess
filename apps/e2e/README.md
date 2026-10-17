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
last HTML report), `typecheck`. Playwright options pass through, without a `--` (pnpm would hand it to Playwright, which then takes every option after it
for a test filter): `pnpm e2e:run tests/contents --headed`,
`--debug`, `--project=api`, `--repeat-each=3`, `--grep "Translations"`.

A failed test keeps a screenshot, a video and a trace in `test-results/`; `pnpm exec playwright show-trace <trace.zip>`
replays it step by step. In CI the HTML report (and the traces of failures) are uploaded as artifacts.

CI (`.github/workflows/build.yml`) builds the SPA and the server once (`e2e-build`) for every e2e job, runs the suite in
two shards (`e2e`, `--shard=1/2` and `2/2`, each writing a blob report with `E2E_BLOB=1`) and merges them into one HTML
report (`e2e-report`). A test that passes only on its retry fails the run (`failOnFlakyTests`).

Environment: `E2E_PORT` (3100), `E2E_IDP_PORT` (3101), `E2E_MAIL_PORT` (3102, and 3103 for its mailbox), `E2E_PG_PORT`
(5544), the limits server's `E2E_LIMITS_PORT` (3110), `E2E_LIMITS_IDP_PORT` (3111), `E2E_LIMITS_MAIL_PORT` (3112–3113),
`E2E_LIMITS_PG_PORT` (5545), `E2E_WORKERS` (a number or a percentage; CI 2, locally half the cores).

Two other setups, both run in CI (`.github/workflows/build.yml`):

- **External Postgres** (`e2e-postgres`): `E2E_DATABASE_URL=postgres://…` makes the server use that database
  (`DATABASE_URL`) instead of the embedded one. The start script **empties it** (drops the `public` and `drizzle`
  schemas) before every run, so point it at a throwaway database only.
- **A server already running** (`e2e-docker`, the Docker image): `E2E_BASE_URL=http://localhost:3100 pnpm e2e:smoke`
  starts no server and runs against that one. It must be set up for the tests it runs: the admin of
  `tests/support/env.ts`, `LOCALESS_LOGIN_RATE_LIMIT=10000` and `LOCALESS_WEBHOOK_ALLOW_INTERNAL=true` for the smoke
  suite, on the host network (the webhook receiver and the preview site listen on 127.0.0.1). The full suite also needs
  the mock OpenID provider, the mail catcher, the translation stub and the CLI next to the server, so it runs only
  with the server this suite starts.

## How a run works

1. `playwright.config.ts` starts `scripts/start-server.mjs` (Playwright `webServer`) and waits for `/api/health`.
2. The script deletes `apps/e2e/.data` and starts `apps/server/dist/main.js` on port 3100 with an embedded Postgres
   on port 5544, serving `apps/web/dist/browser`. It refuses to start if either build is missing. The ports differ
   from `pnpm dev` (3000 / 5433), so both can run at once. Next to it the script starts a mock OpenID provider
   (`oauth2-mock-server`, port 3101) that stands in for Google and Microsoft (`tests/support/oauth.ts` picks who
   signs in), and a mail catcher for "forgot password" emails (SMTP on 3102, the received mails as JSON on 3103,
   read by `tests/support/mail.ts`).
3. The server seeds the first admin from `LOCALESS_ADMIN_EMAIL` / `LOCALESS_ADMIN_PASSWORD` (`tests/support/env.ts`)
   with the "Hello World" space, as on a new installation. Machine translation uses the `stub` provider, and webhooks
   may call loopback addresses (for the local receiver).
4. The `setup` project (`tests/auth.setup.ts`) signs in through the login form and saves the session to
   `.auth/admin.json`. Two projects depend on it:
   - `ui`: Chromium, every spec except `tests/api` and `tests/limits`.
   - `api`: no browser, `tests/api` (CDN API, Management API, platform rules).
5. Tests run in parallel against that one server. That works because every test owns its data (below).
6. A second server starts next to it with low limits, for `tests/limits` only (project `limits`): uploads up to 1 MB
   and 3 sign-in attempts a minute (`LIMITS` in `tests/support/env.ts`), on port 3110 with its own embedded Postgres
   (5545), data directory (`.data-limits`), mock OpenID provider and mail catcher (3111–3113). Not started with
   `E2E_BASE_URL`.

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
│   ├── files.ts            # a 1×1 PNG, a PDF and a text file for uploads
│   ├── assets.ts           # asset read-back from the App API and the CDN
│   ├── webhook-receiver.ts # local HTTP endpoint for webhook deliveries (its answer status can be set)
│   ├── translations.ts     # English / German / Romanian setup, API and CDN read-back, the translation stub
│   ├── schemas.ts          # schema read-back from the App API, `createEnum`
│   ├── sessions.ts         # `SessionProbe` (the `probe` fixture)
│   ├── text.ts             # `escapeRegExp` (names in a RegExp), `exactly` (a whole text, e.g. a count)
│   ├── contents.ts         # content read-back, a CDN client (public / preview), a Root schema helper
│   ├── preview-site.ts     # a local customer site for the Visual Editor (loads sync-v1.js)
│   ├── app-routes.ts       # the App API routes and their access, read from the server's controllers
│   ├── oauth.ts            # who the mock OpenID provider signs in (Google / Microsoft)
│   └── mail.ts             # mails from the mail catcher ("forgot password")
├── pages/                  # page objects (one per page) and shared helpers (dialogs: `dialog`, `expectRefused`, `cancel`,
│                           # `answerConfirm`, row menus; toasts; drag and drop)
├── auth.setup.ts           # signs in once for the other specs
├── seed.spec.ts            # where the Playwright Test Agents start (a fresh space)
├── api/                    # platform, CDN API, Management API (translations, schemas, OpenAPI), permission matrix, user managers
├── auth/                   # login, logout, deep links, password reset (link and email), Google / Microsoft, restricted users
├── admin/                  # Admin → Users, Admin → Spaces
├── me/                     # profile
├── space/                  # settings (general, locales, environments, tokens, danger zone), dashboard, navigation
├── translations/           # add, edit, delete, labels, search and language, machine translation, list and tree views
├── assets/                 # upload, create folder, rename, move, delete, grid layout and preview
├── schemas/                # create, fields (and the content editor), settings, references, enum values, edit ID and delete, list
├── contents/               # folders and documents, lifecycle, every field kind, blocks, validation, locales, delivery, Visual Editor
├── developers/             # webhooks: create, edit, disable / enable, delete, delivery logs
├── confirmations/          # Cancel changes nothing: destructive confirmations and form dialogs
├── limits/                 # on the second server (low limits): a too-large upload, the sign-in rate limit
└── a11y/                   # axe-core scan (WCAG 2 A / AA): pages, dialogs, the Visual Editor
```

## Agents and skills

- Project skills (`.claude/skills/`, sources in `.agents/skills/`): `writing-localess-e2e-tests` (how a test here is
  written and verified, and how a whole feature is covered: agreed scenarios, round by round), and the vendored generic
  `playwright-best-practices` (Currents.dev; see its `SOURCE.md`).
- Playwright Test Agents (`npx playwright init-agents --loop=claude`, Playwright 1.56+): `.claude/agents/` holds the
  planner, generator and healer, `.mcp.json` (repo root) their MCP server (started in this workspace, headless), `tests/seed.spec.ts`
  the environment they start from (the fixtures: own space, error guard), `specs/` their Markdown plans. Their output is
  a draft, rewritten to the skill; each definition ends with a Localess section (re-add it after regenerating them,
  e.g. after a Playwright upgrade). Restart Claude Code once so it loads `.mcp.json` and the agents.

## Product videos (`demos/`)

Scripted walkthroughs for the website, recorded by Playwright, not tests: `pnpm demos` from the root (or one:
`pnpm demos schemas`) records each `demos/*.demo.ts` into `demo-videos/<name>.webm` (1600×900, VP9; gitignored), and, with ffmpeg installed,
`<name>.mp4` (H.264) and `<name>-poster.jpg` (the title card) for the website's `<video poster>`. They run
on their own server (`playwright.demos.config.ts`: port 3300, `.data-demos`, admin "Alex Morgan"), so the e2e suite
can run at the same time; each demo creates an "Acme Website" space with English, German and French and deletes it after.

`demos/support/director.ts` makes them watchable: a title card, captions, a visible pointer with click ripples (kept in
front of dialogs and menus, which are in the browser's top layer), the pointer gliding to each control, typing at a
readable speed. `demos/support/images.ts` draws the sample pictures. A demo is a script: change the wording or the steps
there, then record again. Requires the builds (`pnpm build:prod`, `pnpm server:build`).

## Fixtures (`tests/support/fixtures.ts`)

Import `test` and `expect` from `./support/fixtures` (not `@playwright/test`):

| Fixture | What it gives |
|---|---|
| `space` | A new space (default locale English, plus its auto-generated preview token), deleted after the test |
| `api` | `AppApi` as the admin, for test data: `createTranslation`, `createSchema` (with fields), `createDocument`, `saveDocumentData`, `publishContent`, `uploadAsset`, `createToken`, `createWebhook`, `createUser`, ... It has its own session, so it works in specs that start signed out |
| `createUser(options)` | A user with a unique email and known password (`role` CUSTOM unless given, `permissions`, `lock`), deleted after the test |
| `signInAs(user)` | A page in its own browser context, signed in as that user (no localStorage: like a fresh browser) |
| `signedOutPage()` | A page in its own browser context, signed out (no session, no localStorage), with the error guard and offline routing |
| `page` | As usual, plus the **error guard** (below) |
| `anonymousRequest()` | An HTTP client without the admin session (for token-only and signed-out checks) |
| `probe` | Signs in with an email and password in a client of its own: `canSignIn`, `accessOf` (role, permissions, which App API areas answer), then `probe.request` as that user |

**Error guard.** Every page (`page`, `signInAs` and `signedOutPage` pages, and popups they open) records uncaught
errors, everything reported to Angular's `ErrorHandler` (what users see as the "An error occurred." toast) and every
server error (5xx) of an `/api/` call, also one the app handles quietly; the test fails if there were any. Open browser
contexts through these fixtures, not `browser.newContext()`, or the page has no guard and reaches the internet. A test
that expects one (a known issue) declares it: `test.use({ allowedAppErrors: [/403 \S+\/api\/app\/spaces /] })`.
Errors after teardown has started deleting the test's data are ignored. Teardown fails when it can't delete what a
test created (a 404, already deleted by the test, is fine): leaked data would otherwise go unnoticed.

**Offline.** Every browser context aborts requests to anything but the server under test and `127.0.0.1` (sites a test serves itself, like the Visual Editor's preview site) (GitHub's release check,
web fonts): runs don't depend on the internet, and the app is checked as an install without internet access.

## Writing tests

- **One test per user-visible flow**, named for the behaviour (`'regenerating a token cuts off the old value'`).
  Tag the critical path with `@smoke` in the title; keep that set small and fast.
- **Set up through the API, act through the UI, check both.** Only the flow under test goes through the browser.
  After the toast, check that the change was really saved: reload, or read it back through the API or the CDN.
- **A toast proves little when the same message just appeared** (two saves in a row, three folders): the wait can
  match the previous one. Confirm the result instead: the new row in the list, or `expect.poll` on the API.
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
