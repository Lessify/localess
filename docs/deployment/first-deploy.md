# Phase 2 — First Deploy

> Related: [Deployment Overview](overview.md) · [Firebase Setup](firebase-setup.md) · [Updates](updates.md)

## Overview

After [phase 1](firebase-setup.md) the cloud resources exist but are empty. This phase builds the
Angular app and pushes code, rules and configuration into them, then creates the first admin user.

```bash
npm --prefix functions install     # Cloud Functions dependencies
npm run version:generate           # writes src/assets/version.json
npm run build:prod
npx firebase deploy --project my-localess
```

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

> This is the most common first-deploy surprise. Provisioning Google sign-in in phase 1 enables it
> in the *backend*; the button only appears if `LOCALESS_AUTH_PROVIDERS` includes `GOOGLE` at build
> time. `src/app/auth/login/login.component.ts` derives `isGoogleAuthEnabled` /
> `isMicrosoftAuthEnabled` from that string.

Because these are build-time values, changing them requires a rebuild and redeploy — not just a
config change in the console.

### 4. Deploy

```bash
npx firebase deploy --project my-localess
```

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

The `/api/v1/**` path is a Hosting rewrite to the `publicv1` function in `europe-west6`. If the
region in `functions/.env` does not match the rewrite in `firebase.json`, the rewrite cannot resolve
the function and every API request fails — so keep the two in sync.

---

## Next step

[Phase 3 — Pushing Updates](updates.md)
