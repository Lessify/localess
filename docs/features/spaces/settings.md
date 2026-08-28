# Spaces — Settings Module

> Parent: [Spaces Overview](overview.md) · Related: [Auth Tokens](../../auth-tokens.md) · [CDN & Caching](../../cdn-caching.md)

## Purpose

Configure a specific space — manage locales, API tokens, visual editor integration, general metadata, and destructive danger-zone operations.

> Webhooks moved out of Settings into the **Developers** section — see [Webhooks](../../webhooks.md).

## Routes

```
/features/spaces/:spaceId/settings    [SPACE_MANAGEMENT]
  → redirects to /settings/general
  /general          ← GeneralComponent
  /locales          ← LocalesComponent
  /visual-editor    ← VisualEditorComponent
  /tokens           ← TokensComponent
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

Create and manage API access tokens, displayed in an `ll-table` with columns `id`, `name`, `version`, `permissions`, `usage`, `cacheTtl`, `updatedAt`, `actions` (`tokens.component.ts:76`). Tokens come in two shapes:
- **v1** — legacy tokens with an implicit, fixed permission set (`TOKEN_V1_IMPLICIT_PERMISSIONS`)
- **v2** — current tokens with explicit `permissions[]` and an optional `cacheTtl` override

`isTokenV2()` distinguishes the two at runtime, so v1 tokens still render sensibly in the table and edit dialog.

The permissions column is rendered via `permissionsToText()`, which joins the token's `TokenPermission` values into a comma-separated string (`tokens.component.ts:204-206`). The usage column shows a classification badge computed by `permissionsToUsage()` / `getTokenUsageInfo()`, which derives a human-readable usage category (e.g. read-only/public vs. draft/write access) from the permission set — for v1 tokens this is computed from `TOKEN_V1_IMPLICIT_PERMISSIONS` (`tokens.component.ts:208-209`).

**Key behaviour:**
- `openAddDialog()` / `openEditDialog(element)` — open `TokenDialogComponent` to create/edit a token
- `openRegenerateDialog(element)` — opens a `ConfirmationDialogComponent` warning that all clients using the current token immediately lose access, then calls `TokenService.regenerate()` to issue a new token value while keeping the same name/permissions/cacheTtl (`tokens.component.ts:156-178`)
- `openDeleteDialog(element)` — confirmation dialog then deletes the token
- `copied()` — snackbar feedback when a token ID is copied to clipboard

**Services:** `TokenService`, `NotificationService`

### TokenDialogComponent
Form fields (`token-dialog.component.ts:58-111`):
- `name` — token name
- `permissions[]` — rendered as checkboxes grouped by category (Translation, Content, Development), not a plain multiselect; `isPermissionSelected()` / `togglePermission()` manage the underlying form array. A computed `usageInfo` (via `getTokenUsageInfo()`) shows a live usage-classification badge as permissions are toggled.
- `cacheTtl` — optional numeric override (in seconds) for how long the CDN caches this token's redirect responses; `resetCacheTtl()` clears it back to the space/system default. See [CDN & Caching](../../cdn-caching.md) for how `cacheTtl` affects redirect `Cache-Control` behaviour on the backend (including `cacheTtl: 0` disabling caching entirely).

> See [Auth Tokens](../../auth-tokens.md) for the full token permission model and how tokens are validated on the CDN.

---

## VisualEditorComponent

Configure the **visual editor** integration — allows in-context editing when Localess is embedded in a preview environment. Settings include the preview URL and editor behaviour options.

**Services:** `SpaceService`, `NotificationService`

---

## DangerZoneComponent

Destructive, irreversible operations. Currently only one action is implemented:
- **Delete All Translations** — `deleteTranslations()` calls `TranslationService.deleteAll()` to remove every translation in the space

Requires explicit confirmation via `ConfirmationDialogComponent`. There is no "delete space" action here — space deletion is not implemented in this component.

**Services:** `TranslationService`, `NotificationService`, `MatDialog`

---

## Services Used

| Service | Purpose |
|---------|---------|
| `SpaceService` | Update space name and visual editor settings |
| `LocaleService` | CRUD for space locales |
| `TokenService` | CRUD for API tokens |
| `TranslationService` | Delete all translations (Danger Zone) |
| `NotificationService` | Snackbar feedback |
| `SpaceStore` | Read selected space data |
