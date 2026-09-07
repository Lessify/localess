# Phase 1 — Firebase Setup

> Related: [Deployment Overview](overview.md) · [First Deploy](first-deploy.md) · [Billing & Cost](../billing.md)

## Overview

`npm run setup:firebase` provisions everything Localess needs in a Firebase/GCP project. It
replaces the manual console walkthrough (project creation, Identity Platform, Firestore, Storage,
service accounts, API enablement) with one idempotent command.

```bash
npm install
npx firebase login                                   # once per machine

npm run setup:firebase -- --project my-localess      # adopt an existing project
npm run setup:firebase                               # or create a new one (prompts for an id)
```

Every step is idempotent. If a run fails halfway, fix the cause and re-run — completed work is
detected and skipped.

---

## Options

| Flag | Default | Purpose |
|------|---------|---------|
| `--project <id>` | — | Adopt an existing project. Omit to create a new one. |
| `--display-name <name>` | `Localess` | Display name when creating a project. |
| `--location <loc>` | `eur3` | **Firestore** location. Immutable. |
| `--region <region>` | `europe-west6` | Cloud Functions region. Written to `functions/.env`. |
| `--storage-location <loc>` | `--region` | Default Storage bucket location. Immutable. |
| `--billing-account <id>` | — | Billing account to link. Required with `--yes`. |
| `--google-support-email <email>` | — | Also provision Google sign-in. |
| `--yes` | `false` | Never prompt; fail instead. For automation. |

> **`--location` and `--storage-location` are permanent.** Firestore and the default Storage bucket
> cannot be moved after creation. Changing your mind means a new project. The defaults align with
> the `europe-west6` Functions region used throughout this codebase.

Linking billing has cost implications, so an automated run (`--yes`) must name the account
explicitly with `--billing-account` rather than have one chosen for it.

---

## What it provisions

In order:

```
1.  Preflight        firebase-tools present and >= 15.29.0, CLI authenticated
2.  Project          adopt --project, or create one
3.  Billing          link a billing account, then wait for it to become active
4.  APIs             enable 15 APIs
5.  Firestore        create the (default) database
6.  Storage          create and link the default bucket
7.  Web app          register a "Localess" web app
8.  Authentication   deploy the firebase.json `auth` block
9.  Hosting          create the site (normally already present)
10. Local config     write firebase-config.json and functions/.env
```

### Enabled APIs

`firebase deploy` auto-enables most Functions-related APIs, but not all — most importantly
`translate.googleapis.com`, which is only used at runtime by
`functions/src/services/translate.service.ts` and so is never ensured by any deploy.

```
firebase              firebasehosting        firebaserules
firestore             identitytoolkit        firebasestorage
firebaseextensions    cloudfunctions         cloudbuild
artifactregistry      run                    eventarc
pubsub                storage                translate
```

### Authentication

`firebase.json` carries an `auth` block, which `firebase deploy --only auth` sends to Google's
provisioning API:

```json
"auth": {
  "providers": {
    "emailPassword": true
  }
}
```

This initializes **Identity Platform** (required by the blocking functions in
`functions/src/users.ts`) and enables Email/Password. Passing `--google-support-email` adds a
`googleSignIn` entry to `firebase.json` before deploying; Google generates the OAuth client, so no
console visit is needed.

> Enabling the provider is only half of Google sign-in. The login UI reads
> `environment.auth.providers` (`src/app/auth/login/login.component.ts`), which is baked in at
> build time from `LOCALESS_AUTH_PROVIDERS`. See [First Deploy](first-deploy.md#build-time-configuration).

Microsoft sign-in needs an Azure app registration and must be configured in the Firebase console.

### Generated files

| File | Contents |
|------|----------|
| `src/environments/firebase-config.json` | Web SDK config, consumed by `src/environments/environment*.ts` |
| `functions/.env` | `REGION=<--region>`, read by `functions/src/index.ts` |

Both are tracked in git, so setup shows up as a diff. That is correct for a self-hoster; if you
also contribute upstream, avoid committing them.

> `functions/.env` is **not** gitignored, and `functions/src` also reads `DEEPL_API_KEY` and
> `UNSPLASH_API_KEY`. If you add those keys to that file, do not commit it.

---

## How it works

Three modules under `scripts/`:

| File | Responsibility |
|------|----------------|
| `scripts/setup-firebase.mjs` | Orchestrator — argument parsing, the 10 steps, reporting |
| `scripts/setup/firebase-cli.mjs` | Documented `firebase <command>` calls, spawned as child processes |
| `scripts/setup/firebase-gaps.mjs` | The steps that have **no** CLI command |
| `scripts/setup/firebase-tools.mjs` | Locates the global firebase-tools, enforces the minimum version |

### Why `firebase-gaps.mjs` exists

Three provisioning steps have no `firebase` command, verified against firebase-tools 15.29.0:

| Gap | Evidence |
|-----|----------|
| Enabling APIs | No `firebase services:enable` command exists |
| Linking billing | No `firebase billing:*` commands exist |
| Creating the default bucket | `lib/gcp/storage.js` only *reads* the bucket (`getDefaultBucket`) |

They are reached through firebase-tools' internals — `apiv2.Client` (an authenticated HTTP client
that carries the `cloud-platform` scope, see `lib/scopes.js`) and `ensureApiEnabled`. Those are not
public API, so they are confined to this one file: an upstream breaking change is a single-file fix,
and `firebase-tools.mjs` fails loudly if the installed version is older than the one this was
verified against.

Authentication is **not** in this file. Since 15.29.0 the `auth` block plus
`firebase deploy --only auth` covers Identity Platform and the providers, so it goes through the
normal CLI path.

### The auth bootstrap

`apiv2` keeps its refresh token in a module-level variable that only the CLI's own command wrapper
populates. Importing the internals standalone therefore fails with *"not yet authenticated"* even
when the user is logged in. `firebase-gaps.mjs` calls `requireAuth()` first, which also requests
the `cloud-platform` scope and falls back to application default credentials.

---

## Troubleshooting

### `Cloud billing quota exceeded`

Your billing account has hit its limit on linked projects. Either unlink a project you no longer
need, or request an increase at
<https://support.google.com/code/contact/billing_quota_increase>.

### `must be on the Blaze (pay-as-you-go) plan` right after billing was linked

A fresh billing link takes up to a minute to reach Service Usage. The script waits for billing to
report active and retries the Blaze-gated APIs, so this resolves itself. If it persists, verify the
link in the console.

### `Precondition check failed` (400)

A just-enabled API has not propagated. Retried automatically. The retry deliberately does *not*
apply when the response carries a concrete violation (`QuotaFailure`, `PreconditionFailure`,
`ErrorInfo`) — those are real failures and fail fast.

### `The caller does not have permission` creating the bucket

Almost always the Spark plan: new projects require Blaze for a default Storage bucket. Confirm
billing is active first.

### `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` (Windows)

The Firebase CLI intermittently aborts while tearing down its event loop, *after* the command has
already completed its work. Exit code `3221226505` (`0xC0000409`). Because every command used here
is idempotent, `firebase-cli.mjs` retries this specific code up to three times.

### `firebase-config.json already exists`

Handled: `apps:sdkconfig --out` refuses to overwrite, so the script writes a temp file and renames
it over the target — the same approach `cloudbuild.yaml` uses.

### A freshly created project is "not found"

`firebase projects:list` can lag minutes behind project creation. The script validates with
`firebase use` instead, which is authoritative.

---

## Next step

[Phase 2 — First Deploy](first-deploy.md)
