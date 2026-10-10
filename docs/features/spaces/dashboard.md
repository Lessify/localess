# Spaces — Dashboard Module

> Parent: [Spaces Overview](overview.md) · Related: [Concepts — Space](../../concepts.md)

## Purpose

Displays the numbers of the selected space: counters, asset storage and translation progress per locale. Acts as the
landing page after selecting a space.

## Route

```
/features/spaces/:spaceId/dashboard
```

No permission guard: any signed-in user with a role sees it, like the space itself.

## Key Files

```
apps/web/src/app/features/spaces/dashboard/
  dashboard.component.ts/html/scss
apps/server/src/modules/spaces/spaces.service.ts   ← overview()
```

## DashboardComponent

Reads `SpaceService.overview(spaceId)`: `GET /api/app/spaces/:spaceId/overview` (`@RequireAnyRole()`), computed by the
server on every request — nothing is stored. It is a live query: it refetches when translations, assets, contents or
schemas of the space change, or the space itself (its locales). There is no refresh button. A progress bar shows while
the first answer is pending; a failed request shows "The overview can not be loaded."

Change events are filtered per user (`canReceive`), so a user without, say, asset access sees the asset count change
only when the page is opened again.

## Data Displayed

```typescript
{
  counts:   { locales, translations, assets, contents, schemas },
  storage:  { assets, assetsWithoutSize },
  progress: { total, locales: [{ id, name, translated }] },
}
```

- **Overview:** Locales, Translation Keys, Asset Files (folders not counted), Content Documents (folders not counted),
  Schemas.
- **Storage:** Asset Files — the sum of `assets.size` (no storage reads). Files with no recorded size (imported from
  Firebase without their file) are counted in `assetsWithoutSize` and named under the size when there are any.
- **Translations:** one card per space locale, in the space's order: the share of keys with a non-empty value in that
  locale (the delivery rule), "N of total" and an `hlm-progress` bar. It counts the current values, not the published
  snapshot: a locale can show 100% before it is published.

The UI is built with Spartan/Helm components: `HlmCard` for each tile and `HlmProgress` for the bars.

## Services Used

| Service | Purpose |
|---------|---------|
| `SpaceService` | `overview(spaceId)`, live |
