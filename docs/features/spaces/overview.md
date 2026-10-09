# Spaces Features — Overview

> Related: [Concepts](../../concepts.md) · [Frontend Architecture](../../frontend-architecture.md) · [Frontend State](../../frontend-state.md)

## Purpose

The `spaces/` umbrella contains all features a user works with inside a single space — translating content, editing structured documents, managing assets, defining schemas, and monitoring tasks.

All routes are scoped to a specific space via `:spaceId` in the URL. The active space is tracked in `SpaceStore.selectedSpace`.

---

## Modules

| Module | Route | Guard | Doc |
|--------|-------|-------|-----|
| Dashboard | `/features/spaces/:spaceId/dashboard` | authenticated | [dashboard.md](dashboard.md) |
| Translations | `/features/spaces/:spaceId/translations` | `TRANSLATION_READ` | [translations.md](translations.md) |
| Contents | `/features/spaces/:spaceId/contents` | `CONTENT_READ` | [contents.md](contents.md) |
| Assets | `/features/spaces/:spaceId/assets` | `ASSET_READ` | [assets.md](assets.md) |
| Schemas | `/features/spaces/:spaceId/schemas` | `SCHEMA_READ` | [schemas.md](schemas.md) |
| Tasks | `/features/spaces/:spaceId/tasks` | any import/export permission† | [tasks.md](tasks.md) |
| Developers → Webhooks | `/features/spaces/:spaceId/developers/webhooks` | `DEV_WEBHOOK`* | [webhooks.md](../../webhooks.md) |
| Developers → Open API | `/features/spaces/:spaceId/developers/open-api` | `DEV_OPEN_API`* | [open-api.md](open-api.md) |
| Settings | `/features/spaces/:spaceId/settings` | `SPACE_MANAGEMENT` | [settings.md](settings.md) |

\* Unlike the other rows, `DEV_WEBHOOK`/`DEV_OPEN_API` are **not** enforced via a route `canActivate` guard — the `developers` route has none (`features-routing.module.ts`). They only control whether the Developers menu items are shown in the sidebar (`features.component.ts`).

† The Tasks route guard is `permissionGuard(...)` with all eight `*_IMPORT` / `*_EXPORT` permissions (any one passes, `features-routing.module.ts`), the same set the sidebar item checks (`USER_PERMISSIONS_IMPORT_EXPORT`, `features.component.ts`) and the server requires to read tasks.

Webhooks (under Developers) has no page in this folder — it is documented in [webhooks.md](../../webhooks.md).

---

## Common Patterns

- `SpaceStore` is injected in most modules to access the current `selectedSpace` and `selectedSpaceId`
- Import/export operations create a **Task** — they don't run inline. The user monitors progress in the [Tasks module](tasks.md)
- Publishing content/translations writes snapshot rows to Postgres (`content_published` / `translation_published`) and bumps the space's cache version; see the [Publish Flow](../../publish-flow.md)
- Lists stay current without manual refresh: services return `liveQuery` Observables that refetch when a matching change event arrives on the space's SSE stream (`GET /api/app/events`, `ChangeEventsService`)
- `isFormDirtyGuard` is applied to routed editor components (contents, schemas) to warn on unsaved changes
- Dialogs follow the pattern: open via `HlmDialogService.open(Component, { context, contentClass })` → pipe `.closed$` (`take(1)`, filter out `undefined`) → run the service call on confirm. `apps/web/src/app/features/spaces` imports nothing from `@angular/material` (e.g. `schemas/schemas.component.ts` `openAddDialog()`)
