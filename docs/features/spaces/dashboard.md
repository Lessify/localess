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

Shows `SpaceOverview` statistics from the selected space document. If the overview data is older than 24 hours, it shows a refresh prompt.

**Injected services:** `SpaceService`, `NotificationService`, `SpaceStore`

**Key behaviour:**
- Reads `SpaceStore.selectedSpace()` to display current overview stats
- Uses `effect()` to watch the selected space and detect stale overview (> 24h since `overview.updatedAt`)
- `calculateOverview()` — calls `SpaceService` to trigger a server-side recalculation of all counts and sizes, updates the `SpaceOverview` sub-document in Firestore

## Data Displayed

From `SpaceOverview`:
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

## Services Used

| Service | Purpose |
|---------|---------|
| `SpaceService` | Recalculate space overview stats |
| `NotificationService` | Snackbar feedback |
| `SpaceStore` | Read selected space + overview data |
