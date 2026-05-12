You are investigating a Firebase billing spike in Localess.

Read these docs:
- [Billing & Cost](../docs/billing.md) — known spike causes, optimization log, monitoring tips
- [CDN & Caching](../docs/cdn-caching.md) — request flow and cache TTLs
- [Publish Flow](../docs/publish-flow.md) — when cache invalidation happens

Key config: `functions/src/config.ts`
Key handler: `functions/src/v1/cdn.ts`
