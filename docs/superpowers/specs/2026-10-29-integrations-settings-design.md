# Integrations in Admin → Settings — design

Date: 2026-10-29. Status: draft for review.

## Intent

Localess talks to outside services: DeepL and Google Cloud Translation for machine translation, Unsplash for stock
photos in Assets, and more to come. Today each one is switched on only by environment variables read once at boot
(`apps/server/src/infra/config/config.ts`), so turning one on means editing `.env` and restarting.

The people installing Localess range from someone following the instructions step by step without understanding
them (home labs, experiments) to very experienced operators. For the first group, environment variables are a
barrier. The goal is that an admin can connect an integration from the UI, by pasting a key, with no server access
and no restart. The experienced operator keeps configuring everything through the environment, and the UI shows
plainly that it did so.

## Goals

- An admin connects, tests, replaces and disconnects integrations from **Admin → Settings → Integrations**.
- Environment variables keep working exactly as today and always win.
- Changes apply at once on every instance and in every open browser, with no restart and no reload.
- Mistakes are caught before they are saved, and explained in plain words with a link to the fix.
- Adding a future integration is one definition plus one server class, with no new Angular code and no migration.

## Non-goals

- Space-level integrations: there is one configuration per installation, managed by admins only.
- Moving other env-only settings (SMTP, OAuth providers, instance label) into the UI. The Settings page leaves room
  for them later.
- OAuth-style "Sign in with …" integrations. The generic card would need extending for those.
- An external secret vault (KMS, Vault).

## Anti-goals (a failure even if it works)

- An expert's `.env` silently overridden or ignored.
- A saved key readable again by anyone, through the UI, the API or the logs.
- Losing the encryption secret breaks anything other than the saved integration keys.
- A beginner left with a raw `424` or a stack trace instead of what to do.

## Decisions

### 1. Precedence: environment, then UI, then off

For each integration, the environment wins when its env var(s) are set. The card then shows
"🔒 Server configuration", names the variable(s), and is fully read-only: no key field, no Replace, no Disconnect,
and the on/off switch is locked on. The card says: "Set by `DEEPL_API_KEY` in the server environment. Edit it there
and restart to change it." "Test connection" is still offered.

When the env var is later removed, a key saved earlier in the UI takes over after the restart. Nothing is ever
copied from the environment into the database.

**What locks a card:** locking is per integration, never per field. Each definition names its **lock variable(s)**:
the env var(s) whose presence means "configured by the environment". It's DeepL `DEEPL_API_KEY`, Google
`GOOGLE_CLOUD_PROJECT`, and Unsplash `UNSPLASH_API_KEY`. Only an explicitly set variable counts; a zod default
doesn't. When an integration is locked, all of its values come from the environment, including optional ones like
`LOCALESS_GOOGLE_TRANSLATE_LOCATION`. When it isn't locked, all of its values come from the UI. There's no mixing.
`GOOGLE_APPLICATION_CREDENTIALS` alone, without `GOOGLE_CLOUD_PROJECT`, locks nothing, as today. *(Builder-check
answer; my call.)*

### 2. Storage: one row per integration; keys are write-only

New table `integration_settings`, added by a Drizzle migration (edit `schema.ts`, run `db:generate`; it runs on boot):

| Column | Meaning |
|---|---|
| `id` | Integration id: `deepl`, `google-translate`, `unsplash`, … (primary key) |
| `enabled` | The admin's on/off switch |
| `secrets` | Encrypted blob holding all of the integration's fields as one JSON object |
| `hints` | Non-secret display data: the last 4 characters of each secret field, `text` field values |
| `status` | `verified`, `unverified` (saved without testing), `rejected`, `quota` |
| `status_message` | Last provider error in plain words (for `rejected` and `quota`) |
| `status_at` | When the status last changed |
| `updated_at`, `updated_by` | Audit: who saved it and when |

Install-wide settings that aren't secret live in a second small structure. The primary translation provider (see 6)
is the only one for now; a key-value `app_settings` table or an extra row is left to the builder.

A saved secret is **never** returned to the browser: there's no "reveal". The API returns only the hint
(`••••3f9a`). To change a key, the admin replaces it. Admins only: `@RequireRole(ADMINS)` on every endpoint,
`roleGuard(ADMINS)` on the route.

### 3. Encryption at rest

- AES-256-GCM over the `secrets` JSON, with a random IV per write and the integration id as associated data.
- The secret comes from `LOCALESS_SECRET_KEY`. If unset, it's read from `$LOCALESS_DATA_DIR/secret.key`. If that's
  missing, it's generated on boot (32 random bytes, mode `0600`) and written there.
- In Docker the data dir is already the persistent `/data` volume (`Dockerfile`, `docker-compose.yml`), which also
  holds assets, so the secret survives restarts without new setup. In the Compose setup Postgres has its own volume,
  so a database backup doesn't contain the secret.
- If the secret can't decrypt a row (lost volume, several instances with different generated secrets), only that
  integration is affected. Its card shows "The saved key can't be read on this server. Enter it again, or set
  `LOCALESS_SECRET_KEY` so it survives restarts." The integration counts as off.
- Keys never appear in logs, error messages, change events or `/api/config`.
- The docs say what this protects against (a leaked database dump or backup, database-only access) and what it
  doesn't (full control of the server, which is the same as `.env` today). They also say to back up `secret.key`
  separately from the database.

### 4. Live changes

- A new `IntegrationService` (server) is the only place that answers "is X on, and with what values?" It merges
  env, then database, then off, and caches the result in memory.
- Saving, disconnecting, a status change or a primary-provider change publishes a change event through the existing
  `EventService` (`pg_notify` on `localess_events`), with `spaceId: null` and entity `integrations`. Every instance
  drops its cache when the event arrives.
- The web app listens on the existing SSE stream. On an `integrations` event it re-reads `GET /api/config`, so
  Translate buttons and the Unsplash picker appear or disappear without a reload. The event has to reach every
  signed-in user, not only admins; it carries no secret.
- `TranslateService` and `UnsplashService` ask `IntegrationService` for each request instead of reading `APP_CONFIG`.
  Provider clients (the DeepL `Translator`, the Google client) are rebuilt when their values change.

### 5. Test before saving

"Test & enable" makes one cheap, real call before anything is saved:

| Integration | Test call | Shown on success |
|---|---|---|
| DeepL | `GET /v2/usage` | Free/Pro plan, characters used of the monthly limit |
| Google Cloud Translation | Translate "hello" to one language | Project id (read from the service-account JSON) |
| Unsplash | `GET /photos?per_page=1` | Demo (50/h) vs Production (5,000/h) from `X-RateLimit-Limit`, with an "Apply for Production" link when Demo |

The outcomes are:

- **Rejected key (401/403) or incomplete setup** (for example the Cloud Translation API isn't enabled): nothing is
  saved. A plain message names the cause and links to the fix ("copy the Access Key, not the Secret Key", "Enable it
  in Google Cloud, wait a minute, test again").
- **Provider unreachable** (timeout, DNS, blocked outgoing traffic): the admin gets **Try again** or **Save without
  testing**. A key saved without testing has status `unverified`, and the card shows "Not verified" until the first
  real call succeeds.

After saving, real editor requests keep the status current:

- **An auth failure** (revoked or invalid key) sets `rejected` with the reason. The admin card shows "Key rejected",
  and its **Test** button re-checks.
- **A quota failure** (for example DeepL's monthly limit, or Unsplash's hourly limit) sets the lighter `quota` status.
  The card shows "Quota reached", since these reset on their own.
- **The integration stays on in both cases.** `/api/config` keeps reporting it, so buttons don't vanish for everyone
  after one failure.
- **The next successful real call** clears `rejected`, `quota` and `unverified` back to `verified`.
- **Status is only written, and an event only published, when the status actually changes.** A successful call on
  an already-verified integration costs nothing.
- **Machine translation falls back on failure:** when the primary fails with an auth, quota or unreachable error and
  the other provider is connected and supports the pair, the request is retried there (decision 6).
- **Editors never see raw `424`s.** When nothing could serve the request, they see "Unsplash is unavailable. Ask an
  admin to check Admin → Settings → Integrations."

Env-configured integrations can be tested too. The result is shown but changes nothing.

### 6. Translation providers: primary plus automatic fallback

- When both DeepL and Google are connected, the admin picks the **primary** with a two-option switch above the
  translation cards. The switch only appears when both are connected. It replaces today's silent "DeepL wins". Until
  an admin picks, DeepL stays the default.
- New env var `LOCALESS_TRANSLATE_PRIMARY` (`deepl` | `google`). When it's set, the switch is locked and shows
  "🔒 Server configuration", like the cards (decision 1). When it isn't set, the switch works in the UI, whether the
  providers come from env, from the UI, or one from each.
- Each translation goes to the primary when it supports the language pair, and to the other provider otherwise.
  When the primary fails with an auth, quota or unreachable error, the request is retried on the other provider if
  it supports the pair (decision 5).
- Fallback is on whenever both providers are connected. That includes installs where both come from env, which
  until now called only DeepL. They will start sending Google the pairs DeepL can't handle, so this change goes in
  the upgrade notes (`docs/deployment/updates.md`) together with `LOCALESS_TRANSLATE_PRIMARY`.
- `/api/config` reports which source and target locales can be translated by the connected providers combined.
  `apps/web/src/app/core/services/locale.service.ts` uses that list instead of the hard-coded Google lists, so
  Translate buttons only appear where a provider will accept them. This also fixes today's DeepL-only installs
  showing Translate for locales DeepL rejects.
- `LOCALESS_TRANSLATE_PROVIDER=stub` keeps working for development and tests, and overrides everything.

### 7. Adding an integration: one definition, generated form

Each integration is a definition in `packages/shared` and a provider class in the server:

```ts
// packages/shared
export const UNSPLASH: IntegrationDefinition = {
  id: 'unsplash',
  category: 'assets', // groups cards: 'translation', 'assets', …
  name: 'Unsplash',
  description: 'Pick free stock photos straight into Assets',
  helpUrl: 'https://unsplash.com/oauth/applications',
  lockEnv: ['UNSPLASH_API_KEY'], // set → the card is env-locked (decision 1)
  fields: [{ key: 'apiKey', label: 'Access Key', type: 'secret', env: 'UNSPLASH_API_KEY' }],
};

// apps/server
class UnsplashIntegration implements IntegrationProvider {
  test(values): Promise<IntegrationTestResult>; // success details, or a plain-words failure + fix link
}
```

- Field types: `secret` (stored encrypted, shown only as a hint), `text` (stored and shown), and `file` (a pasted or
  dropped file, stored encrypted).
- `lockEnv` names the variable(s) that lock the card. `env` on a field names where that field's value comes from
  when the card is locked (decision 1).
- One generic Angular card component renders every integration from its definition. A new integration needs no
  Angular code.
- The three definitions to start with:
  - **DeepL:** `apiKey` (secret, `DEEPL_API_KEY`).
  - **Google Cloud Translation:**
    - `serviceAccount` (file, JSON). The project id is taken from the JSON. The environment equivalent stays
      `GOOGLE_CLOUD_PROJECT` plus Application Default Credentials; when `GOOGLE_CLOUD_PROJECT` is set, the card is
      locked.
    - `location` (text, default `global`, `LOCALESS_GOOGLE_TRANSLATE_LOCATION`).
  - **Unsplash:** `apiKey` (secret, `UNSPLASH_API_KEY`). `LOCALESS_UNSPLASH_API_URL` stays env-only.

### 8. Screens and navigation

- A new **Settings** item in the Admin sidebar (`adminSideMenu` in `features.component.ts`), route
  `/features/admin/settings`. Integrations is its first section.
- The Integrations page groups cards by category ("Machine translation", "Assets"). Each card shows a logo, name,
  one-line description, a status badge, and the on/off switch where allowed.
- Card states:

  | State | Badge | Card shows |
  |---|---|---|
  | Off | Not connected | **Connect** expands the generated form, with "How do I get one?" from `helpUrl` and **Test & enable** |
  | Env | 🔒 Server configuration | Variable name(s), Test connection |
  | Connected | Connected | Hint (`••••3f9a`), saved by/when, Test, Replace, Disconnect, switch |
  | Unverified | Not verified | As Connected |
  | Rejected | Key rejected | The reason, Test, Replace key (still on) |
  | Quota | Quota reached | The reason, Test (still on; clears on the next success) |
  | Unreadable | Key unreadable | The secret message from decision 3, Enter again |

- Disconnect asks for confirmation and deletes the row, including the secret. Turning the switch off keeps the key.
- Both mockups shown during the conversation (the card states and the test results) are the visual reference. They
  are not pixel specs; the build uses the existing Spartan/Helm components.

### 9. Health check, docs, tests

- **`pnpm localess:check`:** reports each integration as env, UI, UI (not verified), key rejected, key unreadable, or
  off. It warns when `secret.key` was generated in a data dir that may not persist.
- **Docs:**
  - `docs/deployment/configuration.md`: integrations can be set in the UI, env wins, `LOCALESS_SECRET_KEY`.
  - `docs/deployment/docker.md` and `updates.md`: keep `/data` persistent, back up `secret.key` separately.
  - `apps/server/.env.example`: add `LOCALESS_SECRET_KEY` and `LOCALESS_TRANSLATE_PRIMARY`.
  - `docs/deployment/updates.md`: an upgrade note that installs with both translation providers in env now fall back
    to Google for pairs DeepL can't handle.
  - New `docs/features/admin/settings.md`, plus a row in the CLAUDE.md docs table.
- **Server tests:**
  - Precedence (env, then database, then off).
  - Encryption round-trip, and a wrong or missing secret giving "unreadable" with nothing else broken.
  - No secret in any response or event.
  - Admin-only access.
  - The lock rule (lock variables only, no mixing, defaults don't count).
  - Fallback routing by locale and on primary failure, plus `LOCALESS_TRANSLATE_PRIMARY`.
  - Test outcomes (rejected, unreachable, save-without-testing).
  - Status transitions from real calls (rejected, quota, back to verified), with an event only when the status
    changes.
- **e2e:** connect, test, disconnect, and the env-locked card, with providers stubbed so CI never calls real APIs.

## Left to the builder

- Module placement and names, following `docs/server/` rules. For example, an `integrations` module with a
  controller, service and repository, and with the existing `plugins` module and `shared/services/translate.service.ts`
  consuming it.
- Exact endpoint shapes under `/api/app/admin/integrations`, and request models (`zX`) in `@localess/shared`.
- How provider errors are classified (auth vs quota vs unreachable) for each SDK.
- Where the primary-provider choice is stored.
- Wording of messages, beyond the meaning given above.
