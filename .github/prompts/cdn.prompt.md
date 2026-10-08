You are working on the Localess CDN layer.

Read these docs before making changes:
- [CDN & Caching](../docs/cdn-caching.md) — cv pattern, TTLs, redirect flow
- [Publish Flow](../docs/publish-flow.md) — when cache is invalidated
- [V1 Public API](../docs/v1-api.md) — endpoints, token auth, asset transforms

Key files:
- `server/src/public-api/cdn.controller.ts` — all CDN route handlers
- `server/src/public-api/cache-control.ts` — cache TTL constants
- `server/src/public-api/token-auth.service.ts` — token auth
- `server/src/public-api/asset-delivery.service.ts` — asset delivery and rendition cache
