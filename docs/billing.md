# Billing & Cost Optimization

> Related: [CDN & Caching](cdn-caching.md) · [Publish Flow](publish-flow.md)

## Firebase Services Used

| Service | What drives cost |
|---------|-----------------|
| **Firebase Hosting** | Requests to `/api/v1/**` (rewrites to Function) and static asset serving |
| **Cloud Functions** | Invocations, CPU time, memory — `publicv1` handles all CDN traffic |
| **Firestore** | Reads per request: token auth + space lookup (now cached) |
| **Firebase Storage** | `getMetadata()` per request + `download()` for content |

---

## Cost Per CDN Request (after optimizations)

### Cache hit (CDN serves response)
- **0 Function invocations** — no backend cost at all

### Cache miss, cv matches (CDN forwards to Function)
- 1 Function invocation
- 1 Storage `getMetadata()` (cache marker)
- 0 or 1 Firestore reads (token — served from in-memory cache if warm)
- 1 Storage `download()` (content JSON)

### Cache miss, cv stale or missing (redirect)
- 1 Function invocation
- 1 Storage `getMetadata()` (cache marker)
- 0 or 1 Firestore reads (token — cache)
- Redirect response (no Storage download)
- Client follows redirect → second invocation (cv now matches → serves content)

---

## Known Spike Causes

### 1. Thundering herd on publish
When content is published, all consumers receive a stale `cv` simultaneously. If the redirect response is not cached by CDN, every consumer hits the Function at the same time.

**Fix applied:** Redirect responses now carry `Cache-Control: public, max-age=60, s-maxage=60` by default (flat TTL, same for published and draft; overridable per-token via the `cacheTtl` field, with `cacheTtl: 0` disabling caching entirely). CDN caches the redirect, limiting the stampede to one wave per edge node.

### 2. Bot / crawler traffic
Once-a-month spikes of 2K → 5M requests suggest a periodic crawler (Googlebot, Bingbot, or a CI pipeline). These bypass CDN cache by using unique URLs or ignoring `cv`.

**Mitigation options:**
- Firebase App Check (requires changes on all API consumers)
- Cloudflare in front of Firebase Hosting (IP-level rate limiting)
- Monitor Firebase Hosting logs for unusual User-Agent patterns

### 3. Uncached token Firestore reads
Before optimization: every request read the token from Firestore.
After optimization: tokens are cached in-memory for 5 minutes (`TOKEN_CACHE_TTL_MS`).

---

## Optimization Decisions Log

| Date | Change | Impact |
|------|--------|--------|
| 2026-05 | Added `Cache-Control` header to all redirect responses | ~50% fewer Function invocations during publish stampede |
| 2026-05 | Merged `exists()` + `getMetadata()` into single Storage call | ~25% fewer Storage API calls |
| 2026-05 | In-memory token cache (5 min TTL) | ~50% fewer Firestore reads under load |
| 2026-05 | Redirect TTL unified to a flat 60s default (no separate draft TTL), overridable per-token via `cacheTtl` | Faster iteration with controlled CDN pressure, tunable per consumer |

---

## Monitoring Recommendations

- **Firebase Console → Hosting → Usage**: check if spikes are in rewrites (Functions) or static files
- **Firebase Console → Functions → publicv1**: invocation count and error rate
- **Firebase Console → Firestore → Usage**: read count spikes correlate with token cache misses
- **Firebase Console → Storage → Usage**: `getMetadata` and `download` call counts

---

## Configuration Reference

All cache TTL constants are in `functions/src/config.ts`:

```typescript
CACHE_MAX_AGE                  = DAY           // 86400s   — browser cache for content
CACHE_SHARE_MAX_AGE            = DAY * 7       // 604800s  — CDN cache for content
CACHE_REDIRECT_MAX_AGE_DEFAULT = MINUTE        // 60s      — default redirect TTL (published & draft; overridable per-token via `cacheTtl`)
CACHE_ASSET_MAX_AGE            = DAY * 365     // immutable assets
TOKEN_CACHE_TTL_MS             = 5 * 60 * 1000 // 5 min in-memory token cache
```
