import { Controller, Get, Inject, Req, Res } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../auth/decorators.js';
import { DATABASE, Database } from '../database/database.module.js';
import { schemas } from '../database/schema.js';
import { generateOpenApi } from '../domain/lib/open-api.service.js';
import { docSchemaToExport } from '../domain/lib/schema.utils.js';
import { storedLocaleValues } from '../domain/lib/translation.utils.js';
import { Schema, TokenPermission } from '../domain/models/index.js';
import { schemaFromRow, translationFromRow } from '../domain/row-mappers.js';
import { CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE, publicCache } from './cache-control.js';
import { validIdParams } from './cdn.controller.js';
import { PublicContentService } from './public-content.service.js';
import { TokenAuthService } from './token-auth.service.js';
import { sendV1Error } from './v1-response.js';

type Params = Record<string, string>;

/** Read-only developer endpoints (`?token=` with DEV_TOOLS), ported from functions/src/v1/dev-tools.ts. */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class DevToolsController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly content: PublicContentService,
    private readonly tokens: TokenAuthService,
  ) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return false;
    const { token } = request.query as Record<string, string | undefined>;
    return (await this.tokens.authorize(reply, params['spaceId'], token, [TokenPermission.DEV_TOOLS], { cached: true })) !== undefined;
  }

  private async schemaRows(spaceId: string) {
    // Firestore returned documents ordered by id (byte order); exports keep that order.
    return this.db
      .select()
      .from(schemas)
      .where(eq(schemas.spaceId, spaceId))
      .orderBy(sql`${schemas.id} collate "C"`);
  }

  @Get()
  async space(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.authorize(request, reply))) return;
    const space = await this.content.findSpace((request.params as Params)['spaceId']);
    if (!space) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE) });
      return;
    }
    void reply.send({
      id: space.id,
      name: space.name,
      locales: space.locales,
      localeFallback: space.localeFallback,
      createdAt: space.createdAt.toISOString(),
      updatedAt: space.updatedAt.toISOString(),
    });
  }

  @Get('open-api')
  async openApi(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.authorize(request, reply))) return;
    const spaceId = (request.params as Params)['spaceId'];
    if (!(await this.content.findSpace(spaceId))) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE) });
      return;
    }
    const schemaById = new Map<string, Schema>((await this.schemaRows(spaceId)).map(row => [row.id, schemaFromRow(row)]));
    void reply.send(generateOpenApi(schemaById));
  }

  /**
   * The values stored for one locale, with no fallback filling: a key the locale has no value for is
   * absent. For round-tripping through files (`localess translation pull --raw` → edit → push).
   */
  @Get('translations/:locale/values')
  async translationValues(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.authorize(request, reply))) return;
    const { spaceId, locale } = request.params as Params;
    const space = await this.content.findSpace(spaceId);
    if (!space) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: 'no-cache' });
      return;
    }
    if (!space.locales.some(it => it.id === locale)) {
      sendV1Error(reply, 400, 'invalid-argument', 'Locale not supported by this space', {
        details: `Locale ${locale} is not in space locales`,
        cacheControl: 'no-cache',
      });
      return;
    }
    const rows = await this.content.findTranslations(spaceId);
    const values = storedLocaleValues(new Map(rows.map(row => [row.id, translationFromRow(row)])), locale);
    void reply.header('cache-control', 'no-cache').send(values);
  }

  @Get('schemas')
  async schemaExport(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.authorize(request, reply))) return;
    const spaceId = (request.params as Params)['spaceId'];
    if (!(await this.content.findSpace(spaceId))) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE) });
      return;
    }
    const rows = await this.schemaRows(spaceId);
    void reply.send(rows.map(row => docSchemaToExport(row.id, schemaFromRow(row))));
  }
}
