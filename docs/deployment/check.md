# Checking an Installation

> Related: [Deployment Overview](overview.md) · [Firebase Setup](firebase-setup.md) · [First Deploy](first-deploy.md) · [Updates](updates.md)

## Overview

```bash
npm run localess:check -- --project <project-id>
```

Reports what a Localess installation is still missing, across everything setup provisions,
everything deploy pushes, and whether anybody can actually administer the result. Omit
`--project` and you get the same annotated picker `deploy` and `sync` use.

Read-only by default. Exit code is **0** when nothing is missing and **1** otherwise, so it
works as a CI gate or a pre-deploy sanity check.

```
Infrastructure
  + Billing           Blaze plan active
  + Required APIs     15/15 enabled
  + Firestore         (default) in europe-west6
  + Storage bucket    localess-setup-test.firebasestorage.app
  + Storage CORS      1 rule
  + Web app           1:445907840924:web:ec91e44506d7daa513a259
  + Hosting site      localess-setup-test
  + Project labels    Localess 4.0.0 in europe-west6
  + Region agreement  europe-west6
  + Local files       5/5 present

Deployment
  + Functions         29 across 13 groups
  x Invoker bindings  14 of 16 reject unauthenticated calls: content-publish, setup, ...
  + Email sign-in     email/password enabled

Application
  x Admin user        no accounts exist yet

2 problems, 1 fixable automatically.
```

---

## It does not require the marker

`deploy` and `sync` refuse a project without the `localess-managed` label. `check` deliberately
does not: an absent label is one of the fourteen things it reports, so gating on it would hide
the finding you came for. This is the only place in the CLI where the marker is a subject rather
than a precondition.

---

## Three statuses, not two

| Mark | Meaning | Affects exit code |
|------|---------|-------------------|
| `+` | Established as present | no |
| `x` | Established as missing | **yes — exit 1** |
| `?` | Could not be read | no |

`?` is distinct on purpose. A 403 from the Cloud Run IAM API means the account lacks a role, not
that your callables are closed — reporting the second would send you chasing a problem that is
not there, and `--fix` must never act on it. It is the same rule `getBucketCors` already follows
by returning `null` rather than `[]`.

`?` does not fail the exit code: turning a gap in the *checker's* permissions into a red CI build
would punish the wrong thing. Only a fact actually established is worth failing on.

---

## What is checked

### Infrastructure — what `setup` creates

| Check | Missing means |
|-------|---------------|
| Billing | No billing account linked; nothing on Blaze will work |
| Required APIs | One of the 15 is off — see [required APIs](first-deploy.md#required-apis) |
| Firestore | No `(default)` database |
| Storage bucket | No default bucket |
| Storage CORS | The bucket has no rules; browser asset downloads fail |
| Web app | No app, so there is no SDK config to build against |
| Hosting site | Nothing to serve the bundle from |
| Project labels | One of `localess-managed` / `-version` / `-region` is absent |
| Region agreement | The label, `.env.<id>` or `functions/.env.<id>` disagrees with the live Firestore location |
| Local files | One of the five generated files is absent |

Region agreement is worth the extra row because the copies drift independently — the label is
written by setup, `.env.<id>` by sync, `functions/.env.<id>` by generate — and a disagreement is
silent until Functions end up pointed at a region their own data is not in. The live Firestore
location wins, because it is the only copy that cannot be changed.

### Deployment — what `deploy` pushes

| Check | Missing means |
|-------|---------------|
| Functions | An exported group from `functions/src/index.ts` has nothing deployed |
| Invoker bindings | A callable rejects unauthenticated calls (see below) |
| Email sign-in | The email/password provider is off; nobody can sign in |

**Functions are checked at group level, not function level.** `index.ts` exports thirteen grouped
objects (`export const asset = { ondelete }`), which Firebase flattens into `asset-ondelete` with
the entry point `asset.ondelete`. A group's members are only knowable by compiling `functions/`,
and a check that needed a build would not get run — so this catches a whole group vanishing, which
is what a partially failed first deploy actually does. It does not catch one missing sibling
inside a group.

### Application

| Check | Missing means |
|-------|---------------|
| Admin user | No account carries the `role: admin` custom claim |

Identity Platform cannot filter on custom claims, so this scans the first 500 accounts. A project
with more accounts than that and no admin among them reports `?`, not `x` — the answer is
genuinely unknown, and a large user base is where a false alarm would be least credible.

`--fix` creates this one — see [Creating the first admin](#creating-the-first-admin).

---

## Invoker bindings

The finding most worth having, because nothing else surfaces it.

Gen-2 Firebase functions are Cloud Run services. A callable is reachable from a browser only when
`allUsers` holds `roles/run.invoker` on its service, and firebase-tools binds that in the function
**create** path only. A function created during a deploy that failed partway is *updated* rather
than created on every subsequent run — reported as "skipped, no changes detected" — so it never
acquires the binding. Every unauthenticated call returns 403 while the deploy keeps reporting
success, and the whole CMS is unreachable from the browser on a project whose every cloud resource
exists.

Only `callableTrigger` and `httpsTrigger` functions are checked. Event and blocking triggers are
invoked by Google's own service agents, so making them public would widen access for no reason.

---

## `--fix`

```bash
npm run localess:check -- --project <project-id> --fix
```

Applies only the repairs that are **free and reversible**:

| Repair | What it runs |
|--------|--------------|
| Required APIs | `ensureRequiredApis` — the same call setup and deploy make |
| Storage CORS | `ensureBucketCors` — read-only rules, and only onto an empty configuration |
| Project labels | Writes the three markers |
| Local files / region | A full `syncLocalFiles`, propagating the live Firestore location everywhere |
| Invoker bindings | Adds `allUsers` to `roles/run.invoker`, preserving every other binding |
| Admin user | Prompts for credentials, then creates the account, its admin claim and its documents |

Everything else is reported with the command that does it, because it is not safe to do as a side
effect of a check:

| Not fixed here | Why |
|----------------|-----|
| Billing | Spends money. Setup refuses to pick an account for you for the same reason. |
| Firestore database, Storage bucket | Fix a location that can never be changed |
| Missing functions, email sign-in | Need a deploy |

After applying repairs, `--fix` re-reads everything and prints the report again. A repair can fail
on a permission the operator lacks, and reporting a fix that did not land would be worse than not
offering one.

Two findings can share one repair — a stale region label and absent local files are both cured by
a single sync — so the repairs are deduplicated before they run.

### Repairs run in dependency order

`FIX_ORDER` in `checks.mjs` is a correctness constraint, not a preference. The invoker bindings
must be repaired **before** the admin user: creating the admin calls the `setup` callable, and a
callable without its `allUsers` binding is unreachable. On a freshly deployed project both are
missing, so one `--fix` fixes the bindings and then immediately uses them.

Relying on the order the checks happen to be declared in would make that an accident of layout, so
it is written down and tested.

---

## Creating the first admin

The only repair that is **not idempotent** — it creates an account — and the only one that prompts.

```bash
npm run localess:check -- --project <project-id> --fix
```

```
[3] Creating the first admin user
  Admin email: you@example.com
  Admin password: ******
  Confirm password: ******
  Display name: Admin
    + you@example.com created with the admin role
```

Three calls: create the Identity Platform account, set its `role: admin` custom claim, then a
single Firestore commit writing both the `users/{uid}` document and the seeded `Hello World`
space. The commit is atomic, so the two documents arrive together or not at all.

Nothing is retried. None of these failures are transient, and account creation is the one
call in the CLI whose repetition cannot be undone. Because the three steps span three
different Google APIs they are not atomic with each other: a failure after the account exists
says so explicitly, naming the account, and is recoverable — the account can sign in, and
`user.sync` backfills its document.

It does not depend on the deployed backend at all, so it works on a project whose functions
failed to deploy — which is exactly the project this command exists to diagnose.

### Non-interactive

| Source | Value |
|--------|-------|
| `--admin-email <email>` | The address |
| `LOCALESS_ADMIN_PASSWORD` | The password |
| `--admin-name <name>` | Display name (defaults to `Admin`) |

**There is deliberately no `--admin-password`.** A password in argv lands in the shell history and
is readable from the process list by every other user on the machine. The environment variable is
the only way to supply it without a prompt.

With no terminal and no supplied credentials, `--fix` skips this repair and names what it was
missing rather than hanging on a masked prompt nobody can answer. Every other repair still runs.

---

## Why the CLI creates the admin

`npm run localess:check -- --fix` is the only way to create the first administrator.

There used to be a `setup` Cloud Function behind a web wizard at `/setup`. It could not
require authentication — no account exists yet to authenticate against — and its only guard
was whether an admin had already been created. Once its `allUsers` invoker binding was in
place, which the wizard required, anyone who knew the project id could claim the
administrator account on a freshly deployed project. An unauthenticated `POST {"data":{}}`
returned `200`.

It was removed rather than hardened. A public endpoint whose purpose is to grant
administrative access cannot be made safe by rate-limiting it, and the CLI already did the
job.

The CLI path also fixes a defect the callable had: `beforeUserCreated` writes the
`users/{uid}` Firestore document, but it does not fire for accounts created through the
Identity Platform admin API — which is how the callable created the admin. The first admin
therefore never appeared in Admin → Users until somebody ran the `user.sync` callable. The
CLI writes that document itself, including the `role` field the blocking function cannot see.
