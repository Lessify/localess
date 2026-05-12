You are working on the Localess CDN layer.

Read these docs before making changes:
- [CDN & Caching](../docs/cdn-caching.md) — cv pattern, TTLs, redirect flow
- [Publish Flow](../docs/publish-flow.md) — when cache is invalidated
- [Billing & Cost](../docs/billing.md) — cost impact of changes

Key files:
- `functions/src/v1/cdn.ts` — all CDN route handlers
- `functions/src/config.ts` — cache TTL constants
- `functions/src/v1/middleware/query-auth.middleware.ts` — token auth
