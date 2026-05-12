# Spaces — Settings Module

> Parent: [Spaces Overview](overview.md) · Related: [Auth Tokens](../../auth-tokens.md) · [CDN & Caching](../../cdn-caching.md)

## Purpose

Configure a specific space — manage locales, API tokens, webhooks, visual editor integration, general metadata, and destructive danger-zone operations.

## Routes

```
/features/spaces/:spaceId/settings    [SPACE_MANAGEMENT]
  → redirects to /settings/general
  /general          ← GeneralComponent
  /locales          ← LocalesComponent
  /visual-editor    ← VisualEditorComponent
  /tokens           ← TokensComponent
  /webhooks         ← WebhooksComponent
  /danger-zone      ← DangerZoneComponent
```

## Key Files

```
src/app/features/spaces/settings/
  settings.component.ts/html/scss     ← tab container
  general/
  locales/
    locale-dialog/
  visual-editor/
  tokens/
    token-dialog/
  webhooks/
    webhook-dialog/
  danger-zone/
```

## SettingsComponent

Tab-based shell. Tracks active tab as a signal, navigates between child routes on tab change.

---

## GeneralComponent

Edit the space name and other top-level space metadata. Reads current data from `SpaceStore.selectedSpace()`.

**Services:** `SpaceService`, `NotificationService`, `SpaceStore`

---

## LocalesComponent

Add, reorder, and remove locales from the space. Set the **fallback locale** — used by the CDN when a requested locale has no published data.

**Services:** `LocaleService` (or `SpaceService`), `NotificationService`

### LocaleDialogComponent
Form: locale `id` (BCP 47 code, e.g. `en`, `de`, `fr-CH`) and display `name`.

---

## TokensComponent

Create and manage API access tokens. Each token has a name and a set of `TokenPermission` values.

**Services:** `TokenService`, `NotificationService`

### TokenDialogComponent
Form: token `name`, `permissions[]` (multiselect of `TokenPermission` enum).

> See [Auth Tokens](../../auth-tokens.md) for the full token permission model and how tokens are validated on the CDN.

---

## VisualEditorComponent

Configure the **visual editor** integration — allows in-context editing when Localess is embedded in a preview environment. Settings include the preview URL and editor behaviour options.

**Services:** `SpaceService`, `NotificationService`

---

## WebhooksComponent

Create and manage webhooks that fire on space events (e.g. content published, translation published).

**Services:** `WebHookService`, `NotificationService`

### WebhookDialogComponent
Form: `name`, `url`, event triggers, optional secret header.

---

## DangerZoneComponent

Destructive, irreversible operations:
- **Delete space** — removes the space and all its data (content, translations, schemas, assets, tokens, tasks)

Always requires explicit confirmation via `ConfirmationDialogComponent`.

**Services:** `SpaceService`, `NotificationService`, `Router` (redirects after deletion)

---

## Services Used

| Service | Purpose |
|---------|---------|
| `SpaceService` | Update space name, delete space |
| `LocaleService` | CRUD for space locales |
| `TokenService` | CRUD for API tokens |
| `WebHookService` | CRUD for webhooks |
| `NotificationService` | Snackbar feedback |
| `SpaceStore` | Read selected space data |
