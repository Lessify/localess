import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

/*
 * Serves the Angular build from the same port as the API, reproducing what Firebase Hosting did
 * (see the `hosting` block of the former firebase.json): security headers on every non-API response, immutable caching for hashed bundles, no-cache for the service worker.
 * The SPA fallback to index.html lives in `SpaFallbackFilter`.
 */

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-hashes' 'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc='",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  // The SPA checks GitHub for new releases.
  "connect-src 'self' https://api.github.com",
  "frame-src 'self' https: http://localhost:* http://127.0.0.1:*",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy-report-only': CONTENT_SECURITY_POLICY,
  'x-frame-options': 'SAMEORIGIN',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

// Angular output hashing: `main.<16+ hex>.js`, `styles.<hex>.css`, `chunk-<HASH>.js`.
const HASHED_ASSET = /[.-][0-9A-Za-z]{8,}\.(css|js)$/;
const NO_CACHE = /^\/(ngsw-worker\.js|ngsw\.json|index\.html)$/;

export function isApiPath(url: string): boolean {
  return url === '/api' || url.startsWith('/api/') || url.startsWith('/api?');
}

function cacheControlFor(pathname: string): string | undefined {
  if (NO_CACHE.test(pathname)) return 'no-cache';
  if (HASHED_ASSET.test(pathname)) return 'public,max-age=31536000,immutable';
  return undefined;
}

export async function registerStaticSite(fastify: FastifyInstance, root: string): Promise<void> {
  fastify.addHook('onSend', async (request, reply) => {
    if (isApiPath(request.url)) return;
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      reply.header(name, value);
    }
  });

  await fastify.register(fastifyStatic, {
    root,
    wildcard: false,
    index: false,
    // Cache-Control is decided per file below, not by @fastify/static.
    cacheControl: false,
    setHeaders: (res, filePath) => {
      const cacheControl = cacheControlFor(
        '/' +
          filePath
            .slice(root.length + 1)
            .split('\\')
            .join('/'),
      );
      if (cacheControl) void res.header('cache-control', cacheControl);
    },
  });
}
