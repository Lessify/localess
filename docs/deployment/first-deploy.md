# Phase 2 — First Deploy

> Related: [Deployment Overview](overview.md) · [Firebase Setup](firebase-setup.md) · [Updates](updates.md)

## Overview

After [phase 1](firebase-setup.md) the cloud resources exist but are empty. This phase builds the
Angular app and pushes code, rules and configuration into them, then creates the first admin user.

```bash
npm run localess:deploy
```

That one command picks a project, checks it is one Localess manages, regenerates the local
project files from the live project, installs, builds and deploys. The rest of this page
explains what it does and how to configure it.

Two things it will refuse to do:

- **Deploy to a project without the `localess-managed` label.** A mistyped project id would
  otherwise install a CMS over something unrelated. If deploy refuses, adopt the project first
  with `npm run localess:setup -- --project <id>` — setup is idempotent and will not change
  existing infrastructure.
- **Deploy without asking.** It prints the project, region and targets and defaults to **no**.
  Pass `--yes` to skip the question, which requires `--project`.

You do **not** need a local `.env.<project-id>` to deploy. If one is missing it is regenerated
from the live project, and the four hand-edited settings start empty with a warning naming
them.

---

## Step by step

### 1. Install Functions dependencies

```bash
npm --prefix functions install
```

`functions/` is a separate npm package with its own `package.json`. The root `npm install` does not
cover it.

You do **not** need to compile functions yourself — `firebase.json` declares:

```json
"functions": {
  "predeploy": "npm --prefix functions run build",
  "source": "functions"
}
```

so `firebase deploy` runs `tsc` for you.

### 2. Generate version metadata

```bash
npm run version:generate
```

Writes `src/assets/version.json` with the version from `package.json`, the build date, and
`COMMIT_SHA` / `GITHUB_SHA` if present (otherwise `local-build`). Optional — the file is committed,
so a stale one only means stale version metadata in the UI.

### 3. Build for production

There are two production builds, and the difference matters:

| Command | Firebase config it compiles against |
|---------|-------------------------------------|
| `npm run build:prod` | The tracked `demo-localess-dev` placeholder |
| `npm run build:deploy` | `src/environments/firebase-config.build.json`, written by sync for the selected project |

```bash
npm run build:deploy
```

`npm run localess:deploy` and `cloudbuild.yaml` both use `build:deploy`. Use `build:prod` only to check
that a production build compiles — **its output points at the demo project and must not be
deployed by hand.** `build:deploy` fails loudly if `firebase-config.build.json` is absent, so
you cannot accidentally get a demo build out of it.

The swap happens through the `deploy` configuration in `angular.json`, which is why that
configuration also repeats the `environment.prod.ts` replacement: combining configurations is a
shallow override, so `production,deploy` would otherwise drop it. A test in
`scripts/localess/build-config.test.mjs` guards that.

Output goes to `dist/localess/browser`, which is what `firebase.json` serves as `hosting.public`.

### Build-time configuration

The `LOCALESS_*` settings are **compile-time constants**, inlined into the bundle by esbuild
through Angular's `define` builder option. There is no generated source file: the identifiers
are declared in `src/environments/build-constants.d.ts` and read directly by
`environment.prod.ts`.

Defaults live in the production configuration in `angular.json`, so a build with no overrides
always works:

| Constant | Default | Example |
|----------|---------|---------|
| `LOCALESS_REGION` | `europe-west6` | `us-central1` |
| `LOCALESS_AUTH_PROVIDERS` | empty — login page shows Email/Password only | `GOOGLE,MICROSOFT` |
| `LOCALESS_AUTH_CUSTOM_DOMAIN` | empty — no custom auth domain restriction | `auth.example.com` |
| `LOCALESS_LOGIN_MESSAGE` | empty — no message on the login page | `Welcome to Localess` |
| `LOCALESS_UNSPLASH_ENABLE` | empty — Unsplash plugin disabled | `true` |

`npm run localess:deploy` overrides them per project, reading `.env.<project-id>` and passing each one
as a `--define` flag:

```bash
npm run build:deploy -- --define LOCALESS_REGION=\"us-central1\" --define LOCALESS_LOGIN_MESSAGE=\"Welcome\"
```

You do not normally do this by hand — put the values in `.env.<project-id>` and let
`npm run localess:deploy` assemble the flags. Because they are passed as arguments rather than read from
the environment, a stale exported shell variable cannot change what gets built.

Note this is *not* `import.meta.env`. Angular uses Vite only for the dev server; production
builds go through esbuild, which has no `.env` file support. `define` is the Angular-native
equivalent, and it constant-folds — `LOCALESS_UNSPLASH_ENABLE === 'true'` is resolved to a
literal at build time and the dead branch is dropped.

> `LOCALESS_REGION` sets the Functions region in four places at once: `functions/.env.<project-id>`, the
> `/api/v1/**` Hosting rewrite, the Angular client's callable region, and the Cloud Build
> `_REGION` substitution. Firestore and Storage must be in the same region — Localess uses
> gen-2 triggers, which have to be co-located with the resource they listen to.

> This is the most common first-deploy surprise. Enabling Google sign-in in the Firebase console
> enables it in the *backend*; the button only appears if `LOCALESS_AUTH_PROVIDERS` includes
> `GOOGLE` at build time. `src/app/auth/login/login.component.ts` derives `isGoogleAuthEnabled` /
> `isMicrosoftAuthEnabled` from that string.

Because these are build-time values, changing them requires a rebuild and redeploy — not just a
config change in the console.

### 4. Deploy

```bash
npm run localess:deploy
```

Omit `--project` and you get the same annotated picker setup uses, minus the create option.

| Flag | Effect |
|------|--------|
| `--project <id>` | Skip the picker |
| `--only <targets>` | Override the default targets (see below) |
| `--skip-install` | Reuse the installed `node_modules` |
| `--skip-build` | Reuse `dist/localess/browser` |
| `--dry-run` | Regenerate the local files, print the build and deploy commands, stop |
| `--yes` | Skip the confirmation. Requires `--project`. |

By default it pushes `hosting,functions,storage,firestore,auth` — the same set as
`cloudbuild.yaml`, so a local deploy and a CI deploy do the same thing. `auth` is included
because setup no longer provisions Identity Platform: setup enables the service, deploy applies
the configuration.

One target is excluded on purpose:

| Target | Why it is excluded |
|--------|--------------------|
| `remoteconfig` | Would overwrite console-side edits on every deploy |

Push it explicitly when you need to: `npm run localess:deploy -- --only remoteconfig`.

An unknown target is rejected before anything is touched, so a typo costs nothing.

Deploy never modifies a tracked file: it runs against a generated
`firebase.<project-id>.json` via the CLI's `--config` flag, so `git status` stays clean.

A bare `deploy` covers every target configured in `firebase.json`:

| Target | What is pushed |
|--------|----------------|
| `auth` | Identity Platform providers (idempotent — runs on every deploy) |
| `firestore` | `firestore.rules` and `firestore.indexes.json` |
| `storage` | `storage.rules` |
| `functions` | `functions/` — compiled by the predeploy hook |
| `hosting` | `dist/localess/browser` + headers and rewrites |
| `remoteconfig` | `remoteconfig.template.json` |

The first functions deploy is the slowest part: Cloud Build has to build container images for every
function.

### 5. Create the first admin user

Open:

```
https://<project-id>.web.app/setup
```

This is a Localess feature, not a Firebase one — `functions/src/setup.ts` creates the account and
grants it `role: admin` via `setCustomUserClaims`. It only works while no users exist.

---

## Verifying the deploy

| Check | How |
|-------|-----|
| App loads | `https://<project-id>.web.app` |
| Public API responds | `https://<project-id>.web.app/api/v1/...` — see [V1 API](../v1-functions-api.md) |
| Functions deployed | `npx firebase functions:list --project <id>` |
| Blocking functions registered | Firebase console → Authentication → Settings → Blocking functions |
| Logs | `npx firebase functions:log --project <id>` |

The `/api/v1/**` path is a Hosting rewrite to the `publicv1` function. Both the rewrite and
`functions/.env.<project-id>` are generated from the same `LOCALESS_REGION`, so they cannot drift apart — if
they did, the rewrite could not resolve the function and every API request would fail.

---

## Next step

[Phase 3 — Pushing Updates](updates.md)
