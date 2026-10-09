import { Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Schema, SchemaExport, TokenPermission, Translation, TranslationType, TranslationUpdateResponse } from '@localess/shared';
import { zSchemaPushSchema, zTranslationManageUpdateSchema } from '@localess/shared/zod';
import { Public } from '../auth/decorators.js';
import { DATABASE, Database } from '../database/database.module.js';
import { schemas, spaces, translations } from '../database/schema.js';
import { planSchemaPush } from '../domain/lib/schema.utils.js';
import { applySchemaPushPlan } from '../domain/schema-push.js';
import { planTranslationUpdate } from '../domain/lib/translation.utils.js';
import { schemaFromRow, translationFromRow } from '../domain/row-mappers.js';
import { validIdParams } from './cdn.controller.js';
import { PublicContentService } from './public-content.service.js';
import { TokenAuthService } from './token-auth.service.js';
import { sendV1Error } from './v1-response.js';

type Params = Record<string, string>;

/** Per-type verb labels used for response messages. */
const TRANSLATION_UPDATE_VERBS: Record<
  'add-missing' | 'update-existing' | 'delete-missing-key' | 'delete-missing-value',
  { verb: string; past: string; noun: [string, string] }
> = {
  'add-missing': { verb: 'add', past: 'Added', noun: ['translation', 'translations'] },
  'update-existing': { verb: 'update', past: 'Updated', noun: ['translation', 'translations'] },
  // Removes the whole translation, in every locale.
  'delete-missing-key': { verb: 'delete', past: 'Deleted', noun: ['translation key', 'translation keys'] },
  // Removes only the pushed locale's value; other locales keep theirs.
  'delete-missing-value': { verb: 'remove', past: 'Removed', noun: ['locale value', 'locale values'] },
};

/**
 * Write endpoints for the CLI (`X-API-KEY` with DEV_TOOLS), ported from functions/src/v1/manage.ts.
 * Each push is one transaction now (Firestore committed in 500-write batches), and it bumps the
 * space's version so drafts — built live from these rows — are re-fetched past every cache.
 */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class ManageController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly content: PublicContentService,
    private readonly tokens: TokenAuthService,
  ) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return false;
    const apiKey = request.headers['x-api-key'];
    return (await this.tokens.authorize(reply, params['spaceId'], apiKey, [TokenPermission.DEV_TOOLS], { cached: false })) !== undefined;
  }

  // 200, not Nest's POST default of 201: what the Express endpoint answered.
  @Post('translations/:locale')
  @HttpCode(200)
  async updateTranslations(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.authorize(request, reply))) return;
    const { spaceId, locale } = request.params as Params;
    const body = zTranslationManageUpdateSchema.safeParse(request.body);
    if (!body.success) {
      sendV1Error(reply, 400, 'invalid-argument', 'Bad request body', { details: body.error });
      return;
    }
    const { dryRun, type, values } = body.data;
    const space = await this.content.findSpace(spaceId);
    if (!space || !space.locales.some(it => it.id === locale)) {
      sendV1Error(reply, 400, 'invalid-argument', 'Locale not supported by this space', {
        details: `Locale ${locale} is not in space locales`,
      });
      return;
    }

    // add-missing / update-existing only need the pushed ids; the delete types need every id.
    const ids = Object.getOwnPropertyNames(values);
    const rows =
      type === 'delete-missing-key' || type === 'delete-missing-value'
        ? await this.content.findTranslations(spaceId)
        : ids.length
          ? await this.db
              .select()
              .from(translations)
              .where(and(eq(translations.spaceId, spaceId), inArray(translations.id, ids)))
          : [];
    const existing = new Map<string, Translation>(rows.map(row => [row.id, translationFromRow(row)]));

    const plan = planTranslationUpdate(existing, locale, values);
    const actionable = {
      'add-missing': plan.creates,
      'update-existing': plan.updates,
      'delete-missing-key': plan.keyDeletes,
      'delete-missing-value': plan.valueDeletes,
    }[type];
    const { verb, past } = TRANSLATION_UPDATE_VERBS[type];
    const noun = TRANSLATION_UPDATE_VERBS[type].noun[actionable.length === 1 ? 0 : 1];

    if (actionable.length === 0) {
      const response: TranslationUpdateResponse = { message: `No ${TRANSLATION_UPDATE_VERBS[type].noun[1]} to ${verb}`, ids: [], dryRun };
      void reply.send(response);
      return;
    }
    if (dryRun) {
      const response: TranslationUpdateResponse = {
        message: `[DryRun] Would ${verb} ${actionable.length} ${noun}`,
        ids: actionable,
        dryRun: true,
      };
      void reply.send(response);
      return;
    }

    await this.db.transaction(async tx => {
      const inSpace = (selected: string[]) => and(eq(translations.spaceId, spaceId), inArray(translations.id, selected));
      if (type === 'add-missing') {
        await tx
          .insert(translations)
          .values(actionable.map(id => ({ spaceId, id, type: TranslationType.STRING, locales: { [locale]: values[id] } })));
      } else if (type === 'update-existing') {
        for (const id of actionable) {
          await tx
            .update(translations)
            .set({
              locales: sql`jsonb_set(${translations.locales}, ${`{${locale}}`}::text[], ${JSON.stringify(values[id])}::jsonb)`,
              updatedAt: new Date(),
            })
            .where(inSpace([id]));
        }
      } else if (type === 'delete-missing-value') {
        await tx
          .update(translations)
          .set({ locales: sql`${translations.locales} - ${locale}::text`, updatedAt: new Date() })
          .where(inSpace(actionable));
      } else {
        await tx.delete(translations).where(inSpace(actionable));
      }
      // Draft translations are built from these rows on read; the new version moves clients past cached copies.
      await tx
        .update(spaces)
        .set({ translationVersion: sql`${spaces.translationVersion} + 1` })
        .where(eq(spaces.id, spaceId));
    });
    const response: TranslationUpdateResponse = { message: `${past} ${actionable.length} ${noun}`, ids: actionable };
    void reply.send(response);
  }

  @Post('schemas')
  @HttpCode(200)
  async pushSchemas(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.authorize(request, reply))) return;
    const { spaceId } = request.params as Params;
    const body = zSchemaPushSchema.safeParse(request.body);
    if (!body.success) {
      sendV1Error(reply, 400, 'invalid-argument', 'Bad request body', { details: body.error });
      return;
    }
    const { dryRun, type, schemas: pushed } = body.data;
    if (!(await this.content.findSpace(spaceId))) {
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
