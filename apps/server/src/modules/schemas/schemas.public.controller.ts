import { Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Schema, SchemaExport } from '@localess/shared';
import { zSchemaPushSchema } from '@localess/shared/zod';
import { TokenAuthService } from '../../auth/api-tokens/token-auth.service.js';
import { Public } from '../../auth/decorators.js';
import { DATABASE, Database } from '../../infra/database/database.module.js';
import { schemas, spaces } from '../../infra/database/schema.js';
import { CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE, publicCache } from '../../infra/http/v1/cache-control.js';
import { Params } from '../../infra/http/v1/v1-request.js';
import { sendV1Error } from '../../infra/http/v1/v1-response.js';
import { SpacesService } from '../spaces/spaces.service.js';
import { generateOpenApi } from './open-api.service.js';
import { applySchemaPushPlan } from './schema-push.js';
import { schemaFromRow } from './schema-row.js';
import { docSchemaToExport, planSchemaPush } from './schema.utils.js';

/**
 * Schemas on the public API, for developers and the CLI: the OpenAPI document and the schema export
 * (DEV_TOOLS `?token=`), and the schema push (`X-API-KEY` with DEV_TOOLS). Ported from
 * functions/src/v1/{dev-tools,manage}.ts.
 */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class SchemasPublicController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly spaces: SpacesService,
    private readonly tokens: TokenAuthService,
  ) {}

  private async schemaRows(spaceId: string) {
    // Firestore returned documents ordered by id (byte order); exports keep that order.
    return this.db
      .select()
      .from(schemas)
      .where(eq(schemas.spaceId, spaceId))
      .orderBy(sql`${schemas.id} collate "C"`);
  }

  @Get('open-api')
  async openApi(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeDevTools(request, reply))) return;
    const spaceId = (request.params as Params)['spaceId'];
    if (!(await this.spaces.findSpace(spaceId))) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE) });
      return;
    }
    const schemaById = new Map<string, Schema>((await this.schemaRows(spaceId)).map(row => [row.id, schemaFromRow(row)]));
    void reply.send(generateOpenApi(schemaById));
  }

  @Get('schemas')
  async schemaExport(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeDevTools(request, reply))) return;
    const spaceId = (request.params as Params)['spaceId'];
    if (!(await this.spaces.findSpace(spaceId))) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE) });
      return;
    }
    const rows = await this.schemaRows(spaceId);
    void reply.send(rows.map(row => docSchemaToExport(row.id, schemaFromRow(row))));
  }

  @Post('schemas')
  @HttpCode(200)
  async pushSchemas(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeApiKey(request, reply))) return;
    const { spaceId } = request.params as Params;
    const body = zSchemaPushSchema.safeParse(request.body);
    if (!body.success) {
      sendV1Error(reply, 400, 'invalid-argument', 'Bad request body', { details: body.error });
      return;
    }
    const { dryRun, type, schemas: pushed } = body.data;
    if (!(await this.spaces.findSpace(spaceId))) {
      sendV1Error(reply, 404, 'not-found', 'Not found');
      return;
    }
    const rows = await this.db.select().from(schemas).where(eq(schemas.spaceId, spaceId));
    const existing = new Map<string, Schema>(rows.map(row => [row.id, schemaFromRow(row)]));
    const plan = planSchemaPush(existing, pushed as SchemaExport[], type);
    if (plan.errors.length > 0) {
      sendV1Error(reply, 400, 'failed-precondition', 'Referential integrity check failed', { details: { errors: plan.errors } });
      return;
    }
    const ids = { created: plan.creates.map(it => it.id), updated: plan.updates.map(it => it.id), deleted: plan.deletes };
    const counts = {
      created: ids.created.length,
      updated: ids.updated.length,
      deleted: ids.deleted.length,
      unchanged: plan.unchanged.length,
    };
    if (dryRun) {
      void reply.send({
        message: `[DryRun] Would create ${counts.created}, update ${counts.updated}, delete ${counts.deleted} schemas (${counts.unchanged} unchanged)`,
        counts,
        ids,
        dryRun: true,
      });
      return;
    }
    await this.db.transaction(async tx => {
      await applySchemaPushPlan(tx, spaceId, plan);
      // Schemas shape the draft output (locale extraction), so content drafts change too.
      await tx
        .update(spaces)
        .set({ contentVersion: sql`${spaces.contentVersion} + 1` })
        .where(eq(spaces.id, spaceId));
    });
    void reply.send({
      message: `Created ${counts.created}, updated ${counts.updated}, deleted ${counts.deleted} schemas (${counts.unchanged} unchanged)`,
      counts,
      ids,
    });
  }
}
