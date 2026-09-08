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
npm run setup:firebase                               # or pick from a list / create a new one
```

Every step is idempotent. If a run fails halfway, fix the cause and re-run — completed work is
detected and skipped.

---

## Options

| Flag | Default | Purpose |
|------|---------|---------|
| `--project <id>` | — | Adopt an existing project. Omit to pick from a list of your projects. |
| `--display-name <name>` | `Localess` | Display name when creating a project. |
| `--region <region>` | existing Firestore location, else **asked** | Region for **Firestore, Storage and Cloud Functions**. Partly immutable — see below. |
| `--billing-account <id>` | — | Billing account to link. Required with `--yes`. |
| `--google-support-email <email>` | — | Also provision Google sign-in. |
| `--yes` | `false` | Never prompt; fail instead. For automation - requires `--project` and `--billing-account`. |

One region drives all three services. Localess uses gen-2 Cloud Functions triggers, which must be
co-located with the Firestore database and Storage bucket they listen to, so splitting them apart
produces functions that deploy but never fire.

> **`--region` is permanent for Firestore and Storage.** Neither the database nor the default
> bucket can be moved after creation — changing your mind means a new project. The Functions
> region *can* be changed later by editing `LOCALESS_REGION` in `.env.<project-id>` and
> redeploying, but moving it away from the data is exactly the split described above.

Omit `--region` and setup asks for it — zone first (Europe, United States, Asia…), then the
exact region within that zone. Only the 40 regions where **all three** services exist are
offered; the list lives in `scripts/setup/regions.mjs`. The Firestore multi-regions (`eur3`,
`nam5`) are deliberately excluded — Cloud Functions has no multi-region equivalent to pair
them with.

Passing an unsupported `--region` is not a hard failure: setup says why and asks instead. Under
`--yes` it exits, since it cannot ask.

Linking billing has cost implications, so an automated run (`--yes`) must name the account
explicitly with `--billing-account` rather than have one chosen for it.

### Re-running setup

```bash
npm run setup:firebase -- --project <project-id>
```

Every step is idempotent, so this doubles as a health check: it reports what already exists,
provisions anything missing, and regenerates `.env.<project-id>`, `functions/.env.<project-id>`
and `src/environments/firebase-config.json` from the live project.

Setup provisions infrastructure only — it never ships the application. It finishes by asking
whether to deploy, defaulting to **no**; `--yes` skips the question and does not deploy.

You do not need to pass `--region` again. When a Firestore database already exists its location
is read back and used for everything, because that location is immutable and therefore the
authoritative answer. Passing a `--region` that disagrees with it is an error rather than a
silent rewrite — otherwise re-running setup on a project provisioned outside Europe would
quietly point Functions away from its own data.

Re-running also redeploys the `auth` block from `firebase.json`, which is how sign-in providers
stay in sync.

---

## What it provisions

In order:

```
1.  Preflight        firebase-tools present and >= 15.29.0, CLI authenticated
2.  Project          adopt --project, or pick from a list / create one
3.  Billing          link a billing account, then wait for it to become active
4.  APIs             enable 15 APIs
5.  Firestore        adopt the existing location, or ask and create in --region
6.  Storage          create and link the default bucket in --region
7.  Web app          register a "Localess" web app
8.  Authentication   deploy the firebase.json `auth` block
9.  Hosting          create the site (normally already present)
10. Local config     write .env.<project-id>, firebase-config.json, functions/.env.<project-id>
11. Mark project     label it localess-managed with the version
12. Offer deploy     ask whether to run `npm run deploy` (defaults to no)
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

### Interactive prompts

**Any parameter you do not pass is asked for.** Pass it and the matching prompt is skipped, so
the same command works interactively and in a script.

Run without `--project` and setup lists every project your Firebase account can see, plus a
`Create a new project...` entry at the end of the list. Above twelve projects the list becomes
filterable — start typing to narrow it.

Projects Localess already knows about are sorted to the top and annotated with the version
that provisioned them:

```
❯ Localess Production (localess-prod)  — local config · Localess 4.0.0
  Localess Staging (localess-staging)  — Localess 4.0.0
  Stale (stale-config)                 — local config · no Localess marker
  Unrelated (unrelated-app)
```

Two independent signals combine:

| Annotation | Meaning |
|------------|---------|
| `local config` | A `.env.<project-id>` for it exists on **this machine** |
| `Localess <version>` | The live project carries the `localess-version` label |
| `Localess web app` | No label, but a web app named `Localess` exists (older projects) |
| `no Localess marker` | Configured here, but the live project shows no sign of Localess |
| `could not verify` | The remote lookup failed |

Local config is never trusted on its own — it can be stale if the project was deleted or
rebuilt elsewhere — so it is always cross-checked against the live project. Equally, a project
carrying the label is shown even when this machine has never configured it, which is what makes
the list useful after a fresh clone.

The labels for every project arrive in a single Cloud Resource Manager call, so annotating the
whole list costs one request rather than one per project.

Run without `--region`, on a project that has no Firestore database yet, and setup asks for the
zone and then the region.

Creating a project prompts for an id and a display name. The id is validated against Google's
rules (6–30 characters, lowercase letters, digits and hyphens, starting with a letter) before
anything is sent, so a typo is caught in the prompt rather than by a failed API call.

If billing is not yet enabled, setup lists your open billing accounts and asks which to link.
It never picks one for you — linking billing has cost implications.

`--yes` disables every prompt for automation. It then requires `--project` and, if billing is
not already enabled, `--billing-account`.

If you pick a project with no sign of Localess, setup stops and asks before touching it,
listing what cannot be undone — enabling billable APIs, and creating a Firestore database and
Storage bucket whose locations are permanent. It defaults to no. A project already carrying the
marker skips the question.

Ctrl-C at any prompt exits cleanly; every step is idempotent, so re-running resumes.

### How a project is recognised

Setup labels the project it provisions, using the same mechanism Firebase uses for its own
`firebase: enabled` label:

| Label | Value |
|-------|-------|
| `localess-managed` | `true` |
| `localess-version` | the Localess version that provisioned it, e.g. `4-0-0` |

Labels are visible in the Google Cloud console and survive a fresh clone, which local
`.env.<project-id>` files do not. Older projects predate the label and are recognised instead by
a web app named `Localess`, which is weaker — setup only names an app when it creates one, so a
project that already had a web app never got it. Re-running setup adds the label.

Setting labels is best-effort: if it fails, setup still succeeds and you get the confirmation
prompt next time.

### Generated files

All of these are gitignored. Setup and deploy never modify a tracked file, so `git pull`
from upstream never conflicts with your deployment.

| File | Written by | Contents |
|------|-----------|----------|
| `.env.<project-id>` | setup | Your deployment decisions. The only file you edit by hand. |
| `src/environments/firebase-config.json` | deploy | Web SDK config, fetched with `apps:sdkconfig` |
| `src/environments/env.ts` | build | Generated from `LOCALESS_*` by `prebuild:prod` |
| `functions/.env.<project-id>` | setup + deploy | `REGION=<region>`, read by `functions/src/index.ts` |
| `firebase.<project-id>.json` | deploy | `firebase.json` with the `/api/v1/**` rewrite region applied |

The filename of `.env.<project-id>` is authoritative for the project id. Keep as many as
you have projects and select between them with `--project`.

`npm install` writes placeholder versions of `firebase-config.json` and `env.ts` if they
are missing, so a fresh clone builds before you have ever deployed.

The Functions region goes in `functions/.env.<project-id>`, not `functions/.env`.
firebase-tools loads `.env` first and then `.env.<project-id>`, so the per-project file
wins — two configured projects cannot overwrite each other's region.

That leaves plain `functions/.env` free for values shared by every project, which is where
the `DEEPL_API_KEY` and `UNSPLASH_API_KEY` that `functions/src` reads belong.

> **Setup and deploy only ever write the `.env.<project-id>` of the project they were run
> for.** `functions/.env`, other projects' files and any environment file you maintain by
> hand are never read, rewritten or deleted. Everything they generate is gitignored, so no
> key can be committed.

---

## How it works

The modules under `scripts/`:

| File | Responsibility |
|------|----------------|
| `scripts/setup-firebase.mjs` | Orchestrator — argument parsing, the 10 steps, reporting |
| `scripts/setup/firebase-cli.mjs` | Documented `firebase <command>` calls, spawned as child processes |
| `scripts/setup/firebase-gaps.mjs` | The steps that have **no** CLI command |
| `scripts/setup/firebase-tools.mjs` | Locates the global firebase-tools, enforces the minimum version |
| `scripts/setup/config.mjs` | The `.env.<project-id>` format and project resolution |
| `scripts/setup/generate.mjs` | Turns a config into `firebase.<id>.json` and `functions/.env.<id>` |
| `scripts/setup/prompts.mjs` | Interactive pickers and input validation |
| `scripts/setup/regions.mjs` | Regions where Firestore, Storage and Functions all exist |
| `scripts/setup/markers.mjs` | How a project is recognised as Localess-managed |
| `scripts/deploy.mjs` | The `npm run deploy` orchestrator |

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
