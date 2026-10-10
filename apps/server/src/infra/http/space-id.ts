import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { isUuid } from '../database/id.js';
import type { Database } from '../database/database.module.js';
import { spaces } from '../database/schema.js';
import { isValidId } from './v1/id-param.js';
import { CONTENT_CACHE } from './v1/v1-request.js';
import { sendV1Error } from './v1/v1-response.js';

/**
 * Space ids are UUIDs, but a space imported from Firebase is still reachable on the public API by its Firestore
 * id (`legacy_id`): SDK configs and customer code carry it. Resolved once per request, before any controller, so
 * the rest of the server only ever sees the UUID. The App API is UUID-only: the SPA shows `legacyId`, but never
uses it as an id.
 */
export class SpaceIdResolver {
  // Legacy ids never change and a deleted space is a 404 further down anyway, so hits are cached for good.
  private readonly legacy = new Map<string, string>();

  constructor(private readonly db: Pick<Database, 'select'>) {}

  /** The space's UUID for a UUID or a legacy id; `undefined` when no space has that legacy id. */
  async resolve(spaceId: string): Promise<string | undefined> {
    if (isUuid(spaceId)) return spaceId;
    if (!isValidId(spaceId)) return undefined;
    const cached = this.legacy.get(spaceId);
    if (cached) return cached;
    const [space] = await this.db.select({ id: spaces.id }).from(spaces).where(eq(spaces.legacyId, spaceId));
    if (space) this.legacy.set(spaceId, space.id);
    return space?.id;
  }
}

/**
 * Rewrites a `/api/v1` `:spaceId` route param to the space's UUID; an id no space has answers 404. On the App API
 * anything but a UUID answers 404 here, before it can reach a `uuid` column.
 */
export function registerSpaceIdResolution(fastify: FastifyInstance, resolver: SpaceIdResolver): void {
  fastify.addHook('preHandler', async (request, reply) => {
    const params = request.params as Record<string, string> | undefined;
    const spaceId = params?.['spaceId'];
    if (spaceId === undefined || isUuid(spaceId)) return;
    const v1 = request.url.startsWith('/api/v1/');
    // A malformed id on the public API keeps its 400 from `validIdParams`, which runs before any query.
    if (v1 && ['spaceId', 'contentId', 'assetId'].some(name => name in params! && !isValidId(params![name]))) return;
    const id = v1 ? await resolver.resolve(spaceId) : undefined;
    if (id) {
      params!['spaceId'] = id;
      return;
    }
    if (v1) sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: CONTENT_CACHE });
    else void reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Space not found' });
    return reply;
  });
}
