# Webhooks

> Related: [Concepts](concepts.md) · [Publish Flow](publish-flow.md) · [Open API](features/spaces/open-api.md)

Webhooks deliver HTTP POST notifications to external URLs when content or translation events occur in a space. Each webhook is scoped to a space, can subscribe to multiple events, and optionally signs payloads with HMAC-SHA256.

---

## Storage

```
webhooks       (id uuid, space_id, legacy_id, name, url, enabled, events text[], headers jsonb, secret, created_at, updated_at)
webhook_logs   (id uuid, webhook_id → webhooks on delete cascade, delivery fields, created_at)
                — execution history (not capped or pruned; one row per delivery)
```

Postgres tables defined in `apps/server/src/infra/database/schema.ts`. Enabled webhooks for an event are found with a GIN index on `events` (`events @> array[event]`).

**Access control:** `SPACE_MANAGEMENT` (or `admin`) required to read/write webhook configs and to read logs (`@RequirePermission(SPACE_MANAGEMENT)` on `WebhooksController`). Logs are read-only through the API; only the server's dispatcher writes them.

App API (`apps/server/src/modules/webhooks/webhooks.controller.ts`):

| Method | Path | |
|---|---|---|
| `GET` / `POST` | `/api/app/spaces/:spaceId/webhooks` | list (by name) / create |
| `GET` / `PUT` / `DELETE` | `/api/app/spaces/:spaceId/webhooks/:id` | read / update / delete |
| `PATCH` | `/api/app/spaces/:spaceId/webhooks/:id/status` | `{ enabled }` |
| `GET` | `/api/app/spaces/:spaceId/webhooks/:id/logs[?limit=]` | newest first; all rows, or `limit` clamped to 1–1000 |

---

## Data Model

```typescript
interface WebHook {
  name: string;
  url: string;
  enabled: boolean;
  events: WebHookEvent[];
  headers?: Record<string, string>;  // custom request headers
  secret?: string;                   // HMAC-SHA256 signing key
  createdAt: string;  // ISO 8601
  updatedAt: string;
}
```

### Events

| Event                   | Value                   | Triggered by                                      |
|-------------------------|-------------------------|---------------------------------------------------|
| `CONTENT_PUBLISHED`     | `content.published`     | `ContentsService.publish()` (`POST …/contents/:id/publish`) |
| `CONTENT_UNPUBLISHED`   | `content.unpublished`   | `ContentsService.unpublish()` (`POST …/contents/:id/unpublish`) |
| `CONTENT_CHANGED`       | `content.changed`       | Document data save, document metadata edit that keeps its slug (a slug change or move fires nothing), delete (one per deleted item, folders and their subtrees included), content import |
| `TRANSLATION_PUBLISHED` | `translation.published` | `TranslationsService.publish()` (`POST …/translations/publish`) |
| `TRANSLATION_CHANGED`   | `translation.changed`   | Every translation write through the app API (`TranslationsService.write()`), translation import with changes |

Events are dispatched only **after** the transaction that caused them commits, and the request does not wait for delivery (`WebhookDispatcher.dispatch()` is fire-and-forget; shutdown waits for deliveries in flight).
---

## Payload

```typescript
interface WebHookPayload {
  event: WebHookEvent;
  spaceId: string;
  timestamp: string;           // ISO 8601
  data: ContentWebHookPayloadData | TranslationWebHookPayloadData;
  signature?: string;          // internal only — the signature is delivered in the X-Webhook-Signature header, not the body
}
```

Content events send `data: { id, fullSlug }` (`ContentWebHookPayloadData`) — the content's ID and full slug. Translation events send an empty `data` object.

---

## HTTP Request

Every webhook dispatch sends:

```
POST <webhook.url>
Content-Type: application/json
User-Agent: Localess-WebHook/1.0
X-Webhook-Event: <event>
X-Webhook-Delivery: <uuid>          ← unique per dispatch; same value as the log's deliveryId
X-Webhook-Signature: sha256=<hex>   ← only if secret is set
<custom headers from webhook.headers, minus reserved ones — see below>

Body: JSON-serialised WebHookPayload (without `signature`)
```

- Timeout: **30 seconds**
- Retries: **none**
- Redirects: **not followed.** A 3xx is logged as an `http` failure with its status code.
- Response body: at most 4 KB is read, which is all that gets logged.
- All enabled webhooks for an event fire concurrently via `Promise.allSettled()` (one failure does not block others). Each webhook signs its own copy of the payload, so no webhook ever sees another's signature.

### Destination restrictions (SSRF protection)

Delivery runs from the Localess server, inside your network, and the URL and headers are chosen by a space manager. So `apps/server/src/modules/webhooks/webhook-request.ts` limits where a webhook can go. Without these limits, a webhook, or a redirect from one, could reach internal services or a cloud metadata server (`169.254.169.254`, which on most clouds issues instance credentials) and the reply would show up in the webhook log.

- **URL** (`checkWebhookUrl`): `https:` only, on the default port, with no credentials in the URL. `localhost`, `*.localhost`, `*.internal`, `metadata.google.internal` and private IP literals are refused. The WHATWG URL parser normalises shorthand forms such as `0x7f.1` and `2130706433` before the check.
- **Resolved address** (`isBlockedAddress`, applied in the socket's DNS `lookup`): the connection is refused if the host resolves to any loopback, private, link-local, CGNAT, multicast, reserved or documentation range, IPv4 or IPv6, including IPv4-mapped IPv6. The check runs on the exact address being connected to, so DNS rebinding can't get around it.
- **Headers** (`sanitizeWebhookHeaders`): custom headers can't set `Host`, `Metadata-Flavor`, `Content-Length`, `Transfer-Encoding`, `Connection`, `Content-Type`, `User-Agent`, or any `X-Webhook-*` header. Those are dropped.
- **Local development** (`LOCALESS_WEBHOOK_ALLOW_INTERNAL=true`, default `false`): `http:` and local or private targets are allowed, and the resolved-address check is skipped, so a local receiver can be used. Never enable it in production.

A refused delivery sends nothing. It is logged as a `network` failure with `errorMessage` "Webhook URL is not allowed: …".

---

## HMAC Signing

When a webhook has a `secret`, the payload is signed before dispatch:

```
body      = JSON.stringify(payload)          // serialised once, before signing
signature = HMAC-SHA256(secret, body)
header:   X-Webhook-Signature: sha256=<hex_digest>
```

The signature is delivered **only** in the `X-Webhook-Signature` header. Receivers must read it from the header and verify it by computing the HMAC over the **raw request body** exactly as received (do not re-serialise parsed JSON, and do not rely on any `signature` field in the body).

---

## Execution Logging

Every delivery — success or failure — inserts a `webhook_logs` row and emits a `webhook_logs` change event, so an open log view refreshes over SSE. `WebHookLog` is a discriminated union on `status`:

```typescript
enum WebHookStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

enum WebHookErrorType {
  TIMEOUT = 'timeout',
  NETWORK = 'network',
  HTTP = 'http',
}

interface WebHookLogBase {
  event: WebHookEvent;
  url: string;
  requestSize: number;
  data: ContentWebHookPayloadData | TranslationWebHookPayloadData;
  deliveryId: string;
  duration: number;       // milliseconds
  createdAt: string;      // ISO 8601
}

interface WebHookLogSuccess extends WebHookLogBase {
  status: WebHookStatus.SUCCESS;
  statusCode: number;
  statusText: string;
  responseBody?: string;
  responseBodyTruncated?: boolean;
}

interface WebHookLogFailure extends WebHookLogBase {
  status: WebHookStatus.FAILURE;
  errorType: WebHookErrorType;       // timeout | network | http
  statusCode?: number;
  statusText?: string;
  responseBody?: string;
  responseBodyTruncated?: boolean;
  errorMessage?: string;
}

type WebHookLog = WebHookLogSuccess | WebHookLogFailure;
```

Logs are **not capped on write** — every delivery adds a row and nothing prunes them (they are only removed with the webhook, see [Cleanup](#cleanup)). Limits apply only on read: `GET …/webhooks/:id/logs` returns rows newest first, all of them or `?limit=` (clamped to 1–1000), and the frontend `WebHookService.findLogs()` takes an optional `max`. Webhook and log ids are UUIDv7s; a `:id` that isn't a UUID answers 404. `legacy_id` (the Firestore id of an imported webhook, for import re-runs) is not returned. The [WebhookDetailComponent](#frontend) shows the log history with pagination and filtering.

---

## Dispatch Call Sites

| File                                                                         | Event                   |
|------------------------------------------------------------------------------|-------------------------|
| `apps/server/src/modules/contents/contents.service.ts` — `publish()`              | `CONTENT_PUBLISHED`     |
| `apps/server/src/modules/contents/contents.service.ts` — `unpublish()`            | `CONTENT_UNPUBLISHED`   |
| `apps/server/src/modules/contents/contents.service.ts` — `update()`, `updateData()`, `delete()` | `CONTENT_CHANGED` |
| `apps/server/src/modules/translations/translations.service.ts` — `publish()`      | `TRANSLATION_PUBLISHED` |
| `apps/server/src/modules/translations/translations.service.ts` — `write()`        | `TRANSLATION_CHANGED`   |
| `apps/server/src/modules/tasks/task-runner.service.ts` — content / translation imports    | `CONTENT_CHANGED` / `TRANSLATION_CHANGED` |

All call `WebhookDispatcher.dispatch(spaceId, event, data)` from `apps/server/src/modules/webhooks/webhook-dispatcher.service.ts`.

> Translation pushes through the public MANAGE API (`POST /api/v1/.../translations/:locale`) do not dispatch webhooks.

---

## Cleanup

`webhook_logs.webhook_id` references `webhooks` with `on delete cascade`, so deleting a webhook (or its space) removes its logs in the same statement.

---

## Frontend

**Routes:** part of the **Developers** module (see [Open API](features/spaces/open-api.md) for the sibling module and route shell)

```
/features/spaces/:spaceId/developers/webhooks             [DEV_WEBHOOK]  ← WebhooksComponent (list)
/features/spaces/:spaceId/developers/webhooks/:webhookId  [DEV_WEBHOOK]  ← WebhookDetailComponent
```

**Form validation** (`WebhookDialogComponent`):
- `name`: required, 3–50 chars, no leading/trailing spaces
- `url`: required, max 2048 chars, `https://` (or `http://localhost` / `http://127.0.0.1` for local development) — error key `webhookUrl`. The server's zod DTO (`webhooks.controller.ts`) enforces the same shape on create and update. Delivery re-checks it and blocks private addresses, see [Destination restrictions](#destination-restrictions-ssrf-protection).
- `events`: required, at least one selected
- `secret`: optional, displayed as a password field

Webhooks are created with `enabled: true` by default. `WebhooksComponent` (list view) supports enable/disable toggle, edit, delete, and navigating into a webhook's detail page.

`WebhookDetailComponent` shows the full log history for a single webhook: search by log id, filter by event/status, paginated (`HlmPaginationImports`), plus enable/disable, edit, and delete actions.

---

## Implementation Files

| File                                             | Purpose                                                                   |
|--------------------------------------------------|---------------------------------------------------------------------------|
| `apps/server/src/infra/database/schema.ts`                  | `webhooks` and `webhook_logs` tables                                      |
| `packages/shared/src/models/webhook.model.ts`         | Types — `WebHookEvent` and friends (server and web)                       |
| `apps/server/src/modules/webhooks/webhooks.controller.ts` | App API — CRUD, status toggle, logs, URL validation                   |
| `apps/server/src/modules/webhooks/webhook-dispatcher.service.ts` | HTTP dispatch, HMAC signing, execution logging                         |
| `apps/server/src/modules/webhooks/webhook-request.ts`       | Destination checks (URL, resolved address, headers), guarded POST         |
| `apps/web/src/app/features/spaces/developers/webhooks/webhook.service.ts`     | Frontend HttpClient CRUD + log queries (live queries over SSE)            |
| `apps/web/src/app/features/spaces/developers/webhooks/webhook.validator.ts` | Form validators                                                           |
| `apps/web/src/app/features/spaces/developers/webhooks/`   | UI — list (`webhooks.component`), create/edit (`webhook-dialog/`), detail + log history (`webhook-detail/`) |
