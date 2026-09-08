# Phase 2 — First Deploy

> Related: [Deployment Overview](overview.md) · [Firebase Setup](firebase-setup.md) · [Updates](updates.md)

## Overview

After [phase 1](firebase-setup.md) the cloud resources exist but are empty. This phase builds the
Angular app and pushes code, rules and configuration into them, then creates the first admin user.

```bash
npm run deploy
```

That one command reads `.env.<project-id>`, fetches the SDK config from the live project,
generates `functions/.env.<project-id>` and `firebase.<project-id>.json`, installs, builds and deploys.
The rest of this page explains what it does and how to configure it.

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

```bash
npm run build:prod
```

Output goes to `dist/localess/browser`, which is what `firebase.json` serves as `hosting.public`.

### Build-time configuration

`build:prod` first runs `prebuild:prod`, which is
`ng g @lessify/angular-tools:set-env --prefix LOCALESS`. That regenerates
`src/environments/env.ts` from `LOCALESS_*` environment variables, and `environment.prod.ts` reads
it.

**These values are baked into the bundle at build time.** Unset means empty:

| Variable | Effect when unset | Example |
|----------|-------------------|---------|
| `LOCALESS_REGION` | Cloud Functions region; falls back to `europe-west6` | `us-central1` |
| `LOCALESS_AUTH_PROVIDERS` | Login page shows Email/Password only | `GOOGLE,MICROSOFT` |
| `LOCALESS_AUTH_CUSTOM_DOMAIN` | No custom auth domain restriction | `auth.example.com` |
| `LOCALESS_LOGIN_MESSAGE` | No message on the login page | `Welcome to Localess` |
| `LOCALESS_UNSPLASH_ENABLE` | Unsplash plugin disabled | `true` |

```bash
LOCALESS_AUTH_PROVIDERS=GOOGLE \
LOCALESS_LOGIN_MESSAGE="Welcome" \
LOCALESS_UNSPLASH_ENABLE=true \
npm run build:prod
```

You do not normally set these by hand — put them in `.env.<project-id>` and `npm run deploy`
loads them for you. The config file wins over anything already exported in your shell, so a
stale variable cannot silently change what gets built.

> `LOCALESS_REGION` sets the Functions region in four places at once: `functions/.env.<project-id>`, the
> `/api/v1/**` Hosting rewrite, the Angular client's callable region, and the Cloud Build
> `_REGION` substitution. Firestore and Storage must be in the same region — Localess uses
> gen-2 triggers, which have to be co-located with the resource they listen to.

> This is the most common first-deploy surprise. Provisioning Google sign-in in phase 1 enables it
> in the *backend*; the button only appears if `LOCALESS_AUTH_PROVIDERS` includes `GOOGLE` at build
> time. `src/app/auth/login/login.component.ts` derives `isGoogleAuthEnabled` /
> `isMicrosoftAuthEnabled` from that string.

Because these are build-time values, changing them requires a rebuild and redeploy — not just a
config change in the console.

### 4. Deploy

```bash
npm run deploy
```

Reads `.env.<project-id>`, fetches the SDK config from the live project, generates
`functions/.env.<project-id>` and `firebase.<project-id>.json`, builds, and deploys. With several
projects configured, pass `--project <id>`.

| Flag | Effect |
|------|--------|
| `--project <id>` | Choose between configured projects |
| `--only <targets>` | Override the default targets (see below) |
| `--skip-install` | Reuse the installed `node_modules` |
| `--skip-build` | Reuse `dist/localess/browser` |
| `--dry-run` | Generate the artifacts, print the deploy command, stop |

By default it pushes `hosting,functions,storage,firestore` — the same set as
`cloudbuild.yaml`, so a local deploy and a CI deploy do the same thing. Two targets are
excluded on purpose:

| Target | Why it is excluded |
|--------|--------------------|
| `auth` | Provisioning, owned by `npm run setup:firebase` |
| `remoteconfig` | Would overwrite console-side edits on every deploy |

Push either explicitly when you need to: `npm run deploy -- --only remoteconfig`.

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
