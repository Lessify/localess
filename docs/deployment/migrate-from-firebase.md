# Migrating from a Firebase Install

> Related: [Deployment Overview](overview.md) · [Docker](docker.md) · [Updates & Backups](updates.md)

Localess used to run on Firebase (Firestore, Storage, Auth, Functions, Hosting). The self-hosted
server can copy a Firebase-era install with `import:firebase`. The authoritative description is
[server/README.md → Migrating from a Firebase install](../../server/README.md#migrating-from-a-firebase-install);
this page is the operator's procedure.

## What is copied

| From | To | Notes |
|------|----|-------|
| Firestore documents | Postgres rows | **Same ids**, so public API URLs, API tokens and SDK caches keep working |
| Storage: asset originals | The storage directory | ETags stay the same |
| Storage: published content and translation JSON | Postgres | Copied as served, not re-published — a published snapshot can legitimately differ from the current draft |
| Auth users | `users` | With role, permissions and lock state |
| Password hashes | Credentials | Only with the project's hash parameters (step 2). Re-hashed to argon2id at each user's first sign-in |

Not copied: tasks and their files (temporary export artifacts), and Google/Microsoft identities —
those users are linked by verified email on their first OAuth sign-in (configure the providers
first, see [Configuration](configuration.md#sign-in)). A user whose email already belongs to another
account in the new install (for example an admin you created before importing) is skipped and
reported.

Every write is an upsert, so the import can be run any number of times: once to rehearse, again
right before the switch to pick up what changed in between.

## Procedure

### 1. Stand up the new install

Deploy Localess as described in [Docker](docker.md), with the same OAuth, translation and SMTP
settings you need. You do **not** need `LOCALESS_ADMIN_EMAIL` — the imported admins come with the
import, and an admin created beforehand with the same email as an imported one would block that
user.

### 2. Credentials for the source project

1. Create a **service account key** for the Firebase project with read access to Firestore, Storage
   and Authentication (for example the *Firebase Admin SDK Administrator Service Agent* role) and
   point `GOOGLE_APPLICATION_CREDENTIALS` at the key file.
2. In the Firebase console → *Authentication → Users → ⋮ → Password hash parameters*, copy the
   values into:

   | Variable | Console field |
   |----------|---------------|
   | `FIREBASE_SCRYPT_SIGNER_KEY` | `base64_signer_key` |
   | `FIREBASE_SCRYPT_SALT_SEPARATOR` | `base64_salt_separator` |
   | `FIREBASE_SCRYPT_ROUNDS` | `rounds` |
   | `FIREBASE_SCRYPT_MEM_COST` | `mem_cost` |

   With them, users keep their passwords. Without them, password users must reset their password
   (by email if SMTP is configured, otherwise via an admin-issued link).

These are read by the CLI only; the server does not need them.

### 3. Rehearse

```bash
npm run localess -- import:firebase --project <firebase-project-id> [--bucket <bucket>] [--no-files]
```

- `--bucket` — only if the project's Storage bucket is not the default one.
- `--no-files` — skip Storage for a quick, data-only rehearsal.

In Docker, mount the key file into the container and pass the variables, for example:

```bash
docker compose run --rm \
  -v /path/to/key.json:/secrets/key.json:ro \
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/key.json \
  -e FIREBASE_SCRYPT_SIGNER_KEY=… -e FIREBASE_SCRYPT_SALT_SEPARATOR=… \
  -e FIREBASE_SCRYPT_ROUNDS=… -e FIREBASE_SCRYPT_MEM_COST=… \
  localess node server/dist/cli.js import:firebase --project <firebase-project-id>
```

The report lists counts per kind and every item that was skipped, with the reason. Then check the
new install: sign in with an existing account, open a few spaces, and compare some public API URLs
between the old and the new host.

### 4. Cut over

1. Freeze edits in the old install.
2. Run the import again — it picks up the delta.
3. Switch DNS (or your reverse proxy) to the new install.
4. Keep the Firebase project, read-only, for a while as a rollback.

After the switch, `cv` values in public API URLs change once (they are now database versions rather
than Storage generations); clients follow one extra redirect and carry on. Put a CDN in front of
`/api/v1` — the Firebase CDN is gone ([Production](production.md#a-cdn-in-front-of-apiv1)).

## Behaviour changes to expect

A few things work differently after the move (the full list is in the
[migration roadmap](../roadmap/firebase-to-nestjs-postgres.md#progress-log)):

- **Sign-in:** Google and Microsoft use a redirect instead of a popup. Microsoft requires a tenant.
  OAuth no longer creates accounts unless `LOCALESS_AUTH_AUTO_REGISTER=true`.
- **Role changes** take effect on the user's next request (no token refresh wait).
- **Admin → Users** has no "Sync" any more; it has "Copy password reset link".
- **Public API:** drafts always exist and reflect current schemas; `GET /links?parentSlug=blog` no
  longer includes sibling folders sharing the prefix (`blog-archive`).
- **Content and assets:** content slugs must be unique per space; asset folders cannot be moved
  (files can); the fallback locale cannot be deleted.
