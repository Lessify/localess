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
| B | `packages/shared`: one definition of domain models, zod schemas, permissions and locales; server and web import it | |
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

