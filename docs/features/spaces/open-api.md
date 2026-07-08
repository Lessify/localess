# Spaces — Open API Module

> Parent: [Spaces Overview](overview.md) · Sibling: [Webhooks](../../webhooks.md) · Related: [CDN & Caching](../../cdn-caching.md) · [Auth Tokens](../../auth-tokens.md)

## Purpose

Renders an interactive OpenAPI / Swagger UI for the space's public REST API. Allows developers to explore and test the CDN endpoints directly from the CMS.

This module lives under the **Developers** section alongside [Webhooks](../../webhooks.md), rendered via `DevelopersComponent`'s `<router-outlet>`.

## Route

```
/features/spaces/:spaceId/developers/open-api    [DEV_OPEN_API permission]
```

## Key Files

```
src/app/features/spaces/developers/
  developers.component.ts/html/scss        ← shell, router-outlet only
  developers-routing.module.ts             ← redirects '' to 'webhooks'; children: webhooks, webhooks/:webhookId, open-api
  open-api/
    open-api.component.ts/html/scss
```

## OpenApiComponent

Uses a web component (`<elements-api>` or similar Swagger UI element) to render the OpenAPI spec. The component uses `CUSTOM_ELEMENTS_SCHEMA` to allow non-Angular web components in the template.

**Injected services:** `OpenApiService`

**Key behaviour:**
- `ngOnInit()` — calls `OpenApiService.generate(spaceId)` to produce the OpenAPI spec JSON for the current space
- Passes the generated spec to the web component for rendering
- The spec covers all CDN endpoints: translations, links, content by slug, content by ID, assets

## Services Used

| Service | Purpose |
|---------|---------|
| `OpenApiService` | Generates the OpenAPI 3.0 spec document for the space |
