# Deployment Overview

> Related: [Firebase Setup](firebase-setup.md) · [First Deploy](first-deploy.md) · [Updates](updates.md) · [Billing & Cost](../billing.md)

## Overview

Self-hosting Localess has three distinct phases. They are separated because they have different
frequencies, different prerequisites, and different failure modes:

| Phase | How often | Command |
|-------|-----------|---------|
| [1. Provision Firebase](firebase-setup.md) | Once per environment | `npm run localess:setup` |
| [2. First deploy](first-deploy.md) | Once per environment | `npm run localess:deploy` |
| [3. Push updates](updates.md) | Every change | `npm run localess:deploy -- --only ...` |

Phase 1 creates cloud *resources*. Phases 2 and 3 push *code and configuration* into those
resources. Phase 1 never has to be repeated, but it is safe to re-run — every step detects
existing state and skips.

### The three commands

All three are subcommands of one CLI (`scripts/localess.mjs`); the npm scripts are aliases.

| Command | Owns |
|---------|------|
| `npm run localess:setup` | Provisioning infrastructure and recording the project markers |
| `npm run localess:sync` | Regenerating the local project files from remote state |
| `npm run localess:deploy` | Building and shipping the application |

**Setup never deploys.** It enables services and records what it did; applying configuration
and pushing code is deploy's job. Setup offers to run a deploy when it finishes, but only if
you say yes.

**Deploy only touches projects Localess manages.** It refuses any project that does not carry
the `localess-managed` label, so a mistyped project id cannot install a CMS over something
unrelated. See [how a project is recognised](firebase-setup.md#how-a-project-is-recognised).

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js 24 | `package.json` pins `engines.node: 24` |
| `firebase-tools` >= 15.29.0 | Global install: `npm install -g firebase-tools@latest` |
| A logged-in CLI | `npx firebase login` (once per machine) |
| A Google Cloud **billing account** | Blaze is mandatory — see below |

`firebase-tools` is deliberately **not** a project dependency. `@angular/fire` declares
`peerOptional firebase-tools@^14.0.0`, so adding v15 would force every `npm install` to run with
`--legacy-peer-deps`. The setup script locates the global install and version-gates it instead.

### Why Blaze is mandatory

Localess cannot run on the Spark (free) plan:

- **Cloud Functions** — the whole backend (`functions/src`) is Cloud Functions.
- **Identity Platform** — `functions/src/users.ts` uses `beforeUserCreated` / `beforeUserSignedIn`
  blocking functions, which only exist on Identity Platform.
- **Cloud Storage** — new projects require Blaze to create a default bucket.
- **Cloud Translation** — `translate.googleapis.com` cannot be enabled on Spark.

Blaze still has a generous free tier; see [Billing & Cost](../billing.md).

---

## What is automated vs manual

The setup script removes almost all console clicking. What remains:

| Task | Automated? |
|------|-----------|
| Create project, link billing, enable APIs | Yes |
| Firestore database, Storage bucket, Hosting site, web app | Yes |
| Identity Platform + Email/Password | Yes — the API at setup, the provider at first deploy |
| **Google sign-in** | No — console only |
| **Create a billing account** (card entry) | No — console only |
| **Raise the billing project quota** | No — requires a request to Google |
| **Microsoft sign-in** | No — needs an Azure app registration |
| **Custom Hosting domain** | No — console + DNS verification |

In practice: **zero** console visits if you already have a billing account with room, **one** if
you do not.

---

## Two deployment models

This documentation covers **local deploy**: an operator runs the commands from a checkout on their
own machine. That is the supported path for self-hosting.

`cloudbuild.yaml` describes the alternative — a Cloud Build trigger wired to a Git repository,
which performs the same steps in CI. It duplicates phases 2 and 3, plus its own API enablement
step. If you use Cloud Build, phase 1 is still required; only the push phases move into CI.
