# Spaces — Open API Module

> Parent: [Spaces Overview](overview.md) · Sibling: [Webhooks](../../webhooks.md) · Related: [CDN & Caching](../../cdn-caching.md) · [Auth Tokens](../../auth-tokens.md)

## Purpose

Renders an interactive OpenAPI UI (Stoplight Elements) for the space's public REST API. Allows developers to explore and test the CDN endpoints directly from the CMS.

This module lives under the **Developers** section alongside [Webhooks](../../webhooks.md), rendered via `DevelopersComponent`'s `<router-outlet>`.

## Route

```
/features/spaces/:spaceId/developers/open-api
```

The `developers` route has `roleGuard(DEVELOPERS)` (`features-routing.module.ts`), as the server's
`@RequireRole(DEVELOPERS)` on `POST …/open-api` (see [Spaces Overview](overview.md#modules)).

## Key Files

```
apps/web/src/app/features/spaces/developers/
  developers.component.ts/html/scss        ← shell, router-outlet only
  developers-routing.module.ts             ← redirects '' to 'webhooks'; children: webhooks, webhooks/:webhookId, open-api
  open-api/
    open-api.component.ts/html/scss
    stoplight-elements.d.ts                ← type declaration for the '@stoplight/elements/web-components.min.js' import
```

## OpenApiComponent

Renders the spec with the Stoplight Elements web component `<elements-api>` (`router="memory"`, `layout="sidebar"`). The component uses `CUSTOM_ELEMENTS_SCHEMA` to allow non-Angular web components in the template.

The Elements bundle (~2MB) is lazy-loaded on this route only via `import('@stoplight/elements/web-components.min.js')` rather than a global `angular.json` script. Once it resolves, the `elementsReady` signal is set; until both the bundle and the spec are available, an `hlm-progress` bar is shown instead.

**Injected services:** `OpenApiService`, `SpaceStore`

**Key behaviour:**
- `ngOnInit()` — reads `spaceId` from `spaceStore.selectedSpaceId()` and calls `OpenApiService.generate(spaceId)`, which calls `POST /api/app/spaces/:spaceId/open-api` and returns the spec serialized as a string; then starts loading the Elements bundle. The endpoint requires a developer or an admin (`@RequireRole(DEVELOPERS)`), the same list the route and the sidebar item check
- Passes the generated spec (as `apiDescriptionDocument`) to the web component for rendering
- The spec covers all CDN endpoints: translations, links, content by slug, content by ID, assets

## Services Used

| Service | Purpose |
|---------|---------|
| `OpenApiService` | Generates the OpenAPI 3.0 spec document for the space |
