import { Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { UserPermission, WebHookEvent } from '@localess/shared';
import { RequirePermission } from '../../auth/decorators.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { DATABASE, Database } from '../../database/database.module.js';
import { newId } from '../../database/id.js';
import { webhookLogs, webhooks } from '../../database/schema.js';
import { EventsService } from '../../events/events.service.js';
import { toDto } from '../common/dto.js';
import { requireSpace } from '../common/space-access.js';

/** Same rule firestore.rules applied: https, or plain http to localhost for local testing. */
const webhookUrl = z
  .string()
  .max(2048)
  .refine(url => /^https:\/\//.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url), 'Webhook URLs must use https');
const webhookSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: webhookUrl,
  events: z.array(z.enum(Object.values(WebHookEvent) as [WebHookEvent, ...WebHookEvent[]])).min(1),
  headers: z.record(z.string().max(200), z.string().max(2000)).optional(),
  secret: z.string().max(500).optional(),
});
const statusSchema = z.object({ enabled: z.boolean() });

type WebhookRow = typeof webhooks.$inferSelect;
const dto = (row: WebhookRow) => toDto(row);

/** Webhook configuration and delivery logs (was `spaces/{s}/webhooks`). */
@Controller('api/app/spaces/:spaceId/webhooks')
@RequirePermission(UserPermission.SPACE_MANAGEMENT)
export class WebhooksController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  @Get()
  async list(@Param('spaceId') spaceId: string) {
    return (await this.db.select().from(webhooks).where(eq(webhooks.spaceId, spaceId)).orderBy(asc(webhooks.name))).map(dto);
  }

  @Get(':id')
  async get(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    const [row] = await this.db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.spaceId, spaceId), eq(webhooks.id, id)));
    if (!row) throw new NotFoundException('Webhook not found');
    return dto(row);
  }

  @Get(':id/logs')
  async logs(@Param('spaceId') spaceId: string, @Param('id') id: string, @Query('limit') limit?: string) {
    await this.get(spaceId, id);
    const select = this.db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookId, id))
      .orderBy(desc(webhookLogs.createdAt), desc(webhookLogs.id));
    const rows = limit ? await select.limit(Math.max(1, Math.min(1000, Number(limit) || 100))) : await select;
    return rows.map(row => ({ ...toDto(row, ['webhookId']), id: String(row.id) }));
  }

  private async change(
    spaceId: string,
    id: string,
    op: 'created' | 'updated' | 'deleted',
    work: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<WebhookRow | undefined>,
  ) {
    return this.db.transaction(async tx => {
      await requireSpace(tx, spaceId);
      const row = await work(tx);
      if (!row) throw new NotFoundException('Webhook not found');
      await this.events.publish({ spaceId, entity: 'webhooks', id: row.id, op }, tx);
      return dto(row);
    });
  }

  @Post()
  create(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(webhookSchema)) body: z.infer<typeof webhookSchema>) {
    return this.change(
      spaceId,
      '',
      'created',
      async tx =>
        (
          await tx
            .insert(webhooks)
            .values({ id: newId(), spaceId, enabled: true, ...body })
            .returning()
        )[0],
    );
  }

  /** Headers and secret are only replaced when sent (the form leaves them out to keep them). */
  @Put(':id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(webhookSchema)) body: z.infer<typeof webhookSchema>,
  ) {
    return this.change(spaceId, id, 'updated', async tx => {
      const [row] = await tx
        .update(webhooks)
        .set({
          name: body.name,
          url: body.url,
          events: body.events,
          ...(body.headers ? { headers: body.headers } : {}),
          ...(body.secret ? { secret: body.secret } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(webhooks.spaceId, spaceId), eq(webhooks.id, id)))
        .returning();
      return row;
    });
  }

  @Patch(':id/status')
  setStatus(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(statusSchema)) body: z.infer<typeof statusSchema>,
  ) {
    return this.change(spaceId, id, 'updated', async tx => {
      const [row] = await tx
        .update(webhooks)
        .set({ enabled: body.enabled, updatedAt: new Date() })
        .where(and(eq(webhooks.spaceId, spaceId), eq(webhooks.id, id)))
        .returning();
      return row;
    });
  }

  /** Logs cascade. */
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('spaceId') spaceId: string, @Param('id') id: string): Promise<void> {
    await this.change(spaceId, id, 'deleted', async tx => {
      const [row] = await tx
        .delete(webhooks)
        .where(and(eq(webhooks.spaceId, spaceId), eq(webhooks.id, id)))
        .returning();
      return row;
    });
  }
}
