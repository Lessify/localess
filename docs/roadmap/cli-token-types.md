# CLI and SDK changes for token types (TODO)

> Status: to do, one by one. Related: [API token types](api-token-types.md) · [Auth Tokens](../auth-tokens.md) · [V1 API](../v1-api.md)

The server now has three token types (`public`, `preview`, `management`), the CDN API (`/api/v1`, `?token=`) and the
Management API (`/api/manage/v1`, `Authorization: Bearer`, management tokens only; the CDN refuses them). The CLI and the
SDKs live in the `localess-js` repository (`/home/shaman/Code/localess-js`); this is what they need. Paths below are in that
repository unless stated otherwise.

## Open decision first

### D1. `translation pull` (published and `--draft`) with a management token

`packages/cli/src/commands/translation/source.ts` `fetchTranslations` reads published and draft files through the **CDN**
(`client.getTranslations` → `GET /api/v1/spaces/:id/translations/:locale?token=…`) with the CLI's token. The CLI's token is
now a management token, which the CDN refuses (401), so `translation pull` and `translation diff` break unless `--raw` is
used. Options:

1. **Management API serves the files too** (recommended): `GET /api/manage/v1/spaces/:id/translations/:locale?version=published|draft`
   returns the fallback-filled map (as the CDN does), and `?raw=true` or no parameter keeps the stored values.
   Server change in this repository (translations management controller + tests), then the CLI uses it. One token for
   every CLI command.
2. **CLI also takes a CDN token** (`LOCALESS_CDN_TOKEN`, a second field in `.localess/credentials.json`): two tokens to
   create and keep, and `login` gets more complex.
3. **Drop published/draft pull from the CLI**: only `--raw` remains. Smallest change; loses "what the app is served".

## CLI (`packages/cli`)

### C1. Management API URLs and the Bearer header — `src/client.ts`

| Method | Now | New |
|---|---|---|
| `getSpace` | `GET /api/v1/spaces/:id?token=` | `GET /api/manage/v1/spaces/:id` |
| `getSchemas` | `GET /api/v1/spaces/:id/schemas?token=` | `GET /api/manage/v1/spaces/:id/schemas` |
| `getOpenApi` | `GET /api/v1/spaces/:id/open-api?token=` | `GET /api/manage/v1/spaces/:id/open-api` |
| `getTranslationValues` | `GET /api/v1/spaces/:id/translations/:locale/values?token=` | `GET /api/manage/v1/spaces/:id/translations/:locale` (no `/values`) |
| `updateTranslations` | `POST /api/v1/spaces/:id/translations/:locale` + `X-API-KEY` | `POST /api/manage/v1/spaces/:id/translations/:locale` |
| `pushSchemas` | `POST /api/v1/spaces/:id/schemas` + `X-API-KEY` | `POST /api/manage/v1/spaces/:id/schemas` |

- Every request sends `Authorization: Bearer <token>`; no `?token=`, no `X-API-KEY`.
- The token is no longer in any URL: `redactToken()` and URL redaction in debug logs and error boxes become unnecessary for
  these calls; make sure the `Authorization` header is never printed (debug output, error boxes).
- `client.test.ts`: URLs, header, no token in the URL.

### C2. Error hints — `src/client.ts` (`hintForStatus`, `extractRequiredPermissions`)

- 401: mention that the CLI needs a **Management** token (`mgt_…`), created in Space Settings → Tokens, shown once.
- 403 no longer comes from the Management API (wrong-type tokens get 401); keep a generic 403 text.
- `details.requiredPermissions` → `details.requiredTypes` (only the CDN sends it).
- 503 (`unavailable`): "This space is being imported (or its import failed); try again later" (with `Retry-After`).
- `fetchWithRetry` retries every 5xx: decide whether a 503 import answer should be retried (it may last minutes) or shown at once.

### C3. Token format check — `src/commands/login`, `src/session.ts`

- `login` (and `LOCALESS_TOKEN`): warn early when the token doesn't start with `mgt_` ("Use a Management token; public
  and preview tokens are for websites"); old 20-character tokens no longer work at all.
- `login` validates with `getSpace` (C1): a wrong token now gets 401 with the C2 hint.

### C4. Comments and checks that mention `DEV_TOOLS`

- `src/client.ts:259` ("Needs the `DEV_TOOLS` permission") → "Needs a management token".
- `src/commands/translation/source.ts` `findUnknownLocale`: the comment says reading translations doesn't need `DEV_TOOLS`;
  with one management token both calls work — revisit after D1 (the silent skip may no longer be needed).

### C5. Platform version gate — `src/platform-version.ts`

- Every command in the map needs `'4.1.0'` today. The Management API, Bearer auth and token types are a breaking change:
  decide the platform version that ships them (e.g. `5.0.0`) and set it as the minimum for `schema pull|diff|push`,
  `translation pull|push|diff`, `type generate`. `platform-version.matrix.test.ts` keeps every command listed.
- CLI version: a major bump, since it no longer works against older platforms.

### C6. Docs — `packages/cli/README.md`, `packages/cli/SKILL.md`, `docs/cli.md`

- Replace "the token must have the **Development Tools** permission (`DEV_TOOLS`)" (README.md:312, :345; SKILL.md:348,
  :423, :624; docs/cli.md:264, :309) with "a **Management** token (`mgt_…`, Space Settings → Tokens; shown once)".
- `login`: where to get the token (the show-once dialog has a ready `localess login --origin … --space … --token …`).
- Error section (README.md:421): the new 401/503 texts.
- Changelog / migration note: old tokens and older platforms don't work; create a Management token.

## SDK (`packages/client`) and framework packages

URLs and `?token=` are unchanged for the CDN API, so the SDKs keep working with `public`/`preview` tokens. Only messages:

### S1. 403 details — `packages/client/src/client.ts` (~504-561, ~810)

- `requiredPermissions` → `requiredTypes` in the parsed details and the error box ("Required token type(s): preview").
- 403 hint text (~534): "draft access needs a **Preview** token; published needs a Public or Preview token".
- The 403 `message` is now "Token type not allowed for this request" (was "Token is missing a required permission"); the
  CLI and SDK only use it in test fixtures (`packages/cli/src/client.test.ts:135`, `packages/client/src/client.test.ts`).

### S2. 401 hint

- A management token used by mistake gets 401 with `details.hint` ("Management tokens go in the Authorization header on
  /api/manage/v1."): show `details.hint` (already supported, `client.ts:519`), and mention Public/Preview tokens in the
  401 text.

### S3. Docs — `docs/client.md`, `packages/client/README.md` and the framework packages (react, vue, angular, nuxt, svelte, astro)

- Token wording: "a Public token for the site, a Preview token for preview/draft and the Visual Editor".
- Permission names (`CONTENT_PUBLIC` / `CONTENT_DRAFT` / `TRANSLATION_*` / `DEV_TOOLS`) appear in `docs/client.md`,
  `docs/cli.md`, `packages/cli/README.md`, `packages/cli/SKILL.md` and the decision records `docs/decisions/003-ttl-cache-design.md`,
  `docs/decisions/008-schema-package.md` (decision records are history: add a note rather than rewrite).
