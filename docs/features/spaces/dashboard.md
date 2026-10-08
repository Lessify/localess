# Spaces — Dashboard Module

> Parent: [Spaces Overview](overview.md) · Related: [Concepts — Space](../../concepts.md)

## Purpose

Displays an overview of the selected space — counts and storage sizes for content, translations, schemas, assets, and tasks. Acts as the landing page after selecting a space.

## Route

```
/features/spaces/:spaceId/dashboard
```

## Key Files

```
src/app/features/spaces/dashboard/
  dashboard.component.ts/html/scss
```

## DashboardComponent

Shows `SpaceOverview` statistics from the selected space document. If the overview is missing or older than 24 hours, it is recalculated automatically — there is no refresh prompt. A manual refresh button (`lucideRotateCw`) is shown in the toolbar for users with `SPACE_MANAGEMENT`.

The UI is built with Spartan/Helm components: `HlmCard` for each stat tile, `HlmButton` for the refresh button, and `HlmProgress` for the per-locale translation progress bars.

**Injected services:** `SpaceService`, `NotificationService`, `SpaceStore`

**Key behaviour:**
- Reads `SpaceStore.selectedSpace()` to display current overview stats
- Uses `effect()` in the constructor to watch the selected space; when `overview` is `undefined` or stale (> 24h since `overview.updatedAt`) it calls `calculateOverview()` automatically
- `calculateOverview()` — also bound to the manual refresh button; calls `SpaceService.calculateOverview()` (`POST /api/app/spaces/:id/overview`), which recalculates all counts and sizes with SQL and stores them in the space's `overview` column. The space's change event then refreshes `SpaceStore`. The endpoint accepts any signed-in user with role `admin` or `custom` (`@RequireAnyRole()`), the same audience that can read the space, because the automatic refresh runs for everyone who opens the dashboard

## Data Displayed

Locales count comes from `space.locales.length` (not part of `SpaceOverview`). The rest comes from `SpaceOverview` (`updatedAt` is an ISO string). Translation and content sizes are the size of the published JSON in Postgres (`translation_published` / `content_published`); asset and task sizes are the bytes under `spaces/{spaceId}/assets/` and `spaces/{spaceId}/tasks/` in storage:
```typescript
{
  translationsCount, translationsSize,
  assetsCount, assetsSize,
  contentsCount, contentsSize,
  schemasCount,
  tasksCount, tasksSize,
  totalSize,
  updatedAt
}
```

When `space.progress.translations` is present, a Translations section shows one card per locale with the translated count vs. `translationsCount` and an `hlm-progress` bar.

## Services Used

| Service | Purpose |
|---------|---------|
| `SpaceService` | Recalculate space overview stats |
| `NotificationService` | Snackbar feedback |
| `SpaceStore` | Read selected space + overview data |
