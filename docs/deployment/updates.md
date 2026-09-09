# Phase 3 — Pushing Updates

> Related: [Deployment Overview](overview.md) · [First Deploy](first-deploy.md) · [Publish Flow](../publish-flow.md)

## Overview

Routine redeploys after the environment already exists. The full cycle:

```bash
git pull
npm install
npm run localess:deploy
```

`LOCALESS_*` variables are baked in at build time, but you no longer have to re-supply them on
every build — `npm run localess:deploy` loads them from `.env.<project-id>`. Change a value there and
redeploy. See [Build-time configuration](first-deploy.md#build-time-configuration).

---

## Targeted deploys

A full deploy rebuilds every function image, which is the slow part. Narrow it to what changed:

| Changed | Command |
|---------|---------|
| Angular app only | `npm run localess:deploy -- --only hosting` |
| Cloud Functions only | `npm run localess:deploy -- --only functions` |
| A single function | `npm run localess:deploy -- --only functions:publicv1` |
| Security rules only | `npm run localess:deploy -- --only firestore:rules,storage` |
| Firestore indexes only | `npm run localess:deploy -- --only firestore:indexes` |
| Remote Config only | `npm run localess:deploy -- --only remoteconfig` |
| Everything except auth | `npm run localess:deploy -- --only hosting,functions,firestore,storage` |
| Everything (the default) | `npm run localess:deploy` |

`npm run localess:deploy` always rebuilds before uploading, so `--only hosting` is safe. Pass
`--skip-build` only when you deliberately want to upload whatever is already in
`dist/localess/browser`.

### About the `auth` target

`auth` is part of every deploy by default. It sends the `auth` block from `firebase.json` to
Google's provisioning API, which initializes Identity Platform and enables Email/Password.

This is deliberate: `npm run localess:setup` provisions infrastructure but never deploys, so
the provider would otherwise never be applied. It is idempotent — you will see "Enabling auth
providers" on every deploy, which is harmless. Skip it with `--only` if you want a faster push.

Localess provisions **email/password only**. Google and Microsoft sign-in are configured in the
Firebase console, and the login page will only show their buttons if `LOCALESS_AUTH_PROVIDERS`
in `.env.<project-id>` lists them at build time.

---

## Keeping local files in sync

The remote project is the source of truth; the local project files are a cache of it.
When they drift — someone changed something in the console, or you are on a fresh clone —
regenerate them without re-running provisioning:

```bash
npm run localess:sync
```

It picks a project from the same annotated list `deploy` uses, checks the `localess-managed`
label, and rewrites `.env.<project-id>`, `functions/.env.<project-id>`,
`firebase.<project-id>.json` and `src/environments/firebase-config.<project-id>.json` from the
live project, then copies the last of those to `firebase-config.build.json`, which is what the
production build swaps in.
It also corrects the `localess-region` label if the immutable Firestore location has drifted
from it.

**It preserves your hand-edited settings.** `LOCALESS_AUTH_CUSTOM_DOMAIN`,
`LOCALESS_AUTH_PROVIDERS`, `LOCALESS_LOGIN_MESSAGE` and `LOCALESS_UNSPLASH_ENABLE` cannot be
read back from the project, so an existing `.env.<project-id>` keeps whatever it already has.
Only when there is no local config at all do they start empty — and then sync says so, naming
the keys it defaulted.

`npm run localess:deploy` runs the same step before it builds, so a deploy can never quietly reset a
setting either.

---

## Choosing what to redeploy

| You changed | Redeploy |
|-------------|----------|
| `src/**` (Angular) | `hosting` |
| `functions/src/**` | `functions` |
| `firestore.rules`, `storage.rules` | `firestore:rules`, `storage` |
| `firestore.indexes.json` | `firestore:indexes` |
| `remoteconfig.template.json` | `remoteconfig` |
| `firebase.json` `auth` block | `auth` |
| `LOCALESS_*` values | rebuild, then `hosting` |
| `LOCALESS_REGION` in `.env.<project-id>` | `functions` **and** the `/api/v1/**` rewrite |

---

## After upgrading Localess

When a new Localess version introduces a new Firebase product or API, re-run phase 1 first:

```bash
npm run localess:setup -- --project my-localess
```

It is idempotent — it detects everything already provisioned and adds only what is missing. This is
the intended way to pick up new API requirements without hand-editing anything in the console.

Then deploy as usual. Check the release notes for migration steps; Firestore schema changes are not
handled by either phase.

---

## Deploying vs publishing

Two different things that are easy to confuse:

- **Deploying** (this document) ships *code, rules and configuration* to Firebase.
- **Publishing** converts *content and translations* in Firestore into static JSON in Storage so
  the public API can serve them. It happens from inside the running app.

A deploy never publishes content, and publishing never requires a deploy. See
[Publish Flow](../publish-flow.md) and [CDN & Caching](../cdn-caching.md).

---

## Rollback

Firebase Hosting keeps previous releases. Roll back the frontend from the console
(Hosting → Release history → Rollback), or preview a change before it goes live:

```bash
npx firebase hosting:channel:deploy preview --project <id>
```

Functions have no built-in rollback — redeploy from a previous commit:

```bash
git checkout <previous-tag>
npm run localess:deploy -- --only functions,hosting
```

Firestore rules and indexes are versioned in the console and can be reverted there, but the source
of truth is this repository — prefer redeploying from a known-good commit.

---

## Cost awareness

Every functions deploy runs Cloud Build and stores images in Artifact Registry, both of which are
billable. Frequent full deploys are the most common source of surprise cost in a self-hosted
Localess. Prefer targeted deploys, and see [Billing & Cost](../billing.md) for cleanup of old
Artifact Registry images.
