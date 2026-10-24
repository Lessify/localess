import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';

import type { Database } from '../../infra/database/database.module.js';
import { isUuid } from '../../infra/database/id.js';
import { firebaseImports, spaces } from '../../infra/database/schema.js';
import { isValidId } from '../../infra/http/v1/id-param.js';
import { CONTENT_CACHE } from '../../infra/http/v1/v1-request.js';
import { sendV1Error } from '../../infra/http/v1/v1-response.js';
import { importStatusOf, type SpaceImportStatus } from '../utils/import-status.js';

/** A space as the public API sees it before any controller: its UUID and whether an import is running or failed. */
export interface ResolvedSpace {
  id: string;
  importStatus: SpaceImportStatus | null;
}

/**
 * Space ids are UUIDs, but the old asset URLs of a space imported from Firebase carry its Firestore id
 * (`legacy_id`): customer sites, emails and CDNs keep them. On the public asset routes only, that id is resolved once
 * per request, before any controller, so the rest of the server only ever sees the UUID.
 */
export class SpaceIdResolver {
  constructor(private readonly db: Pick<Database, 'select'>) {}

  /**
   * The space for a UUID or a legacy id (the `source_space_id` of its `firebase_imports` row); `undefined` when no
   * space has it (or the id is malformed). Not cached: a Firebase space can be deleted and imported again under a new
   * UUID, and its import status changes while it imports.
   */
  async resolve(spaceId: string): Promise<ResolvedSpace | undefined> {
    if (!isUuid(spaceId) && !isValidId(spaceId)) return undefined;
    const [space] = await this.db
      .select({ id: spaces.id, importStatus: importStatusOf(firebaseImports.status) })
      .from(spaces)
      .leftJoin(firebaseImports, eq(firebaseImports.spaceId, spaces.id))
      .where(isUuid(spaceId) ? eq(spaces.id, spaceId) : eq(firebaseImports.sourceSpaceId, spaceId));
    return space;
  }
}

/**
 * Rewrites the `:spaceId` of a public asset route to the space's UUID. Any other non-UUID space id answers 404 here,
 * before it can reach a `uuid` column.
 */
const ASSET_ROUTE = /^\/api\/v1\/spaces\/[^/]+\/assets\//;

/**
 * A space being imported from Firebase (or whose import failed) is half there: answer 503 and let nothing cache it, or
 * a missing asset would be cached as gone for a week, long after the import has finished.
 */
function sendImportInProgress(reply: FastifyReply, importStatus: SpaceImportStatus): void {
  void reply.header('retry-after', '60');
  sendV1Error(reply, 503, 'unavailable', importUnavailableMessage(importStatus), { cacheControl: 'no-store' });
}

/** The 503 message for a space whose import runs or failed (here for the CDN, in the management guard after the token). */
export const importUnavailableMessage = (importStatus: SpaceImportStatus): string =>
  importStatus === 'FAILED' ? 'The import of this space failed: delete the space and import it again' : 'This space is being imported';

export function registerSpaceIdResolution(fastify: FastifyInstance, resolver: SpaceIdResolver): void {
  fastify.addHook('preHandler', async (request, reply) => {
    const params = request.params as Record<string, string> | undefined;
    const spaceId = params?.['spaceId'];
    if (spaceId === undefined) return;
    // The Management API authenticates first: its guard checks the token, then the import status (nothing leaks to a
    // caller without a token).
    if (request.url.startsWith('/api/manage/')) return;
    const v1 = request.url.startsWith('/api/v1/');
    if (isUuid(spaceId)) {
      if (!v1) return;
      // Unknown UUIDs carry on to the route, which answers its own (cached) 404.
      const space = await resolver.resolve(spaceId);
      if (space?.importStatus) {
        sendImportInProgress(reply, space.importStatus);
        return reply;
      }
      return;
    }
    // A malformed id on the CDN API keeps its 400 from the token guard, which runs before any query.
    if (v1 && ['spaceId', 'contentId', 'assetId'].some(name => name in params! && !isValidId(params![name]))) return;
    // An imported space's Firestore id still reaches its old asset URLs (customer sites, emails, CDNs); nothing else.
    const assetRoute = v1 && ASSET_ROUTE.test(request.url);
    const space = assetRoute ? await resolver.resolve(spaceId) : undefined;
    if (space?.importStatus) {
      sendImportInProgress(reply, space.importStatus);
      return reply;
    }
    if (space) {
      params!['spaceId'] = space.id;
      return;
    }
    // An old asset URL whose space is not imported yet must not be cached as gone: it works once the import has run.
    if (v1) sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: assetRoute ? 'no-cache' : CONTENT_CACHE });
    else void reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Space not found' });
    return reply;
  });
}
