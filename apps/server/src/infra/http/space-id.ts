import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { isUuid } from '../database/id.js';
import type { Database } from '../database/database.module.js';
import { spaces } from '../database/schema.js';
import { isValidId } from './v1/id-param.js';
import { CONTENT_CACHE } from './v1/v1-request.js';
import { sendV1Error } from './v1/v1-response.js';

/**
 * Space ids are UUIDs, but the old asset URLs of a space imported from Firebase carry its Firestore id
 * (`legacy_id`): customer sites, emails and CDNs keep them. On the public asset routes only, that id is resolved once
 * per request, before any controller, so the rest of the server only ever sees the UUID.
 */
export class SpaceIdResolver {
  constructor(private readonly db: Pick<Database, 'select'>) {}

  /**
   * The space's UUID for a UUID or a legacy id; `undefined` when no space has that legacy id. Not cached: a Firebase
   * space can be deleted and imported again under a new UUID, and the lookup is one indexed query on old asset URLs.
   */
  async resolve(spaceId: string): Promise<string | undefined> {
    if (isUuid(spaceId)) return spaceId;
    if (!isValidId(spaceId)) return undefined;
    const [space] = await this.db.select({ id: spaces.id }).from(spaces).where(eq(spaces.legacyId, spaceId));
    return space?.id;
  }
}

/**
 * Rewrites the `:spaceId` of a public asset route to the space's UUID. Any other non-UUID space id answers 404 here,
 * before it can reach a `uuid` column.
 */
const ASSET_ROUTE = /^\/api\/v1\/spaces\/[^/]+\/assets\//;

export function registerSpaceIdResolution(fastify: FastifyInstance, resolver: SpaceIdResolver): void {
  fastify.addHook('preHandler', async (request, reply) => {
    const params = request.params as Record<string, string> | undefined;
    const spaceId = params?.['spaceId'];
    if (spaceId === undefined || isUuid(spaceId)) return;
    const v1 = request.url.startsWith('/api/v1/');
    // A malformed id on the public API keeps its 400 from `validIdParams`, which runs before any query.
    if (v1 && ['spaceId', 'contentId', 'assetId'].some(name => name in params! && !isValidId(params![name]))) return;
    // An imported space's Firestore id still reaches its old asset URLs (customer sites, emails, CDNs); nothing else.
    const id = v1 && ASSET_ROUTE.test(request.url) ? await resolver.resolve(spaceId) : undefined;
    if (id) {
      params!['spaceId'] = id;
      return;
    }
    if (v1) sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: CONTENT_CACHE });
    else void reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Space not found' });
    return reply;
  });
}
