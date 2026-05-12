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
| Tasks | `/features/spaces/:spaceId/tasks` | `TRANSLATION_READ` | [tasks.md](tasks.md) |
| Open API | `/features/spaces/:spaceId/open-api` | authenticated | [open-api.md](open-api.md) |
| Settings | `/features/spaces/:spaceId/settings` | `SPACE_MANAGEMENT` | [settings.md](settings.md) |

---

## Common Patterns

- `SpaceStore` is injected in most modules to access the current `selectedSpace` and `selectedSpaceId`
- Import/export operations create a **Task** — they don't run inline. The user monitors progress in the [Tasks module](tasks.md)
- Publishing content/translations writes JSON to Firebase Storage and is tracked in the [Publish Flow](../../publish-flow.md)
- `isFormDirtyGuard` is applied to routed editor components (contents, schemas) to warn on unsaved changes
- Dialogs follow the pattern: open via `MatDialog.open()` → subscribe to `afterClosed()` → reload data on confirm
