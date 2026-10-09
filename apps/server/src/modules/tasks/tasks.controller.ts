import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  PayloadTooLargeException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { canPerform, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../auth/decorators.js';
import { CurrentUser } from '../../auth/request-context.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { newId } from '../../infra/database/id.js';
import { taskLogs, tasks } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { buildContentDisposition } from '../../infra/http/content-disposition.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../infra/storage/storage.driver.js';
import { toPrincipal, type UserRow } from '../../auth/users/users.service.js';
import { toDto } from '../../infra/http/dto.js';
import { requireSpace } from '../../infra/http/space-access.js';

const READ_PERMISSIONS = [
  UserPermission.ASSET_EXPORT,
  UserPermission.ASSET_IMPORT,
  UserPermission.CONTENT_EXPORT,
  UserPermission.CONTENT_IMPORT,
  UserPermission.SCHEMA_EXPORT,
  UserPermission.SCHEMA_IMPORT,
  UserPermission.TRANSLATION_EXPORT,
  UserPermission.TRANSLATION_IMPORT,
];

const exportSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ASSET_EXPORT'), path: z.string().max(4000).optional() }),
  z.object({ kind: z.literal('CONTENT_EXPORT'), path: z.string().max(4000).optional() }),
  z.object({ kind: z.literal('SCHEMA_EXPORT') }),
  z.object({ kind: z.literal('TRANSLATION_EXPORT'), locale: z.string().max(64).optional() }),
  z.object({ kind: z.literal('ASSET_REGEN_METADATA') }),
]);
const importFields = z.object({
  kind: z.enum(['ASSET_IMPORT', 'CONTENT_IMPORT', 'SCHEMA_IMPORT', 'TRANSLATION_IMPORT']),
  /** Translation import of one locale from a flat JSON file. */
  locale: z.string().max(64).optional(),
});

type TaskRow = typeof tasks.$inferSelect;
export const taskDto = (row: TaskRow) => toDto(row, ['spaceId', 'lockedBy', 'lockedAt']);
export const taskKey = (spaceId: string, id: string) => `spaces/${spaceId}/tasks/${id}/original`;

/** Creating or deleting a task needs the permission its kind names (firestore.rules `canManageTaskKind`). */
function assertCanManage(user: UserRow, kind: string): void {
  const principal = toPrincipal(user);
  const allowed = kind === 'ASSET_REGEN_METADATA' ? principal.role === 'admin' : canPerform(principal, kind as UserPermission);
  if (!allowed) throw new ForbiddenException();
}

function fieldValues(file: MultipartFile): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, field] of Object.entries(file.fields)) {
    const part = Array.isArray(field) ? field[0] : field;
    if (part && part.type === 'field') values[key] = String(part.value);
  }
  return values;
}

/**
 * Export/import tasks (was `spaces/{s}/tasks`, created by the browser and run by `task-oncreate`).
 * Rows are created INITIATED; the task worker (phase 4) picks them up.
 */
@Controller('api/app/spaces/:spaceId/tasks')
export class TasksController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly events: EventsService,
  ) {}

  @Get()
  @RequirePermission(...READ_PERMISSIONS)
  async list(@Param('spaceId') spaceId: string) {
    return (await this.db.select().from(tasks).where(eq(tasks.spaceId, spaceId)).orderBy(desc(tasks.createdAt))).map(taskDto);
  }

  private async find(spaceId: string, id: string): Promise<TaskRow> {
    const [row] = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.spaceId, spaceId), eq(tasks.id, id)));
    if (!row) throw new NotFoundException('Task not found');
    return row;
  }

  @Get(':id')
  @RequirePermission(...READ_PERMISSIONS)
  async get(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return taskDto(await this.find(spaceId, id));
  }

  @Get(':id/logs')
  @RequirePermission(...READ_PERMISSIONS)
  async logs(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    await this.find(spaceId, id);
    const rows = await this.db.select().from(taskLogs).where(eq(taskLogs.taskId, id)).orderBy(asc(taskLogs.createdAt), asc(taskLogs.id));
    return rows.map(row => ({ ...toDto(row, ['taskId']), id: String(row.id) }));
  }

  /** The task's file (export result or uploaded import), as an attachment. */
  @Get(':id/download')
  @RequirePermission(...READ_PERMISSIONS)
  async download(@Param('spaceId') spaceId: string, @Param('id') id: string, @Res() reply: FastifyReply): Promise<void> {
    const task = await this.find(spaceId, id);
    const key = taskKey(spaceId, id);
    const stat = await this.storage.stat(key);
    if (!stat) throw new NotFoundException('This task has no file');
    const filename = task.file?.name ?? `${task.kind.toLowerCase()}-${id}`;
    void reply
      .header('content-disposition', buildContentDisposition(filename, true))
      .header('content-length', stat.size)
      .header('cache-control', 'private, no-store')
      .type(filename.endsWith('.json') ? 'application/json' : 'application/zip')
      .send(this.storage.createReadStream(key));
  }

  private async insert(spaceId: string, values: Omit<typeof tasks.$inferInsert, 'spaceId' | 'status'>): Promise<TaskRow> {
    return this.db.transaction(async tx => {
      await requireSpace(tx, spaceId);
      const [row] = await tx
        .insert(tasks)
        .values({ ...values, spaceId, status: 'INITIATED' })
        .returning();
      await this.events.publish({ spaceId, entity: 'tasks', id: row.id, op: 'created' }, tx);
      return row;
    });
  }

  /** Exports and metadata regeneration: `{ kind, path? | locale? }`. */
  @Post()
  @RequirePermission(...READ_PERMISSIONS)
  async create(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(exportSchema)) body: z.infer<typeof exportSchema>,
    @CurrentUser() user: UserRow,
  ) {
    assertCanManage(user, body.kind);
    return taskDto(await this.insert(spaceId, { id: newId(), ...body }));
  }

  /**
   * Imports: `multipart/form-data` with `kind` (and `locale` for a single-locale translation import)
   * **before** the `file` part. The file is stored as the task's original.
   */
  @Post('import')
  @RequirePermission(...READ_PERMISSIONS)
  async createImport(@Param('spaceId') spaceId: string, @Req() request: FastifyRequest, @CurrentUser() user: UserRow) {
    if (!request.isMultipart()) throw new BadRequestException('Expected multipart/form-data');
    const file = await request.file();
    if (!file) throw new BadRequestException('Missing file part');
    const fields = importFields.safeParse(fieldValues(file));
    if (!fields.success) {
      file.file.resume();
      throw new BadRequestException(fields.error.issues.map(it => `${it.path.join('.')}: ${it.message}`).join('; '));
    }
    try {
      assertCanManage(user, fields.data.kind);
    } catch (error) {
      file.file.resume();
      throw error;
    }
    await requireSpace(this.db, spaceId);
    const id = newId();
    const key = taskKey(spaceId, id);
    try {
      const stored = await this.storage.put(key, file.file);
      if (file.file.truncated) throw new PayloadTooLargeException('File is too large');
      const translation = fields.data.kind === 'TRANSLATION_IMPORT';
      return taskDto(
        await this.insert(spaceId, {
          id,
          kind: fields.data.kind,
          file: { name: file.filename, size: stored.size },
          ...(translation ? { type: fields.data.locale ? 'flat-json' : 'full', locale: fields.data.locale ?? null } : {}),
        }),
      );
    } catch (error) {
      await this.storage.deletePrefix(`spaces/${spaceId}/tasks/${id}/`);
      throw error;
    }
  }

  /** Logs cascade; the task's files go too. */
  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(...READ_PERMISSIONS)
  async delete(@Param('spaceId') spaceId: string, @Param('id') id: string, @CurrentUser() user: UserRow): Promise<void> {
    const task = await this.find(spaceId, id);
    assertCanManage(user, task.kind);
    await this.db.transaction(async tx => {
      await tx.delete(tasks).where(and(eq(tasks.spaceId, spaceId), eq(tasks.id, id)));
      await this.events.publish({ spaceId, entity: 'tasks', id, op: 'deleted' }, tx);
    });
    await this.storage.deletePrefix(`spaces/${spaceId}/tasks/${id}/`);
  }
}
