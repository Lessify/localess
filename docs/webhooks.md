# Webhooks

> Related: [Concepts](concepts.md) · [Publish Flow](publish-flow.md) · [Space Settings](features/spaces/settings.md)

Webhooks deliver HTTP POST notifications to external URLs when content or translation events occur in a space. Each webhook is scoped to a space, can subscribe to multiple events, and optionally signs payloads with HMAC-SHA256.

---

## Firestore Structure

```
spaces/{spaceId}/webhooks/{webhookId}          — webhook config
spaces/{spaceId}/webhooks/{webhookId}/logs/{logId}  — execution history (max 100 per webhook)
```

**Access control:** `SPACE_MANAGEMENT` permission required for all read/write operations on both collections.

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Events

| Event                   | Value                   | Triggered by                                      |
|-------------------------|-------------------------|---------------------------------------------------|
| `CONTENT_PUBLISHED`     | `content.published`     | `publish` callable                                |
| `CONTENT_UNPUBLISHED`   | `content.unpublished`   | `unpublish` callable                              |
| `CONTENT_CHANGED`       | `content.changed`       | Firestore `onDocumentUpdate` / `onDocumentDelete` |
| `TRANSLATION_PUBLISHED` | `translation.published` | `publish` callable                                |
| `TRANSLATION_CHANGED`   | `translation.changed`   | `generateTranslationsDraft()`                     |

---

## Payload

```typescript
interface WebHookPayload {
  event: WebHookEvent;
  spaceId: string;
  timestamp: string;           // ISO 8601
  data: ContentWebHookPayloadData | TranslationWebHookPayloadData;
  signature?: string;          // present only if secret is configured
}
```

Content events include `contentId` in `data`. Translation events send an empty `data` object.

---

## HTTP Request

Every webhook dispatch sends:

```
POST <webhook.url>
Content-Type: application/json
User-Agent: Localess-WebHook/1.0
X-Webhook-Event: <event>
X-Webhook-Signature: sha256=<hex>   ← only if secret is set
<any custom headers from webhook.headers>

Body: JSON-serialised WebHookPayload
```

- Timeout: **30 seconds**
- Retries: **none**
- All enabled webhooks for an event fire concurrently via `Promise.allSettled()` (one failure does not block others)

---

## HMAC Signing

When a webhook has a `secret`, the payload is signed before dispatch:

```
signature = HMAC-SHA256(secret, JSON.stringify(payload))
header:  X-Webhook-Signature: sha256=<hex_digest>
field:   payload.signature = "sha256=<hex_digest>"
```

The signature appears in both the header and the payload body.

---

## Execution Logging

Every dispatch — success or failure — writes a log entry to the `logs` subcollection:

```typescript
interface WebHookLog {
  event: WebHookEvent;
  status: 'success' | 'failure';
  statusCode?: number;
  duration: number;       // milliseconds
  errorMessage?: string;
  createdAt: Timestamp;
}
```

Logs are ordered by `createdAt` descending, capped at **100 entries** per webhook. The UI shows the last 20.

---

## Trigger Call Sites

| File                                                                                                              | Event                   |
|-------------------------------------------------------------------------------------------------------------------|-------------------------|
| `functions/src/contents.ts` — `publish` callable                                                                  | `CONTENT_PUBLISHED`     |
| `functions/src/contents.ts` — `unpublish` callable                                                                | `CONTENT_UNPUBLISHED`   |
| `functions/src/contents.ts` — `onDocumentUpdate` / `onDocumentDelete`                                             | `CONTENT_CHANGED`       |
| `functions/src/translations.ts` — `publish` callable                                                              | `TRANSLATION_PUBLISHED` |
| `functions/src/translations.ts` / `functions/src/services/translation.service.ts` — `generateTranslationsDraft()` | `TRANSLATION_CHANGED`   |

All call `triggerWebHooksForEvent(spaceId, payload)` from `functions/src/utils/webhook-utils.ts`.

---

## Cleanup

A Firestore `onDocumentDeleted` trigger in `functions/src/webhooks.ts` recursively deletes the `logs` subcollection when a webhook document is deleted.

---

## Frontend

**Route:** `/features/spaces/:spaceId/settings/webhooks`

**Form validation:**
- `name`: required, 3–50 chars, no leading/trailing spaces
- `url`: required, must match `^https?:\/\/.+`
- `events`: required, at least one selected
- `secret`: optional, displayed as a password field

Webhooks are created with `enabled: true` by default. The list view supports enable/disable toggle, edit, delete, and a side sheet showing the last 20 log entries per webhook.

---

## Implementation Files

| File                                             | Purpose                                                                   |
|--------------------------------------------------|---------------------------------------------------------------------------|
| `functions/src/models/webhook.model.ts`          | Backend types — `WebHook`, `WebHookEvent`, `WebHookPayload`, `WebHookLog` |
| `functions/src/services/webhook.service.ts`      | Backend Firestore queries                                                 |
| `functions/src/utils/webhook-utils.ts`           | HTTP dispatch, HMAC signing, execution logging                            |
| `functions/src/webhooks.ts`                      | `onDocumentDeleted` cleanup trigger                                       |
| `src/app/shared/models/webhook.model.ts`         | Frontend types                                                            |
| `src/app/shared/services/webhook.service.ts`     | Frontend Firestore CRUD + log queries                                     |
| `src/app/shared/validators/webhook.validator.ts` | Form validators                                                           |
| `src/app/features/spaces/settings/webhooks/`     | UI — list, create/edit dialog, log sheet                                  |
