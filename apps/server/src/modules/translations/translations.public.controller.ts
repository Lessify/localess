import { Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TokenPermission, TranslationType, TranslationUpdateResponse, WebHookEvent } from '@localess/shared';
import { zTranslationManageUpdateSchema } from '@localess/shared/zod';
import { TokenAuthService } from '../../auth/api-tokens/token-auth.service.js';
import { Public } from '../../auth/decorators.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { spaces, translations } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import {
  isDraft,
  needsRedirect,
  Params,
  Query,
  redirectToVersion,
  requireV1Space,
  sendJson,
  validIdParams,
} from '../../infra/http/v1/v1-request.js';
import { q, sendV1Error } from '../../infra/http/v1/v1-response.js';
import { SpacesService } from '../spaces/spaces.service.js';
import { WebhookDispatcher } from '../webhooks/webhook-dispatcher.service.js';
import { buildTranslationMap, TranslationDeliveryService } from './translation-delivery.service.js';
import { translationsByKey } from './translation-row.js';
import { newUuid } from '../../infra/database/id.js';
import { planTranslationUpdate, storedLocaleValues } from './translation.utils.js';
import { nextVersion } from '../../infra/http/space-access.js';

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
 * Translations on the public API: the published (or draft) map for a locale (`?token=`, cached behind `cv`),
 * the raw stored values for the CLI (DEV_TOOLS) and the CLI's push (`X-API-KEY` with DEV_TOOLS). Ported from
 * functions/src/v1/{cdn,dev-tools,manage}.ts; URLs, status codes, bodies and Cache-Control are unchanged.
 */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class TranslationsPublicController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly spaces: SpacesService,
    private readonly delivery: TranslationDeliveryService,
    private readonly tokens: TokenAuthService,
    private readonly events: EventsService,
    private readonly webhooks: WebhookDispatcher,
  ) {}

  @Get('translations/:locale')
  async translations(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    const { spaceId, locale } = params;
    const { cv, version, token: tokenId } = request.query as Query;
    const draft = version !== undefined;
    const token = await this.tokens.authorize(
      reply,
      spaceId,
      tokenId,
      draft
        ? [TokenPermission.TRANSLATION_DRAFT, TokenPermission.DEV_TOOLS]
        : [TokenPermission.TRANSLATION_PUBLIC, TokenPermission.TRANSLATION_DRAFT, TokenPermission.DEV_TOOLS],
      {
        cached: true,
        reason: draft
          ? 'This request includes a `version` query parameter, which requires access to draft translations.'
          : 'Published translation requires the TRANSLATION_PUBLIC, TRANSLATION_DRAFT, or DEV_TOOLS permission.',
      },
    );
    if (!token) return;

    const space = await this.spaces.findSpace(spaceId);
    if (!requireV1Space(reply, space)) return;
    if (needsRedirect(cv, space.translationVersion)) {
      let url = `/api/v1/spaces/${spaceId}/translations/${q(locale)}?cv=${space.translationVersion}`;
      if (version) url += `&version=${q(version)}`;
      url += `&token=${q(tokenId)}`;
      redirectToVersion(reply, url, token);
      return;
    }

    const actualLocale = space.locales.some(it => it.id === locale) ? locale : space.defaultLocaleId;
    let values: Record<string, string> | undefined;
    if (isDraft(version)) {
      values = buildTranslationMap(await this.delivery.findTranslations(spaceId), actualLocale, space.defaultLocaleId).values;
    } else {
      values =
        (await this.delivery.findPublishedTranslations(spaceId, actualLocale)) ??
        (actualLocale !== space.defaultLocaleId
          ? await this.delivery.findPublishedTranslations(spaceId, space.defaultLocaleId)
          : undefined);
    }
    if (!values) {
      sendV1Error(reply, 404, 'not-found', 'File not found, Publish first.');
      return;
    }
    sendJson(reply, values);
  }

  /**
   * The values stored for one locale, with no fallback filling: a key the locale has no value for is
   * absent. For round-tripping through files (`localess translation pull --raw` → edit → push).
   */
  @Get('translations/:locale/values')
  async translationValues(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeDevTools(request, reply))) return;
    const { spaceId, locale } = request.params as Params;
    const space = await this.spaces.findSpace(spaceId);
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
    const rows = await this.delivery.findTranslations(spaceId);
    const values = storedLocaleValues(translationsByKey(rows), locale);
    void reply.header('cache-control', 'no-cache').send(values);
  }

  // 200, not Nest's POST default of 201: what the Express endpoint answered.
  @Post('translations/:locale')
  @HttpCode(200)
  async updateTranslations(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeApiKey(request, reply))) return;
    const { spaceId, locale } = request.params as Params;
    const body = zTranslationManageUpdateSchema.safeParse(request.body);
    if (!body.success) {
      sendV1Error(reply, 400, 'invalid-argument', 'Bad request body', { details: body.error });
      return;
    }
    const { dryRun, type, values } = body.data;
    const space = await this.spaces.findSpace(spaceId);
    if (!space || !space.locales.some(it => it.id === locale)) {
      sendV1Error(reply, 400, 'invalid-argument', 'Locale not supported by this space', {
        details: `Locale ${locale} is not in space locales`,
      });
      return;
    }

    // add-missing / update-existing only need the pushed keys; the delete types need every key.
    const ids = Object.getOwnPropertyNames(values);
    const rows =
      type === 'delete-missing-key' || type === 'delete-missing-value'
        ? await this.delivery.findTranslations(spaceId)
        : ids.length
          ? await this.db
              .select()
              .from(translations)
              .where(and(eq(translations.spaceId, spaceId), inArray(translations.key, ids)))
          : [];
    const existing = translationsByKey(rows);

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
      const inSpace = (selected: string[]) => and(eq(translations.spaceId, spaceId), inArray(translations.key, selected));
      if (type === 'add-missing') {
        await tx
          .insert(translations)
          .values(actionable.map(key => ({ id: newUuid(), spaceId, key, type: TranslationType.STRING, locales: { [locale]: values[key] } })));
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
        .set({ translationVersion: nextVersion(spaces.translationVersion) })
        .where(eq(spaces.id, spaceId));
      await this.events.publish({ spaceId, entity: 'translations', op: 'updated' }, tx);
    });
    // Same as an edit in the app (and the Firebase endpoint): hooks that rebuild on translation.changed fire after a push.
    this.webhooks.dispatch(spaceId, WebHookEvent.TRANSLATION_CHANGED);
    const response: TranslationUpdateResponse = { message: `${past} ${actionable.length} ${noun}`, ids: actionable };
    void reply.send(response);
  }
}
