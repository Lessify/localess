You are working on the Localess CDN layer.

Read these docs before making changes:
- [CDN & Caching](../../docs/cdn-caching.md) — cv pattern, TTLs, redirect flow
- [Publish Flow](../../docs/publish-flow.md) — when cache is invalidated
- [V1 Public API](../../docs/v1-api.md) — endpoints, token auth, asset transforms

Key files:
- `apps/server/src/modules/{contents,translations,assets}/*.public.controller.ts` — the CDN route handlers; shared plumbing in `apps/server/src/infra/http/v1/`
- `apps/server/src/infra/http/v1/cache-control.ts` — cache TTL constants
- `apps/server/src/auth/api-tokens/token-auth.service.ts` — token auth
- `apps/server/src/modules/assets/asset-delivery.service.ts` — asset delivery and rendition cache
