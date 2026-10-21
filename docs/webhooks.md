# Webhooks

> Related: [Concepts](concepts.md) · [Publish Flow](publish-flow.md) · [Open API](features/spaces/open-api.md)

Webhooks deliver HTTP POST notifications to external URLs when content or translation events occur in a space. Each webhook is scoped to a space, can subscribe to multiple events, and optionally signs payloads with HMAC-SHA256.

---

## Storage

```
webhooks       (id uuid, space_id, name, url, enabled, events text[], headers jsonb, secret, created_at, updated_at)
webhook_logs   (id uuid, webhook_id → webhooks on delete cascade, delivery fields, created_at)
                — execution history (not capped or pruned; one row per delivery)
```

Postgres tables defined in `apps/server/src/infra/database/schema.ts`. Enabled webhooks for an event are found with a GIN index on `events` (`events @> array[event]`).

**Access control:** Developers and Admins (`@RequireRole(DEVELOPERS)` on `WebhookController` and `WebhookLogController`; the Developers route has `roleGuard(DEVELOPERS)`, the `webhooks` / `webhook_logs` events go to the same roles). Logs are read-only through the API; only the server's dispatcher writes them.

App API (`apps/server/src/modules/webhooks/controllers/webhook.controller.ts`):

| Method | Path | |
|---|---|---|
| `GET` / `POST` | `/api/app/spaces/:spaceId/webhooks` | one page (`Page<Webhook>`, `zWebhookPageable`) / create |
| `GET` / `PUT` / `DELETE` | `/api/app/spaces/:spaceId/webhooks/:webhookId` | read / update / delete |
| `PATCH` | `/api/app/spaces/:spaceId/webhooks/:webhookId/status` | `{ enabled }` |
| `POST` / `DELETE` | `/api/app/spaces/:spaceId/webhooks/:webhookId/secret` | a new signing secret, answered once (`secret` in the webhook) / stop signing |
| `GET` | `/api/app/spaces/:spaceId/webhooks/:webhookId/logs` | one page (`Page<WebhookLog>`, `zWebhookLogPageable`), newest first |

The list is paged on the server ([Pagination](server/pagination.md)): `?page=&size=&sort=&direction=`, sorts `name`
(the default, case-insensitive), `enabled`, `updatedAt` (ties by id); `?enabled=true|false`; `?event=` (repeated: a
webhook listening to any of them); `?search=` (the name or the URL, case-insensitive contains). The logs too: sort
`createdAt` only (newest first by default, equal times by id); `?event=`, `?status=` (repeated: any of them); `?search=`
(the log id, case-insensitive contains).

Every route checks the space first: an unknown space is 404 "Space not found" (the list too), then "Webhook not found"; a `spaceId` or `webhookId` that isn't a UUID is 404. Request bodies are strict: an unknown field is a 400.

---

## Data Model

```typescript
interface Webhook {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: WebhookEvent[];
  headerNames?: string[];            // custom request headers: names only, never their values
  hasSecret: boolean;                // whether deliveries are signed
  secret?: string;                   // whsec_…: only in the answer that made it
  createdAt: string;  // ISO 8601
  updatedAt: string;
}
```

The signing secret (`webhooks.secret`) is made by the server and never typed: `POST …/webhooks` with `signed: true`, or
`POST …/:webhookId/secret` (a new one; the one before stops at once), answers it in `secret`, the only time it is shown.
Every other answer has only `hasSecret` (`toWebhook`, `shared/transformers/webhook.transformer.ts`, lists every field it
sends), so it doesn't reach the browser again, its dev tools or a proxy's logs. `DELETE …/:webhookId/secret` stops
signing. A request that sends `secret` is a 400.

Custom headers (an `Authorization` token for an API, a key for a purge endpoint) are credentials too: their values are
write-only. A webhook answers `headerNames` only. Create takes `headers: { name: value }`; update takes every header the
webhook keeps, a value replaces, `null` keeps the one it has, a header left out is removed (without `headers`, all are
kept). At most 20; a name is an HTTP token, a value one line of at most 2000 characters; a name Localess sets itself
(see [Destination restrictions](#destination-restrictions-ssrf-protection)) or one given twice (case-insensitive) is a 400,
and so is `null` for a header that has no value.

The URL's query values are masked the same way (`shared/utils/webhook-url.ts`): build and deploy hooks (GCP Cloud Build's
`…:webhook?key=…&secret=…`), revalidation routes (`?secret=…`) and automation tools put their credentials there. A webhook
answers `url` with every query value as `••••` (names kept), delivery logs store and show the URL that way, and the list's
search looks at the URL without its query. An update sends the URL back as answered: a `••••` keeps the stored value of
that parameter, a typed value replaces it; a `••••` with nothing stored (and any `••••` on create) is a 400. A secret in
the **path** (Netlify, Vercel or Slack hook URLs) can't be told apart from a plain path and is shown as it is.

### Events

| Event                   | Value                   | Triggered by                                      |
|-------------------------|-------------------------|---------------------------------------------------|
| `CONTENT_PUBLISHED`     | `content.published`     | `ContentService.publish()` (`POST …/contents/:id/publish`) |
| `CONTENT_UNPUBLISHED`   | `content.unpublished`   | `ContentService.unpublish()` (`POST …/contents/:id/unpublish`) |
| `CONTENT_CHANGED`       | `content.changed`       | Document data save, document metadata edit that keeps its slug (a slug change or move fires nothing), delete (one per deleted item, folders and their subtrees included), content import |
| `TRANSLATION_PUBLISHED` | `translation.published` | `TranslationService.publish()` (`POST …/translations/publish`) |
| `TRANSLATION_CHANGED`   | `translation.changed`   | Every translation write through the app API (`TranslationService.write()`), translation import with changes, a v1 translation push (`POST /api/v1/spaces/:s/translations/:locale`) that wrote something (not a dry run or a no-op) |

Events are dispatched only **after** the transaction that caused them commits, and the request does not wait for delivery (`WebhookDispatcher.dispatch()` is fire-and-forget; shutdown waits for deliveries in flight).
---

## Payload

```typescript
type WebhookPayload = { spaceId: string; timestamp: string } & (   // timestamp: ISO 8601
  | { event: ContentWebhookEvent; data: { id: string; fullSlug: string } }   // content.published / unpublished / changed
  | { event: TranslationWebhookEvent; data: {} }                             // translation.published / changed
);
```

Defined once in `@localess/shared` (`webhook.model.ts`); `WebhookDispatcher.dispatch` takes a content event with its
data, or a translation event without, so a caller can't pair them wrongly.

Content events send `data: { id, fullSlug }` (`ContentWebhookPayloadData`) — the content's ID and full slug. Translation events send an empty `data` object.

---

## HTTP Request

Every webhook dispatch sends:

```
POST <webhook.url>
Content-Type: application/json
User-Agent: Localess-Webhook/1.0
webhook-id: <uuid>                  ← unique per dispatch; same value as the log's deliveryId
webhook-timestamp: <unix seconds>
webhook-signature: v1,<base64>      ← only when the webhook is signed
X-Webhook-Event: <event>
<custom headers from webhook.headers, minus reserved ones — see below>

Body: JSON-serialised WebhookPayload
```

- Timeout: **30 seconds**
- Retries: **none**
- Redirects: **not followed.** A 3xx is logged as an `HTTP` failure with its status code.
- Response body: at most 4 KB is read, which is all that gets logged.
- All enabled webhooks for an event fire concurrently via `Promise.allSettled()` (one failure does not block others). Each webhook signs its own copy of the payload, so no webhook ever sees another's signature.

### Destination restrictions (SSRF protection)

Delivery runs from the Localess server, inside your network, and the URL and headers are chosen by a space manager. So `apps/server/src/shared/utils/webhook-request.ts` limits where a webhook can go. Without these limits, a webhook, or a redirect from one, could reach internal services or a cloud metadata server (`169.254.169.254`, which on most clouds issues instance credentials) and the reply would show up in the webhook log.

- **URL** (`checkWebhookUrl`): `https:` only, on the default port, with no credentials in the URL. `localhost`, `*.localhost`, `*.internal`, `metadata.google.internal` and private IP literals are refused. The WHATWG URL parser normalises shorthand forms such as `0x7f.1` and `2130706433` before the check.
- **Resolved address** (`isBlockedAddress`, applied in the socket's DNS `lookup`): the connection is refused if the host resolves to any loopback, private, link-local, CGNAT, multicast, reserved or documentation range, IPv4 or IPv6, including IPv4-mapped IPv6. The check runs on the exact address being connected to, so DNS rebinding can't get around it.
- **Headers** (`sanitizeWebhookHeaders`): custom headers can't set `Host`, `Metadata-Flavor`, `Content-Length`, `Transfer-Encoding`, `Connection`, `Content-Type`, `User-Agent`, or any `X-Webhook-*` or `webhook-*` header: saving one is a 400 (`isReservedWebhookHeader`), and one stored before is dropped at delivery.
- **Local development** (`LOCALESS_WEBHOOK_ALLOW_INTERNAL=true`, default `false`): `http:` and local or private targets are allowed, and the resolved-address check is skipped, so a local receiver can be used. Never enable it in production.

A refused delivery sends nothing. It is logged as a `NETWORK` failure with `errorMessage` "Webhook URL is not allowed: …".

---

## Signing (Standard Webhooks)

Signing is optional ("Sign deliveries"). Most destinations don't need it: build and deploy hooks (GCP Cloud Build,
Netlify, Vercel, Cloudflare Pages), automation tools (Zapier, Make, n8n) and chat incoming webhooks authenticate the call
with a secret in their URL. Sign when the receiver is your own code (an API, a serverless function, an on-demand
revalidation route) and should check that a delivery is genuine.

Deliveries follow [Standard Webhooks](https://www.standardwebhooks.com) (`shared/utils/webhook-signature.ts`):

```
secret    = whsec_<base64 of 32 random bytes>       // made by the server, shown once
key       = base64-decode(secret without "whsec_")
signature = base64(HMAC-SHA256(key, "<webhook-id>.<webhook-timestamp>.<raw body>"))
header:   webhook-signature: v1,<signature>
```

The signature covers the delivery id and the time as well as the body, so a receiver can refuse a replayed delivery. It
is only in the header; the body has no signature field.

### Verifying a delivery

Use the `standardwebhooks` library (Node, Python, Go, PHP, Java, Ruby, Rust, C#…) on the **raw request body**, exactly
as received (don't re-serialise parsed JSON). It checks the signature and refuses a timestamp more than 5 minutes off:

```ts
import { Webhook } from 'standardwebhooks';

const webhook = new Webhook(process.env.LOCALESS_WEBHOOK_SECRET); // whsec_…
const payload = webhook.verify(rawBody, request.headers); // throws if it isn't genuine
```

### Regenerating

On the webhook's page, the Signing card: **Sign Deliveries** (an unsigned webhook), **Regenerate Secret** (asks first: the
old secret stops at once, so update the receiver), **Turn Off Signing**. A new secret is shown once in "Copy the signing
secret". Webhooks imported from Firebase keep their key (as `whsec_` of the same bytes), but the signature format is new:
the import warns, regenerate and update the receiver.

---

## Execution Logging

Every delivery — success or failure — inserts a `webhook_logs` row and emits a `webhook_logs` change event, so an open log view refreshes over SSE. `WebhookLog` is a discriminated union on `status`:

```typescript
enum WebhookStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

enum WebhookErrorType {
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  HTTP = 'HTTP',
}

interface WebhookLogBase {
  event: WebhookEvent;
  url: string;
  requestSize: number;
  data: ContentWebhookPayloadData | TranslationWebhookPayloadData;
  deliveryId: string;
  duration: number;       // milliseconds
  createdAt: string;      // ISO 8601
}

interface WebhookLogSuccess extends WebhookLogBase {
  status: WebhookStatus.SUCCESS;
  statusCode: number;
  statusText: string;
  responseBody?: string;
  responseBodyTruncated?: boolean;
}

interface WebhookLogFailure extends WebhookLogBase {
  status: WebhookStatus.FAILURE;
  errorType: WebhookErrorType;       // timeout | network | http
  statusCode?: number;
  statusText?: string;
  responseBody?: string;
  responseBodyTruncated?: boolean;
  errorMessage?: string;
}

type WebhookLog = WebhookLogSuccess | WebhookLogFailure;
```

Every delivery adds a row; `WebhookLogCleanupService` deletes rows older than `LOCALESS_WEBHOOK_LOG_DAYS` (30 by default) at start and every hour, and a webhook's rows go with it (see [Cleanup](#cleanup)). `GET …/webhooks/:webhookId/logs` returns one page, newest first: every delivery kept can be reached page by page; the frontend `WebhookService.findLogs()` takes a `PagedList`'s params. `event` is checked against the known events, like `status` and `error_type`, and `data` is the payload's data (`WebhookPayloadData`). Webhook and log ids are UUIDv7s; a `:webhookId` that isn't a UUID answers 404. The [WebhookDetailComponent](#frontend) shows the log history a page at a time, filtered and searched on the server.

---

## Dispatch Call Sites

| File                                                                         | Event                   |
|------------------------------------------------------------------------------|-------------------------|
| `apps/server/src/modules/contents/services/content.service.ts` — `publish()`              | `CONTENT_PUBLISHED`     |
| `apps/server/src/modules/contents/services/content.service.ts` — `unpublish()`            | `CONTENT_UNPUBLISHED`   |
| `apps/server/src/modules/contents/services/content.service.ts` — `update()`, `updateData()`, `delete()` | `CONTENT_CHANGED` |
| `apps/server/src/modules/translations/services/translation.service.ts` — `publish()` | `TRANSLATION_PUBLISHED` |
| `apps/server/src/modules/translations/services/translation.service.ts` — writes   | `TRANSLATION_CHANGED`   |
| `apps/server/src/modules/tasks/services/content-transfer.service.ts`, `translation-transfer.service.ts` — imports | `CONTENT_CHANGED` / `TRANSLATION_CHANGED` |

All call `WebhookDispatcher.dispatch(spaceId, event, data)` from `apps/server/src/shared/services/webhook-dispatcher.service.ts`.

> Translation pushes through the public MANAGE API (`POST /api/v1/.../translations/:locale`) do not dispatch webhooks.

---

## Cleanup

`webhook_logs.webhook_id` references `webhooks` with `on delete cascade`, so deleting a webhook (or its space) removes its logs in the same statement.

---

## Frontend

**Routes:** part of the **Developers** module (see [Open API](features/spaces/open-api.md) for the sibling module and route shell)

```
/features/spaces/:spaceId/developers/webhooks             [DEVELOPERS]  ← WebhooksComponent (list)
/features/spaces/:spaceId/developers/webhooks/:webhookId  [DEVELOPERS]  ← WebhookDetailComponent
```

**Form validation** (`WebhookDialogComponent`):
- `name`: required, 3–50 chars, no leading/trailing spaces
- `url`: required, max 2048 chars, `https://` (or `http://localhost` / `http://127.0.0.1` for local development) — error key `webhookUrl`. That client check is feedback only: on create and update the server applies the delivery rule (`checkWebhookUrl` with `LOCALESS_WEBHOOK_ALLOW_INTERNAL`, in `WebhookService`) and answers 400 "Webhook URL is not allowed: <reason>", which the toast shows. So local http is saved only where it can be delivered. Delivery checks the resolved address again, see [Destination restrictions](#destination-restrictions-ssrf-protection).
- When the URL has masked query values (editing), a hint says a `••••` keeps the stored value and a typed one replaces it
- `events`: required, at least one selected
- Headers (optional, "Add Header"): a name and a value per row. Editing, a header shows its name (fixed) and an empty value: left empty it is kept, typed it is replaced; removing the row removes the header
- "Sign deliveries" (adding only): the server makes a secret, shown once after saving; signing an existing webhook is on its page (Signing card)

Webhooks created in the app start enabled (`WebhookRepository.create` sets `enabled: true`); the column itself defaults to `false`, so a row written any other way (the Firebase import, a direct insert) sends nothing until it is enabled. `WebhooksComponent` (list view) shows one page from the server (`PagedList`, `ll-paginator`): the sort headers, the search box and the Status / Events filters change the query. Its columns: Name (and URL), Status, Signing ("Signed" / "Not signed", from `hasSecret`), Events, Updated At. It supports enable/disable toggle, edit, delete, and navigating into a webhook's detail page.

`WebhookDetailComponent` shows a webhook's log history one page at a time from the server (`PagedList`, `ll-paginator`; a new delivery reloads the page shown): search by log id, filter by event/status, plus enable/disable, edit, and delete actions.

---

## Implementation Files

| File                                             | Purpose                                                                   |
|--------------------------------------------------|---------------------------------------------------------------------------|
| `apps/server/src/infra/database/schema.ts`                  | `webhooks` and `webhook_logs` tables                                      |
| `packages/shared/src/models/webhook.model.ts`         | Types — `WebhookEvent` and friends (server and web)                       |
| `apps/server/src/modules/webhooks/controllers/webhook.controller.ts` | App API — CRUD, status toggle, logs, URL validation                   |
| `apps/server/src/shared/services/webhook-dispatcher.service.ts` | HTTP dispatch, HMAC signing, execution logging                         |
| `apps/server/src/shared/utils/webhook-request.ts`       | Destination checks (URL, resolved address, headers), guarded POST         |
| `apps/web/src/app/features/spaces/developers/webhooks/webhook.service.ts`     | Frontend HttpClient CRUD + log queries (live queries over SSE)            |
| `apps/web/src/app/features/spaces/developers/webhooks/webhook.validator.ts` | Form validators                                                           |
| `apps/web/src/app/features/spaces/developers/webhooks/`   | UI — list (`webhooks.component`), create/edit (`webhook-dialog/`), detail + log history (`webhook-detail/`) |
