import { Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { TOKEN_V1_IMPLICIT_PERMISSIONS, TokenPermission, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../auth/decorators.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { newTokenSecret, newUuid } from '../../infra/database/id.js';
import { tokens } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { toDto } from '../../infra/http/dto.js';
import { requireSpace } from '../../infra/http/space-access.js';
import { UuidParamPipe } from '../../infra/http/uuid-param.pipe.js';

const tokenSchema = z.object({
  name: z.string().trim().min(1).max(200),
  permissions: z.array(z.enum(Object.values(TokenPermission) as [TokenPermission, ...TokenPermission[]])).max(10),
  cacheTtl: z.number().int().min(0).max(31_536_000).nullish(),
});

type TokenRow = typeof tokens.$inferSelect;
const dto = (row: TokenRow) => toDto(row);

/**
 * Space API tokens (was `spaces/{s}/tokens`). Routes use the UUID `id`; the secret is `token`, which only this
 * controller returns (to SPACE_MANAGEMENT users). Every change publishes a `tokens` event with the UUID, which
 * also drops the public API's 5-minute token cache on every instance.
 */
@Controller('api/app/spaces/:spaceId/tokens')
@RequirePermission(UserPermission.SPACE_MANAGEMENT)
export class TokensController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  /** `?permission=X` keeps tokens carrying it; `?limit=` caps the list (newest first). */
  @Get()
  async list(@Param('spaceId') spaceId: string, @Query('permission') permission?: string, @Query('limit') limit?: string) {
    const conditions = [eq(tokens.spaceId, spaceId)];
    if (permission) conditions.push(sql`${tokens.permissions} @> array[${permission}]::text[]`);
    const select = this.db
      .select()
      .from(tokens)
      .where(and(...conditions))
      .orderBy(desc(tokens.createdAt));
    const rows = limit ? await select.limit(Math.max(1, Math.min(1000, Number(limit) || 1))) : await select;
    return rows.map(dto);
  }

  @Get(':id')
  async get(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return dto(await this.find(spaceId, id));
  }

  private async find(spaceId: string, id: string): Promise<TokenRow> {
    const [row] = await this.db
      .select()
      .from(tokens)
      .where(and(eq(tokens.spaceId, spaceId), eq(tokens.id, id)));
    if (!row) throw new NotFoundException('Token not found');
    return row;
  }

  @Post()
  async create(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(tokenSchema)) body: z.infer<typeof tokenSchema>) {
    return this.db.transaction(async tx => {
      await requireSpace(tx, spaceId);
      const [row] = await tx
        .insert(tokens)
        .values({
          id: newUuid(),
          spaceId,
          token: newTokenSecret(),
          version: 2,
          name: body.name,
          permissions: body.permissions,
          cacheTtl: body.cacheTtl ?? null,
        })
        .returning();
      await this.events.publish({ spaceId, entity: 'tokens', id: row.id, op: 'created' }, tx);
      return dto(row);
    });
  }

  @Put(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(tokenSchema)) body: z.infer<typeof tokenSchema>,
  ) {
    return this.db.transaction(async tx => {
      const [row] = await tx
        .update(tokens)
        .set({ version: 2, name: body.name, permissions: body.permissions, cacheTtl: body.cacheTtl ?? null, updatedAt: new Date() })
        .where(and(eq(tokens.spaceId, spaceId), eq(tokens.id, id)))
        .returning();
      if (!row) throw new NotFoundException('Token not found');
      await this.events.publish({ spaceId, entity: 'tokens', id, op: 'updated' }, tx);
      return dto(row);
    });
  }

  /** Same token (same id) under a new secret; a V1 token becomes V2 with its implicit permissions spelled out. */
  @Post(':id/regenerate')
  async regenerate(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.db.transaction(async tx => {
      const [old] = await tx
        .select()
        .from(tokens)
        .where(and(eq(tokens.spaceId, spaceId), eq(tokens.id, id)))
        .for('update');
      if (!old) throw new NotFoundException('Token not found');
      const [row] = await tx
        .update(tokens)
        .set({
          token: newTokenSecret(),
          version: 2,
          permissions: old.version === 2 ? old.permissions : [...TOKEN_V1_IMPLICIT_PERMISSIONS],
          cacheTtl: old.version === 2 ? old.cacheTtl : null,
          updatedAt: new Date(),
        })
        .where(eq(tokens.id, id))
        .returning();
      await this.events.publish({ spaceId, entity: 'tokens', id, op: 'updated' }, tx);
      return dto(row);
    });
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.db.transaction(async tx => {
      const deleted = await tx
        .delete(tokens)
        .where(and(eq(tokens.spaceId, spaceId), eq(tokens.id, id)))
        .returning({ id: tokens.id });
      if (!deleted.length) throw new NotFoundException('Token not found');
      await this.events.publish({ spaceId, entity: 'tokens', id, op: 'deleted' }, tx);
    });
  }
}
