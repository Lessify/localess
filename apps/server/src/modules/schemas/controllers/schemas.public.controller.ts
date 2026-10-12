import { Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SchemaExport } from '@localess/shared';
import { zSchemaPushSchema } from '@localess/shared/zod';
import { TokenAuthService } from '../../../auth/services/token-auth.service.js';
import { Public } from '../../../auth/decorators.js';
import { CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE, publicCache } from '../../../infra/http/v1/cache-control.js';
import { Params } from '../../../infra/http/v1/v1-request.js';
import { sendV1Error } from '../../../infra/http/v1/v1-response.js';
import { OpenApiService } from '../services/open-api.service.js';
import { SchemasService } from '../services/schemas.service.js';

/**
 * Schemas on the public API, for developers and the CLI: the OpenAPI document and the schema export
 * (DEV_TOOLS `?token=`), and the schema push (`X-API-KEY` with DEV_TOOLS). Ported from
 * functions/src/v1/{dev-tools,manage}.ts.
 */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class SchemasPublicController {
  constructor(
    private readonly schemas: SchemasService,
    private readonly openApiService: OpenApiService,
    private readonly tokens: TokenAuthService,
  ) {}

  @Get('open-api')
  async openApi(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeDevTools(request, reply))) return;
    const spaceId = (request.params as Params)['spaceId'];
    const document = await this.openApiService.find(spaceId);
    if (!document) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE) });
      return;
    }
    void reply.send(document);
  }

  @Get('schemas')
  async schemaExport(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeDevTools(request, reply))) return;
    const spaceId = (request.params as Params)['spaceId'];
    const exported = await this.schemas.export(spaceId);
    if (!exported) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE) });
      return;
    }
    void reply.send(exported);
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
    const plan = await this.schemas.planPush(spaceId, pushed as SchemaExport[], type);
    if (!plan) {
      sendV1Error(reply, 404, 'not-found', 'Not found');
      return;
    }
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
    // Schemas shape the draft output (locale extraction), so content drafts change too: the content version moves.
    const errors = await this.schemas.applyPush(spaceId, plan);
    if (errors.length > 0) {
      sendV1Error(reply, 400, 'failed-precondition', 'Referential integrity check failed', { details: { errors } });
      return;
    }
    void reply.send({
      message: `Created ${counts.created}, updated ${counts.updated}, deleted ${counts.deleted} schemas (${counts.unchanged} unchanged)`,
      counts,
      ids,
    });
  }
}
