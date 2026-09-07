# Phase 3 — Pushing Updates

> Related: [Deployment Overview](overview.md) · [First Deploy](first-deploy.md) · [Publish Flow](../publish-flow.md)

## Overview

Routine redeploys after the environment already exists. The full cycle:

```bash
git pull
npm install
npm --prefix functions install     # only if functions dependencies changed
npm run build:prod
npx firebase deploy --project my-localess
```

Remember that `LOCALESS_*` variables are baked in at build time — re-supply them on every build, or
the login page and plugin flags silently revert to defaults. See
[Build-time configuration](first-deploy.md#build-time-configuration).

---

## Targeted deploys

A full deploy rebuilds every function image, which is the slow part. Narrow it to what changed:

| Changed | Command |
|---------|---------|
| Angular app only | `npx firebase deploy --only hosting --project <id>` |
| Cloud Functions only | `npx firebase deploy --only functions --project <id>` |
| A single function | `npx firebase deploy --only functions:publicv1 --project <id>` |
| Security rules only | `npx firebase deploy --only firestore:rules,storage --project <id>` |
| Firestore indexes only | `npx firebase deploy --only firestore:indexes --project <id>` |
| Remote Config only | `npx firebase deploy --only remoteconfig --project <id>` |
| Everything except auth | `npx firebase deploy --only hosting,functions,firestore,storage --project <id>` |

`--only hosting` still needs a fresh `npm run build:prod` first; Firebase uploads whatever is in
`dist/localess/browser`.

### About the `auth` target

Because `firebase.json` contains an `auth` block, a bare `firebase deploy` includes it and logs
"Enabling auth providers" every time. This is idempotent and harmless. Use `--only` to skip it.

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
| `--region` in `functions/.env` | `functions` **and** the rewrite in `firebase.json` |

---

## After upgrading Localess

When a new Localess version introduces a new Firebase product or API, re-run phase 1 first:

```bash
npm run setup:firebase -- --project my-localess
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
npm install && npm --prefix functions install
npm run build:prod
npx firebase deploy --only functions,hosting --project <id>
```

Firestore rules and indexes are versioned in the console and can be reverted there, but the source
of truth is this repository — prefer redeploying from a known-good commit.

---

## Cost awareness

Every functions deploy runs Cloud Build and stores images in Artifact Registry, both of which are
billable. Frequent full deploys are the most common source of surprise cost in a self-hosted
Localess. Prefer targeted deploys, and see [Billing & Cost](../billing.md) for cleanup of old
Artifact Registry images.
