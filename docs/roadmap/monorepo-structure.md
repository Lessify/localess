# Repository structure: npm workspaces monorepo

**Status:** In progress (branch `refactor/monorepo-structure`, stacked on `feat/self-hosted-nestjs-postgres`)
· **Recorded:** 2026-10-09

## Why

After the Firebase migration the repository has three code roots (`src/`, `server/`, `libs/ui/`) and some
problems that make it hard to find things:

1. Domain types are defined twice (`src/app/shared/models` and `server/src/domain/models`) and have drifted.
2. The server is organised by API surface (`app-api/`, `public-api/`, `domain/lib/`), so one feature is spread
   over three or four folders; infrastructure (`database`, `storage`, `mail`) sits next to features.
3. The frontend `shared/` folder mixes app-wide state and API services with reusable UI.
4. Build output (`src/scripts/sync-v1.js`) is committed inside the Angular source; `scripts/` mixes repo tooling
   with product code; `api-docs/` sits at the root for one code generator.

## Target

```
localess/
├── apps/
│   ├── web/                    # @localess/web — Angular app
│   │   └── src/app/
│   │       ├── core/           # app-wide singletons: stores, API services, interceptors, guards
│   │       ├── shared/         # reusable UI only: components, pipes, directives, validators
│   │       ├── auth/
│   │       └── features/       # admin, spaces/*, me — each owns its single-use services
│   └── server/                 # @localess/server — NestJS
│       ├── drizzle/
│       └── src/
│           ├── infra/          # config, database, storage, mail, events, static, health
│           ├── auth/           # sessions, OAuth, guards, permissions, users
│           ├── modules/<feature>/   # service + app controller + public controller + feature logic
│           └── cli/            # commands, check, firebase-import, bootstrap
├── packages/
│   ├── shared/                 # @localess/shared — types, zod schemas, enums, permissions, locales
│   ├── ui/                     # @localess/ui — Spartan/Helm, imported as @spartan-ng/helm/*
│   └── visual-editor-sync/     # @localess/visual-editor-sync — sync-v1 source, built into web assets
├── tools/                      # repo tooling: version bump, locale flags, OpenAPI specs
├── docs/
└── package.json                # workspaces: apps/*, packages/*
```

Rules:

- **"What does feature X do?"** → `apps/server/src/modules/X/` and `apps/web/src/app/features/**/X/`.
- **"What is X?"** (type, enum, validation rule, permission) → `packages/shared`, defined once.
- Root `package.json` has no runtime dependencies; each workspace declares its own.
- Root scripts keep working (`npm start`, `npm run build`, `npm test`, `npm run server:*`, `npm run localess`).

## Phases

| # | Phase | Status |
|---|---|---|
| A | npm workspaces; move `src` → `apps/web`, `server` → `apps/server`, `libs/ui` → `packages/ui`, sync-v1 → `packages/visual-editor-sync`, scripts → `tools/`; one lockfile; Dockerfile, CI, docs paths | Done |
| B | `packages/shared`: one definition of domain models, zod schemas, permissions and locales; server and web import it | Done |
| C | Server: `infra/`, `auth/`, `modules/<feature>/`, `cli/` | |
| D | Web: `core/` (state, API, guards) vs `shared/` (reusable UI); single-use services move into their feature | |
| E | Repository map in README and CLAUDE.md; docs paths | |

Every phase ends green: web build + lint + tests, server build + tests, `test:scripts`.

## Progress log

### Phase A — workspaces and moves (2026-10-09)

- Root `package.json` is a workspace root only (`apps/*`, `packages/*`), with no dependencies; the Angular
  dependencies moved to `apps/web/package.json`. One `package-lock.json` (the server's own lockfile is gone).
  Root scripts delegate with `-w`, so every command in CLAUDE.md still runs from the root.
- `angular.json` and `components.json` stay at the repo root with the project rooted at `apps/web`: Angular
  only copies assets from inside its workspace root, and `circle-flags` lives in the hoisted root `node_modules`.
  The web build now outputs to `apps/web/dist/browser`; the server's default `LOCALESS_STATIC_DIR` follows.
- `packages/visual-editor-sync` builds `dist/sync-v1.js` with tsup (byte-identical to the file that used to be
  committed in `src/scripts/`); Angular copies it to `/scripts/sync-v1.js`. Root `start`, `build*` and `test`
  build it first.
- Tailwind's automatic source detection used to scan the whole repository; `styles.css` now adds
  `@source` for `packages/ui`. The stylesheet lost 19 utility classes that only existed because words in docs,
  comments and server code looked like class names — none is used by a template.
- ESLint: the `.eslintignore` rules moved into `ignorePatterns`; `parserOptions.project` is
  `apps/web/tsconfig.app.json` (lint runs from the workspace root).
- Dockerfile: both stages copy every workspace manifest (required by `npm ci`); the runtime stage installs
  `--omit=dev --workspace @localess/server` only. Simulated without Docker (production install, boot from the
  image layout): health, SPA deep links, `/scripts/sync-v1.js`, admin login and `check` pass.
- npm 11 warns that install scripts aren't covered by `allowScripts`; they still run (embedded Postgres
  symlinks and the ffmpeg binary are present). No allowlist added.

### Phase B — `packages/shared` (2026-10-09)

- `@localess/shared` holds the domain contract: every model (asset, content, schema, space, task, token, translate,
  translation, user, webhook, locale, open-api), `permissions.ts` (`canPerform`, `canGrant`, `canManageUser`),
  `locales.ts` (Google/DeepL allow-lists and `AVAILABLE_LOCALES`) and `extractContent`. Zod validators are a separate
  entry point, `@localess/shared/zod`, so the web bundle never pulls in zod (verified: no zod in `dist`).
- The models describe the JSON wire format: every entity has `id`, timestamps are ISO strings
  (`Timestamp = string`). The server's Firestore-era copies had no `id` and `Date` timestamps; its row mappers now
  keep `id`, and the `Date` → string difference is only a cast (rows serialise to the same JSON).
- Drift resolved while merging: webhook `TranslationWebHookPayloadData` (server shape kept), task import `type`,
  asset metadata `pages`/`hasAlpha`, `UserUpdate` (no `id`: it's in the URL). Two names meant different things:
  the MANAGE API body is now `TranslationManageUpdate` / `zTranslationManageUpdateSchema`; `TranslationUpdate`
  is the App API's label/description edit. The web's `TRANSLATION_DEFAULT_LOCALE` is `DEFAULT_LOCALE`.
- Removed duplicates: the server's second `UserPermission` enum (in `auth/permissions.ts`), three copies of the V1
  token permission list, the web's copy of the Google locale lists (and the parity test that compared them),
  the web's `extractContent` (it now gets the server's legacy `schema` fallback too).
- The web's `shared/models/*.model.ts` keep only UI helpers (icons, labels, sort functions, form shapes);
  `space`, `task`, `user` and `webhook` model files are gone. Imports of contract types go straight to
  `@localess/shared` (161 web files, 45 server files).
- Build wiring: the server references the package (`tsc -b` builds `packages/shared/dist` first) and depends on it
  as a workspace package; its vitest config aliases it to source. The web app maps it to source with tsconfig
  `paths`. CI runs `npm run shared:test`; the Docker runtime stage copies `packages/shared/dist`.
- zod: the server and the shared package each get zod 4.6.5 (the root has 4.3.6 from the Angular CLI), so there
  are two zod instances at runtime. Harmless as long as the server only calls `.safeParse` on shared schemas —
  the one place that wrapped a shared schema in a server `z.object` (space templates) moved into shared as
  `zSchemaTemplateSchema`.
- Verified: shared 32 tests; server type-check, 51 files / 811 tests (4 files moved to shared); web build, lint,
  178 files / 1571 tests; `test:scripts` 48; simulated image boot (health, login, v1 token check).

