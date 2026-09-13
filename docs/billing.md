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

### 4. Hosting bandwidth is billed on cache hits

**Hosting bills bytes egressed to the client, including CDN cache hits** — there is no "cache hit is
free" carve-out. A 100% edge hit rate and a 0% hit rate cost the same in Hosting bandwidth.

This matters because most of the log above optimizes a *different* meter. The `cv` redirect pattern,
the token cache and the merged Storage calls all reduce Function invocations, Firestore reads and
Storage API calls; **none of them reduce the Hosting GB meter**. Only three things do:

1. Fewer bytes per response (format, quality, right-sized images)
2. Fewer responses on the wire (browser cache, conditional requests)
3. Bytes that do not leave via Hosting at all (redirect to GCS, or a CDN in front)

When diagnosing a bandwidth spike specifically, start from the asset endpoint — JSON is KB-scale and
would need ~20M requests to reach 20 GB, while a single multi-MB asset needs only a few thousand.

---

## Optimization Decisions Log

| Date | Change | Impact |
|------|--------|--------|
| 2026-05 | Added `Cache-Control` header to all redirect responses | ~50% fewer Function invocations during publish stampede |
| 2026-05 | Merged `exists()` + `getMetadata()` into single Storage call | ~25% fewer Storage API calls |
| 2026-05 | In-memory token cache (5 min TTL) | ~50% fewer Firestore reads under load |
| 2026-05 | Redirect TTL unified to a flat 60s default (no separate draft TTL), overridable per-token via `cacheTtl` | Faster iteration with controlled CDN pressure, tunable per consumer |
| 2026-09 | Clamp `w`/`h` to source dimensions and to `MAX_OUTPUT_DIMENSION` (4096) | Removes upscaled responses, which exceeded the original's size; closes an amplification vector |
| 2026-09 | `DEFAULT_QUALITY` 85 → 80 | ~15–20% off every transformed JPEG/WebP without an explicit `?q=` |
| 2026-09 | Default `image/jpeg` output to WebP | ~40% measured on a 400×300 test asset (116 KB → 70 KB), **including bare no-param requests** — the only change that reaches embeds carrying no query string |
| 2026-09 | ETag + `304` on the asset endpoint, before transform | Revalidation costs a metadata read instead of a re-encode |
| 2026-09 | Merged `exists()` + `getMetadata()` on the asset path | One Storage round-trip instead of two; same fix applied to the content path in 2026-05 |
| 2026-09 | `v1` raised to 1GiB with explicit `concurrency: 20` | Companion to the WebP default: every JPEG request now decodes through sharp, making the function memory-bound on pixel buffers rather than request count |

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
