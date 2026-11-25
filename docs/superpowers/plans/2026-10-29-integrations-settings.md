# Integrations in Admin → Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins connect, test, replace and disconnect DeepL, Google Cloud Translation and Unsplash from Admin → Settings → Integrations. Keys are stored encrypted in Postgres. Environment variables still win and lock the card. Changes apply live on every instance and in every browser.

**Architecture:**
- **Shared contract.** One definition per integration in `@localess/shared` (`INTEGRATIONS`) drives the server's env lock, storage, test and the web's generated form.
- **Server.** `IntegrationService` (server `shared/`) resolves each integration: env first, then the encrypted `integration_settings` row, then off. It caches the result, clears it on `integrations` change events, and records real-call outcomes. `TranslateService` and `UnsplashService` ask it on every request. A new admin-only `IntegrationModule` serves `/api/app/admin/integrations`.
- **Web.** The web app re-reads `/api/config` on the event and renders one generic card per definition.

**Tech Stack:** NestJS 12, Drizzle (Postgres), `node:crypto` (AES-256-GCM), zod 4, `deepl-node`, `@google-cloud/translate`, Angular 22 + Spartan/Helm, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-integrations-settings-design.md`

## Global Constraints

- **Precedence:** env, then UI, then off, per integration. Lock variables:
  - `deepl`: `DEEPL_API_KEY`
  - `google-translate`: `GOOGLE_CLOUD_PROJECT`
  - `unsplash`: `UNSPLASH_API_KEY`
- **Env-locked integrations:** all values come from env, there's no mixing, and a zod default never counts as "set".
- **Secrets never leave the server:** they're never returned, logged, put in an error message, a change event or `/api/config`. Responses carry only `hints` (the last 4 characters of a secret, `text` values as-is).
- **Encryption:** AES-256-GCM with a random 12-byte IV per write and AAD = the integration id. The key is the SHA-256 of
  the secret. The secret is `LOCALESS_SECRET_KEY` (min 32 chars), else `$LOCALESS_DATA_DIR/secret.key`, else generated
  there on boot (32 random bytes, base64, file mode `0600`).
- **Admin only:** `@RequireRole(ADMINS)` on every `/api/app/admin/integrations` route, and `roleGuard(ADMINS)` on `/features/admin/settings`.
- **Change events:** `{ spaceId: null, entity: 'integrations', op }`. Every role receives them, and they carry no values.
- **Status:**
  - Statuses are `verified`, `unverified`, `rejected` and `quota`, plus `unreadable`, which is computed when the row can't be decrypted and never stored.
  - Status is recorded only for UI-sourced integrations, and only written (with an event) when it changes.
  - `rejected` and `quota` leave the integration on.
- **Translation routing:** the primary handles a pair it supports, otherwise the other provider does. The other provider is also used when the primary fails with `auth`, `quota` or `unreachable`. The primary comes from `LOCALESS_TRANSLATE_PRIMARY`, then the UI choice, then `deepl`. `LOCALESS_TRANSLATE_PROVIDER=stub` overrides everything.
- **Editor-facing messages (exact copy):**
  - Unsplash `424`: `Unsplash is unavailable. Ask an admin to check Admin → Settings → Integrations.`
  - Translate `424`: `Machine translation is unavailable. Ask an admin to check Admin → Settings → Integrations.`
  - Translate `412`: `Machine translation is not set up. Ask an admin to connect DeepL or Google in Admin → Settings → Integrations.`
- **Server rules:** follow `docs/server/` (layers, naming, `zX` in `@localess/shared`, entities in `shared/entities/`, declared return types). `apps/server/test/architecture.test.ts` must stay green.
- **Builds:** one build or e2e run at a time (small machine). After code changes: `pnpm build`, `pnpm lint:fix`, `pnpm prettier:fix`.
- **Commits:** as `alexcibotari <alexandru.cibotari@gmail.com>`, no `Co-Authored-By`, and only when the user has asked for commits.

## Review Focus

1. **A server whose data dir isn't writable** (read-only container, no volume) and has no `LOCALESS_SECRET_KEY`. The server must still boot. Integrations saved in the UI are refused with a clear message, and env integrations keep working. Pinned in Task 2.
2. **Two instances with different generated secrets** share one database. The instance that can't decrypt shows `unreadable` and treats the integration as off. It doesn't crash, doesn't overwrite the row on read, and the other instance keeps working. Pinned in Task 3.
3. **A Google service-account JSON** that's malformed, is the wrong JSON (an OAuth client file), or lacks `project_id`/`private_key`. This is a `400` with a plain message before any network call, never a `500`. Pinned in Task 4.
4. **The primary out of quota mid-batch** (a Translate Locale task with many chunks). Later chunks go to the other provider, and the status goes to `quota` once, not once per chunk. Pinned in Task 5.
5. **An admin saves while editors have the app open.** Translate buttons and the Unsplash picker appear or disappear without a reload, including for Viewer/Translator roles on the global stream. Pinned in Task 7 (server event access) and Task 8 (web reload).

---

### Task 1: Shared contract — definitions, models, request schemas, public config

**Files:**
- Create: `packages/shared/src/models/integration.model.ts`
- Create: `packages/shared/src/models/integration.zod.ts`
- Test: `packages/shared/src/models/integration.zod.test.ts`
- Modify: `packages/shared/src/index.ts`, `packages/shared/src/zod.ts` (exports)
- Modify: `packages/shared/src/models/app-config.model.ts` (`translate`)

**Interfaces:**
- Produces:
  - `type IntegrationId = 'deepl' | 'google-translate' | 'unsplash'`
  - `type IntegrationCategory = 'translation' | 'assets'`
  - `interface IntegrationField { key: string; label: string; type: 'secret' | 'text' | 'file'; env?: string; default?: string; optional?: boolean; accept?: string }`
  - `interface IntegrationDefinition { id: IntegrationId; category: IntegrationCategory; name: string; description: string; helpUrl: string; lockEnv: string[]; fields: IntegrationField[] }`
  - `const INTEGRATIONS: readonly IntegrationDefinition[]`, plus `integrationDefinition(id): IntegrationDefinition`
  - `type IntegrationStatus = 'verified' | 'unverified' | 'rejected' | 'quota' | 'unreadable'`
  - `type IntegrationSource = 'env' | 'ui' | 'none'`
  - `interface Integration { id: IntegrationId; source: IntegrationSource; enabled: boolean; envVars: string[]; hints: Record<string, string>; status?: IntegrationStatus; statusMessage?: string; statusAt?: string; updatedAt?: string; updatedBy?: string }`
  - `interface IntegrationTestResult { ok: boolean; reason?: 'auth' | 'quota' | 'setup' | 'unreachable' | 'invalid'; message: string; details?: string; fixUrl?: string }`
  - `type TranslatePrimary = 'deepl' | 'google-translate'`
  - `interface IntegrationList { integrations: Integration[]; translatePrimary: { value: TranslatePrimary; source: 'env' | 'ui' | 'default' } }`
  - Zod schemas:
    - `zIntegrationSave = { values: Record<string,string>, skipTest?: boolean }`, type `IntegrationSave`
    - `zIntegrationTest = { values?: Record<string,string> }`, type `IntegrationTest`
    - `zIntegrationEnabledUpdate = { enabled: boolean }`, type `IntegrationEnabledUpdate`
    - `zTranslatePrimaryUpdate = { value: 'deepl' | 'google-translate' }`, type `TranslatePrimaryUpdate`
  - `PublicAppConfig.translate` becomes `{ enabled: boolean; sourceLocales: string[]; targetLocales: string[] }`

- [ ] **Step 1: Write the failing tests** in `integration.zod.test.ts`:
  - `zIntegrationSave` accepts `{ values: { apiKey: 'k' } }` and `{ values: {...}, skipTest: true }`, and rejects a missing `values` and non-string values.
  - `zTranslatePrimaryUpdate` rejects `{ value: 'unsplash' }`.
  - `INTEGRATIONS` ids are unique.
  - Every definition has at least one `lockEnv`, and every `lockEnv` entry is some field's `env`, except Google's `GOOGLE_CLOUD_PROJECT`, which is allowed as a lock-only variable.
  - Every `secret`/`file` field is non-optional.
- [ ] **Step 2: Run** `pnpm shared:test`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the models, schemas and the three definitions:
  - **`deepl`** (category `translation`, helpUrl `https://www.deepl.com/your-account/keys`, `lockEnv: ['DEEPL_API_KEY']`): field `apiKey` (secret, label `API key`, env `DEEPL_API_KEY`).
  - **`google-translate`** (`translation`, helpUrl `https://console.cloud.google.com/iam-admin/serviceaccounts`, `lockEnv: ['GOOGLE_CLOUD_PROJECT']`):
    - field `serviceAccount` (file, label `Service account key (JSON)`, accept `.json,application/json`)
    - field `location` (text, label `Location`, default `global`, optional, env `LOCALESS_GOOGLE_TRANSLATE_LOCATION`)
  - **`unsplash`** (`assets`, helpUrl `https://unsplash.com/oauth/applications`, `lockEnv: ['UNSPLASH_API_KEY']`): field `apiKey` (secret, label `Access Key`, env `UNSPLASH_API_KEY`).

  Names and descriptions use the spec wording ("Pick free stock photos straight into Assets", etc.). Update `PublicAppConfig` and export everything.
- [ ] **Step 4: Run** `pnpm shared:test`. Expected: PASS. `pnpm --filter @localess/web exec tsc --noEmit -p tsconfig.app.json` will now flag `DEFAULT_APP_CONFIG`; that's fixed in Task 8. Leave it.
- [ ] **Step 5: Commit** `feat(shared): integration definitions and request models`

### Task 2: Server config and the secret box

**Files:**
- Modify: `apps/server/src/infra/config/config.ts`
- Create: `apps/server/src/infra/secrets/secret-box.ts`
- Create: `apps/server/src/infra/secrets/secret.module.ts` (global; provides `SECRET_BOX`)
- Test: `apps/server/src/infra/secrets/secret-box.test.ts`, `apps/server/src/infra/config/config.test.ts`
- Modify: `apps/server/test/test-app.ts`. `createTestApp` defaults `LOCALESS_SECRET_KEY` to a fixed 32+ char test value, so tests never write into the repo's `.data`.
- Modify: `apps/server/src/app.module.ts` (import `SecretModule`)

**Interfaces:**
- Produces:
  - `AppConfig` drops `translate` and `unsplash` and gains:
    - `integrationEnv: Partial<Record<IntegrationId, Record<string, string>>>`. These are the values of env-locked integrations only:
      - `deepl` → `{ apiKey }`
      - `google-translate` → `{ projectId, location }`
      - `unsplash` → `{ apiKey }`
    - `translateStub: boolean`
    - `translatePrimary: TranslatePrimary | undefined`
    - `unsplashApiUrl: string`
    - `deeplApiUrl: string | undefined` (new optional `LOCALESS_DEEPL_API_URL`, passed to `deepl-node`'s `serverUrl`, for tests and proxies, like `LOCALESS_UNSPLASH_API_URL`)
    - `secretKey: string | undefined`
  - `interface SecretBox { readonly available: boolean; readonly reason?: string; seal(plain: string, aad: string): string; open(sealed: string, aad: string): string }`
    - `seal` throws `SecretBoxUnavailableError` when the box isn't available.
    - `open` throws `SecretUnreadableError` on a wrong key or tampered data.
  - `async function createSecretBox(config: AppConfig): Promise<SecretBox>`
  - Injection token `SECRET_BOX`.
  - Sealed format: `v1.<iv b64url>.<tag b64url>.<data b64url>`.

- [ ] **Step 1: Write the failing tests:**
  - **`config.test.ts`:**
    - With `DEEPL_API_KEY=k`, `integrationEnv.deepl` is `{ apiKey: 'k' }`.
    - With only `LOCALESS_GOOGLE_TRANSLATE_LOCATION=eu`, `integrationEnv['google-translate']` is `undefined`, because the location doesn't lock.
    - With `GOOGLE_CLOUD_PROJECT=p`, it's `{ projectId: 'p', location: 'global' }`.
    - `LOCALESS_TRANSLATE_PRIMARY=google` maps to `'google-translate'`.
    - An invalid primary fails to load.
    - A `LOCALESS_SECRET_KEY` shorter than 32 characters fails to load.
  - **`secret-box.test.ts`:**
    - `open(seal('x','deepl'),'deepl') === 'x'`.
    - Two seals of the same text differ.
    - `open` with AAD `unsplash` throws `SecretUnreadableError`, and so does a box with another key.
    - With no env key and an empty temp data dir, a `secret.key` is created with mode `0o600`. A second `createSecretBox` reads the same file and opens the first box's output.
    - With a data dir that isn't writable (`chmod 0o500`) and no env key, the box has `available === false` with a `reason` that names `LOCALESS_SECRET_KEY`, and `createSecretBox` doesn't throw.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run src/infra/secrets src/infra/config`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Config:** `LOCALESS_TRANSLATE_PRIMARY` accepts `deepl | google`, with `google` mapped to `google-translate`. Keep the `.env.example` comment style.
  - **Secret box:** `createCipheriv('aes-256-gcm')`. The key is `sha256(secret)`. Generation uses `writeFile(path, …, { mode: 0o600, flag: 'wx' })`; an `EEXIST` race re-reads the file. Never log the secret.
  - **`SecretModule`:** `@Global()`, with a factory provider for `SECRET_BOX`. When the box isn't available, it logs one warning with the reason at boot.
- [ ] **Step 4: Run** the same command. Expected: PASS. The compile fails where `config.translate`/`config.unsplash` are still used; Tasks 5–7 replace those. To keep the tree compiling at this commit, temporarily keep `translate`/`unsplash` derived from `integrationEnv` and mark them `@deprecated`. Task 7 removes them.
- [ ] **Step 5: Commit** `feat(server): secret box and integration env config`

### Task 3: Storage and `IntegrationService`

**Files:**
- Modify: `apps/server/src/infra/database/schema.ts` (tables `integrationSettings`, `appSettings`)
- Create: migration via `pnpm --filter @localess/server db:generate`
- Create: `apps/server/src/shared/entities/integration-setting.entity.ts`, `apps/server/src/shared/entities/app-setting.entity.ts`
- Create: `apps/server/src/shared/repositories/integration-setting.repository.ts`, `apps/server/src/shared/repositories/app-setting.repository.ts`
- Create: `apps/server/src/shared/services/integration.service.ts`
- Modify: `apps/server/src/shared/shared.module.ts` (provide; export `IntegrationService`)
- Test: `apps/server/test/integrations.test.ts`

**Interfaces:**
- Tables:
  - **`integration_settings`:**
    - `id text pk`, constrained to the `IntegrationId` values
    - `enabled boolean not null default true`
    - `secrets text not null`: sealed JSON of all field values
    - `hints jsonb not null`
    - `status text not null`, constrained to `verified | unverified | rejected | quota`
    - `status_message text`, `status_at timestamptz`
    - `updated_by uuid references users on delete set null`
    - `...timestamps`
  - **`app_settings`:** `key text pk`, `value jsonb not null`, `updated_by uuid references users on delete set null`, `...timestamps`. The primary is stored under key `translate.primary`.
- Consumes: `SECRET_BOX` and `AppConfig.integrationEnv` (Task 2), `INTEGRATIONS` (Task 1), `EventService`.
- Produces:
  - `type ResolvedIntegration = { id: IntegrationId; source: 'env' | 'ui'; values: Record<string, string> }`
  - `IntegrationService`:
    - `resolve(id): Promise<ResolvedIntegration | undefined>`. Undefined when off, disabled, or unreadable.
    - `list(): Promise<Integration[]>`
    - `save(id, values, status: 'verified' | 'unverified', userId): Promise<void>`
    - `setEnabled(id, enabled, userId): Promise<void>`
    - `remove(id): Promise<void>`
    - `recordOutcome(id, outcome: { ok: true } | { ok: false; reason: 'auth' | 'quota'; message: string }): Promise<void>`
    - `translatePrimary(): Promise<IntegrationList['translatePrimary']>`
    - `setTranslatePrimary(value, userId): Promise<void>`
  - The repositories follow `docs/server/controllers-services-repositories.md`: `findAll`/`findOne`, writes return `void` and publish the event in the same transaction.

- [ ] **Step 1: Write the failing tests** in `integrations.test.ts`. Use `createTestApp` and get `IntegrationService` from `t.app`.
  - **Precedence:**
    - With env `UNSPLASH_API_KEY=env-key` and a saved row `ui-key`, `resolve('unsplash')` is `{ source: 'env', values: { apiKey: 'env-key' } }`.
    - With no env, it's `{ source: 'ui', values: { apiKey: 'ui-key' } }`.
    - With nothing, it's `undefined`.
  - **No mixing:** with env `LOCALESS_GOOGLE_TRANSLATE_LOCATION=eu` only and a saved Google row with location `global`, `resolve` returns `source: 'ui'` and location `global`.
  - **Storage:**
    - The raw `secrets` column doesn't contain the key text.
    - `hints.apiKey === '••••' + last 4`.
    - `list()` contains no field values except `text` ones.
  - **Disabled:** `setEnabled('unsplash', false)` makes `resolve` return `undefined` and keeps the row. `remove` deletes it.
  - **Unreadable:** a row sealed with another key lists as `status: 'unreadable'`, `resolve` returns `undefined`, and the row is unchanged after `list()` (compare `updated_at`).
  - **Events:** `save` publishes `{ spaceId: null, entity: 'integrations', op: 'updated' }` with no values (spy `EventService.publish`).
  - **Recording outcomes:**
    - `recordOutcome` with `auth` sets `rejected` and the message, and publishes once. A second identical call publishes nothing.
    - `{ ok: true }` after it sets `verified`.
    - `recordOutcome` on an env-sourced integration writes nothing.
  - **Cache:** after `save`, `resolve` sees the new value immediately on the same instance. A row written directly with `t.db` plus a published event is seen within `eventually(...)`.
  - **Primary:**
    - `translatePrimary()` is `{ value: 'deepl', source: 'default' }`.
    - After `setTranslatePrimary('google-translate')` it's `source: 'ui'`.
    - With env `LOCALESS_TRANSLATE_PRIMARY=google` it's `source: 'env'`.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run test/integrations.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the schema, the generated migration (check the SQL file has both tables and the check constraints), the entities, the repositories and the service.
  - `resolve` caches per id in a `Map`, which is cleared on any `integrations` event from `eventService.stream()` and right after the service's own writes.
  - `save` seals `JSON.stringify(values)` with AAD = id. The location default is filled in from the definition before sealing.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then `pnpm server:test test/architecture.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): integration settings storage and resolution`

### Task 4: Provider test calls and error classification

**Files:**
- Create: `apps/server/src/shared/integrations/integration-provider.ts`
- Create: `apps/server/src/shared/integrations/deepl.integration.ts`, `google-translate.integration.ts`, `unsplash.integration.ts`, `integration-providers.ts` (registry)
- Test: `apps/server/src/shared/integrations/integrations.test.ts`

**Interfaces:**
- Produces:
  - `interface IntegrationProvider { id: IntegrationId; validate(values: Record<string,string>): string | undefined; test(values: Record<string,string>): Promise<IntegrationTestResult>; classify(error: unknown): 'auth' | 'quota' | 'unreachable' | 'other' }`
  - `validate` returns a plain-words problem with the values, or `undefined`.
  - `function integrationProvider(id: IntegrationId): IntegrationProvider`
  - `function googleCredentials(values): { projectId: string; credentials: { client_email: string; private_key: string } }`, used by Task 5 too.
- Consumes: `AppConfig.deeplApiUrl`, `AppConfig.unsplashApiUrl` (the providers are Nest injectables that take `APP_CONFIG`).

- [ ] **Step 1: Write the failing tests.** Use a `node:http` fake server like `fakeServer` in `test/app-translations.test.ts` (move that helper to `apps/server/test/fake-server.ts` and import it from both files).
  - **DeepL `test`:**
    - The fake `/v2/usage` answers `{ character_count: 112400, character_limit: 500000 }`. The result is `ok`, and `details` contains `112,400 of 500,000`.
    - A `403` gives `reason: 'auth'`.
    - A `456` gives `reason: 'quota'`.
    - A closed port gives `reason: 'unreachable'`.
  - **Unsplash `test`:**
    - The fake answers `200` with `X-RateLimit-Limit: 50`. `details` mentions `Demo`, and `fixUrl` is the apply link.
    - A `401` gives `reason: 'auth'`, and the message contains `Access Key, not the Secret Key`.
    - A `403` with body `Rate Limit Exceeded` gives `reason: 'quota'`.
  - **Google `validate`:**
    - Not JSON gives `Paste the whole service account JSON file.`
    - JSON without `private_key`/`client_email`/`project_id` gives `This doesn't look like a service account key.`
    - Valid JSON gives `undefined`.
  - **Google `test`:** with `vi.mock('@google-cloud/translate')`:
    - The client rejecting with code `7` and a message containing `has not been used in project` gives `reason: 'setup'`, with a `fixUrl` to `https://console.cloud.google.com/apis/library/translate.googleapis.com?project=<projectId>`.
    - Code `16` gives `auth`.
    - Code `8` gives `quota`.
  - **`classify`** maps the same errors for each provider.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run src/shared/integrations`. Expected: FAIL.
- [ ] **Step 3: Implement.** Each test call is the spec's:
  - DeepL: `Translator.getUsage()` with `serverUrl` when set.
  - Google: translate `hello` to `de` with explicit `credentials` and `projectId`.
  - Unsplash: `GET /photos?per_page=1`.

  Messages follow spec decision 5. Timeouts are 10 s, and a timeout counts as unreachable.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): integration test calls and error classification`

### Task 5: Translation routing — primary, fallback, outcomes

**Files:**
- Modify: `apps/server/src/shared/services/translate.service.ts`
- Test: `apps/server/src/shared/services/translate.service.test.ts` (new), plus the existing `apps/server/test/app-translations.test.ts` must stay green

**Interfaces:**
- Consumes: `IntegrationService.resolve`, `recordOutcome`, `translatePrimary` (Task 3), and `integrationProvider(id).classify` and `googleCredentials` (Task 4).
- Produces:
  - `TranslateService.translatableLocales(): Promise<{ sourceLocales: string[]; targetLocales: string[] }>`. This is the union over the connected providers. Stub gives the GCP lists, nothing connected gives empty lists.
  - `requireProvider(): Promise<void>` (now async). Its callers in `modules/tasks` and `modules/translations` await it.

- [ ] **Step 1: Write the failing tests** with a fake `IntegrationService`, and DeepL/Google clients stubbed by mocking `deepl-node` and `@google-cloud/translate`:
  - **Routing by language:** with both connected and primary `deepl`, `en→de` goes to DeepL. `en→ka` (Georgian, Google only) goes to Google.
  - **Primary choice:** primary `google-translate` sends `en→de` to Google.
  - **Fallback on failure:** DeepL throwing a quota error leads to Google translating, and `recordOutcome('deepl', { ok: false, reason: 'quota' })` called once. A batch of 3 chunks records only once: the service remembers the failed provider for the rest of that `translateItems` call.
  - **Unsupported pair:** only DeepL connected plus `en→ka` gives `400` `Unsupported target locale : 'ka'`, as today.
  - **Nothing connected:** `412` with the exact copy from Global Constraints.
  - **Every provider failing** gives `424` with the exact copy.
  - **Success:** a successful call records `{ ok: true }`. A `verified` integration's outcome is a no-op, which `IntegrationService` already handles.
  - **Locale lists:** `translatableLocales()` with only DeepL equals the DeepL lists. With both, it's the union.
  - **Client cache:** changing the resolved DeepL key between calls builds a new `Translator`. The cache is keyed by the JSON of the values.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run src/shared/services/translate.service.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Replace the `switch` with `candidates(source, target)`: the ordered providers that support the pair. Try each in turn and fall through on `auth|quota|unreachable`. Google uses `googleCredentials` for UI values, and ADC with `projectId` for env values.
- [ ] **Step 4: Run** that file and `pnpm --filter @localess/server exec vitest run test/app-translations.test.ts test/tasks.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): translation primary, fallback and outcome tracking`

### Task 6: Unsplash on `IntegrationService`

**Files:**
- Modify: `apps/server/src/modules/plugins/services/unsplash.service.ts`
- Test: `apps/server/test/app-translations.test.ts` (the Unsplash describe)

**Interfaces:**
- Consumes: `IntegrationService.resolve` and `recordOutcome`, `integrationProvider('unsplash').classify`, `AppConfig.unsplashApiUrl`.

- [ ] **Step 1: Write the failing tests** in the existing `Unsplash` describe:
  - The fake answering `401` gives a `424` whose message is exactly `Unsplash is unavailable. Ask an admin to check Admin → Settings → Integrations.`
  - With no env key and a key saved through `IntegrationService.save`, search uses `Client-ID <saved key>`.
  - After a `401` on a UI-saved key, `list()` shows `rejected`. The next `200` shows `verified`.
  - With nothing configured, the answer is `424` with the same copy, replacing today's `501`.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run test/app-translations.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Resolve on each call and record the outcome. Rate limits pass through as today.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): Unsplash key from integrations`

### Task 7: Admin API, public config, events, health check, docs

**Files:**
- Create: `apps/server/src/modules/integrations/integration.module.ts`, `controllers/integration.controller.ts`, `services/integration-admin.service.ts`
- Modify: `apps/server/src/app.module.ts` (import `IntegrationModule`)
- Modify: `apps/server/src/auth/controllers/app-config.controller.ts`
- Modify: `apps/server/src/modules/events/utils/event-access.ts` (`integrations: ANY_ROLE`), `event-access.test.ts`
- Modify: `apps/server/src/cli/check.ts`, `apps/server/test/cli.test.ts`
- Modify: `apps/server/src/infra/config/config.ts` (remove the deprecated `translate`/`unsplash`)
- Modify (docs):
  - `apps/server/.env.example`: `LOCALESS_SECRET_KEY`, `LOCALESS_TRANSLATE_PRIMARY`, `LOCALESS_DEEPL_API_URL`
  - `docs/deployment/configuration.md`
  - `docs/deployment/docker.md` and `docs/deployment/updates.md`: back up `secret.key` separately; the upgrade note on fallback when both providers are in env
  - `docs/deployment/check.md`
- Test: `apps/server/test/integrations.test.ts` (API describe)

**Interfaces:**
- Routes (all `@RequireRole(ADMINS)`, `@Controller('api/app/admin/integrations')`):
  - `GET /` → `IntegrationList`
  - `POST /:id/test` with body `IntegrationTest` → `IntegrationTestResult`
    - With `values`, it tests them without saving.
    - Without `values`, it tests the active configuration (env or UI). For UI, it records the outcome. For env, it records nothing.
  - `PUT /:id` with body `IntegrationSave` → `Integration`
    - `409` when env-locked.
    - `400` from `validate`.
    - It tests first. A failure with `auth|quota|setup|invalid` gives `422` with the `IntegrationTestResult` as body, and nothing is saved.
    - A failure with `unreachable` and no `skipTest` also gives `422`.
    - With `skipTest: true` after an unreachable result, it saves as `unverified`.
    - A secret box that isn't available gives `503` with its reason.
  - `PATCH /:id/enabled` with body `IntegrationEnabledUpdate` → `Integration`. `409` when env-locked, `404` when there's no row.
  - `DELETE /:id` → `204`. `409` when env-locked.
  - `PUT /translate-primary` with body `TranslatePrimaryUpdate` → `IntegrationList['translatePrimary']`. `409` when `LOCALESS_TRANSLATE_PRIMARY` is set.
  - An unknown `:id` → `404`.
- `/api/config`:
  - `plugins.unsplash` is `!!(await resolve('unsplash'))`.
  - `translate` is `{ enabled, ...await translateService.translatableLocales() }`.
  - The `get()` handler becomes async.

- [ ] **Step 1: Write the failing tests** (API describe in `integrations.test.ts`, with the fake Unsplash server):
  - **Access:** a Developer gets `403` on every route.
  - **Saving:**
    - `PUT /unsplash` with a key the fake rejects gives `422`, `reason: 'auth'`, and no row.
    - With a valid key it gives `200` with `status: 'verified'` and `hints.apiKey` ending in its last 4 characters. The response JSON doesn't contain the key, and neither does a following `GET /`.
    - Pointing at a closed port gives `422 unreachable`. The same with `skipTest: true` gives `200 unverified`.
  - **Env lock:** with env `UNSPLASH_API_KEY` set, `PUT`, `PATCH` and `DELETE` give `409`, and `GET /` shows `source: 'env'` and `envVars: ['UNSPLASH_API_KEY']`.
  - **Public config:**
    - `GET /api/config` shows `plugins.unsplash` flipping from false to true after saving, with no restart.
    - `translate.targetLocales` contains `ka` only when Google is connected (Google set via env `GOOGLE_CLOUD_PROJECT` and a mocked client is enough).
  - **Primary:** `PUT /translate-primary` with env `LOCALESS_TRANSLATE_PRIMARY` gives `409`.
  - **Events:** `event-access.test.ts` checks that `integrations` reaches VIEWER and TRANSLATOR and is on the global stream (`isGlobal`).
  - **Health check:** `cli.test.ts` checks that `runChecks` reports `unsplash` as `ok` / `UI` after a save, and as `warn` / `UI (not verified)` for an unverified row. With `secretKey` unset and a generated `secret.key`, it adds a `warn` that says to back up `secret.key` and keep the data dir persistent.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run test/integrations.test.ts src/modules/events test/cli.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the module, controller, service, config controller, event access and check rows:
  - The check rows are named `machine translation` and `unsplash`. The details are `env`, `UI`, `UI (not verified)`, `key rejected`, `quota reached`, `key unreadable` or `off`.
  - Remove `AppConfig.translate`/`unsplash`.
  - Then update the docs listed above. `docs/deployment/configuration.md` gets a section "Integrations: environment or Admin → Settings". It covers the lock table, `LOCALESS_SECRET_KEY` and what encryption protects against, in spec decision 3's words.
- [ ] **Step 4: Run** `pnpm server:test`. Expected: PASS, the whole suite including `architecture.test.ts`. Then run `pnpm server:build`.
- [ ] **Step 5: Commit** `feat(server): admin integrations API and live public config`

### Task 8: Web — live config and translatable locales

**Files:**
- Modify: `apps/web/src/app/core/api/app-config.service.ts` (+ spec)
- Modify: `apps/web/src/app/core/services/locale.service.ts` (+ spec)

**Interfaces:**
- Consumes: `PublicAppConfig.translate.sourceLocales/targetLocales` (Task 1), the `integrations` event (Task 7), `ChangeEventsService.changes()` (the global stream).
- Produces: `AppConfigService.watch(): void`. It's called once from `provideAppInitializer` after `load()`. It subscribes to the global stream and calls `load()` on `entity === 'integrations'` or `RESYNC_EVENT`. Only signed-in sessions do this; the stream closes for anonymous users, and errors are swallowed.

- [ ] **Step 1: Write the failing specs:**
  - **`app-config.service.spec.ts`:** a stubbed `ChangeEventsService` emitting `{ spaceId: null, entity: 'integrations', op: 'updated' }` triggers a second `GET /api/config` (`HttpTestingController`), and `config().plugins.unsplash` becomes `true`. An event for `users` triggers none.
  - **`locale.service.spec.ts`:** with config `targetLocales: ['de']`, `isLocaleTranslatableTo('de')` is true and `isLocaleTranslatableTo('ka')` is false. With `enabled: false`, every locale is false.
- [ ] **Step 2: Run** `pnpm --filter @localess/web test -- --include src/app/core`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Update `DEFAULT_APP_CONFIG` to `translate: { enabled: false, sourceLocales: [], targetLocales: [] }`.
  - Turn the lists into `Set`s in a `computed`.
  - Keep `toProviderLocale` resolution as it is.
- [ ] **Step 4: Run** the same command, then `pnpm build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): live runtime config and provider-aware translate locales`

### Task 9: Web — Admin → Settings → Integrations

**Files:**
- Create under `apps/web/src/app/features/admin/settings/`:
  - `settings.module.ts`, `settings-routing.module.ts`
  - `integrations/integrations.component.{ts,html}` (+ spec)
  - `integrations/integration-card/integration-card.component.{ts,html}` (+ spec)
  - `integrations/integration.service.ts` (+ spec)
- Modify: `apps/web/src/app/features/features-routing.module.ts` (route `admin/settings`, `roleGuard(ADMINS)`, breadcrumb `Settings`)
- Modify: `apps/web/src/app/features/features.component.ts` (`adminSideMenu`: `{ link: 'admin/settings', label: 'Settings', icon: 'lucideSettings', role: 'ADMINS' }`, after Spaces)
- Create: `docs/features/admin/settings.md`
- Modify: `docs/features/admin/overview.md` and the `CLAUDE.md` docs table (a row for Admin → Settings)

**Interfaces:**
- Consumes: the Task 7 routes, `INTEGRATIONS` and models (Task 1), `liveQueryWith(events, { entities: ['integrations'] }, fetch)` for the list.
- Produces: `IntegrationService` (web, feature-local) with `findAll(): Observable<IntegrationList>` (live), `test(id, values?)`, `save(id, body: IntegrationSave)`, `setEnabled(id, enabled)`, `remove(id)`, `setTranslatePrimary(value)`.
- `IntegrationCardComponent`: inputs `definition: IntegrationDefinition` and `integration: Integration`. Outputs: none, since it calls the service itself and the live list refreshes.

- [ ] **Step 1: Write the failing specs** (`integration-card.component.spec.ts`; texts are what e2e and users look for):
  - **Env source:** renders the badge `Server configuration`, the text `Set by DEEPL_API_KEY in the server environment`, a `Test connection` button, and no `Replace`/`Disconnect`. The switch is disabled.
  - **None source:** renders `Not connected` and a `Connect` button. Clicking it shows one input per field, with label from the definition: a password-type input for `secret`, a textarea plus file picker for `file`, and a text input prefilled from `default` for `text`. It also shows a `How do I get one?` link to `helpUrl` and a `Test & enable` button.
  - **Test & enable:**
    - A `422` `auth` response shows its message and keeps the form open.
    - A `422 unreachable` response shows `Try again` and `Save without testing`. The latter sends `skipTest: true`.
  - **UI-sourced card:**
    - `verified` shows `Connected`, the hint, and `Test`, `Replace` and `Disconnect`.
    - `unverified` shows `Not verified`, `rejected` shows `Key rejected`, `quota` shows `Quota reached`.
    - `unreadable` shows `The saved key can't be read on this server. Enter it again, or set LOCALESS_SECRET_KEY so it survives restarts.` with an `Enter again` button.
  - **Disconnect** asks for confirmation through the existing confirmation dialog, then calls `remove`.
  - **`integrations.component.spec.ts`:**
    - Cards are grouped under the headings `Machine translation` and `Assets`.
    - The primary switch (`DeepL` / `Google`) shows only when both translation integrations are on. It's disabled with `Server configuration` when `translatePrimary.source === 'env'`.
- [ ] **Step 2: Run** `pnpm --filter @localess/web test -- --include src/app/features/admin/settings`. Expected: FAIL.
- [ ] **Step 3: Implement** with Spartan/Helm (card, badge, switch, button, input, textarea, alert dialog), following `docs/frontend-architecture.md` and the Angular conventions in `CLAUDE.md`.
  - The form is a reactive `FormGroup` built from `definition.fields`. Secret and file fields are required; text fields are optional when `optional`.
  - A file field reads the dropped or chosen file as text into its control.
  - The card never keeps a submitted secret after a successful save: reset the form.
  - The mockups in the conversation are the visual reference, not pixel specs.
- [ ] **Step 4: Run** the same command, then `pnpm build`, `pnpm lint:fix`, `pnpm prettier:fix`. Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat(web): Admin → Settings → Integrations`

### Task 10: End-to-end — connect Unsplash from the UI

**Files:**
- Modify: `apps/e2e/scripts/start-server.mjs`:
  - Add a fake Unsplash on `E2E_UNSPLASH_PORT` (default `3104`).
  - Key `e2e-unsplash-good` gets a `200` with `X-RateLimit-Limit: 50` and a one-photo body for `/photos`, `/search/photos` and `/photos/random`. Any other key gets a `401`.
  - Pass `LOCALESS_UNSPLASH_API_URL`.
- Create: `apps/e2e/tests/pages/admin-settings.page.ts`
- Create: `apps/e2e/tests/admin/integrations.spec.ts`
- Modify: `apps/e2e/TEST-PLAN.md` (covered: Admin → Settings → Integrations)

**Interfaces:**
- Consumes: the card texts from Task 9, and the existing fixtures (`tests/support/fixtures.ts`) and admin login.

- [ ] **Step 1: Write the test** (read the `writing-localess-e2e-tests` skill first). Use `test.describe.configure({ mode: 'serial' })`, since the setting is install-wide, and disconnect in `afterAll` so other specs see Unsplash off.
  1. Open Admin → Settings. The Unsplash card shows `Not connected`.
  2. `Connect` and enter `wrong`, then `Test & enable`. The message contains `Access Key, not the Secret Key`.
  3. Enter `e2e-unsplash-good`, then `Test & enable`. The card shows `Connected`, and the hint ends with `good`.
  4. In a second page signed in as an editor and already open on Assets, the Unsplash action appears without a reload.
  5. `Disconnect` and confirm. The card shows `Not connected`, and the editor's Unsplash action disappears.
- [ ] **Step 2: Run** `pnpm server:build && pnpm build:prod && pnpm e2e:run -- tests/admin/integrations.spec.ts` (one build at a time). Expected: PASS. If it fails, fix the product or the page object, not the timing.
- [ ] **Step 3: Run** `pnpm e2e:smoke`. Expected: PASS.
- [ ] **Step 4: Commit** `test(e2e): connect and disconnect Unsplash from Admin → Settings`

---

## Plan calls (not in the spec)

- `LOCALESS_DEEPL_API_URL` was added so DeepL can be faked in tests, mirroring `LOCALESS_UNSPLASH_API_URL`.
- Status is recorded only for UI-sourced integrations. An env integration card shows its lock and on-demand test results, not "Key rejected".
- The primary is stored in a new key-value `app_settings` table, which later Settings sections can reuse.
- Unconfigured Unsplash answers `424` with the editor copy instead of `501`.
- When the secret box can't be created (unwritable data dir, no env key), the server still boots. UI saves answer `503` with the reason, and env integrations work.
