import type { MultipartFile } from '@fastify/multipart';
import type { TaskCreate, TaskPageable } from '@localess/shared';
import { zTaskCreate, zTaskImportCreate, zTaskPageable } from '@localess/shared/zod';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { RequirePermission } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import { buildContentDisposition } from '../../../infra/http/content-disposition.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { TaskService } from '../services/task.service.js';
import { assertCanManage, TASK_READ_PERMISSIONS } from '../utils/task-permissions.js';

/** Values of the non-file parts that preceded the file in the multipart body. */
function fieldValues(file: MultipartFile): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, field] of Object.entries(file.fields)) {
    const part = Array.isArray(field) ? field[0] : field;
    if (part && part.type === 'field') values[key] = String(part.value);
  }
  return values;
}

/** Export/import tasks of a space; the task worker runs them (TaskService, workers/). */
@Controller('api/app/spaces/:spaceId/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @RequirePermission(...TASK_READ_PERMISSIONS)
  findAll(@Param('spaceId') spaceId: string, @Query({ schema: zTaskPageable }) query: TaskPageable) {
    return this.taskService.findAll(spaceId, query);
  }

  @Get(':id')
  @RequirePermission(...TASK_READ_PERMISSIONS)
  findOne(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.taskService.findOne(spaceId, id);
  }

  /** The task's file (export result or uploaded import), as an attachment. */
  @Get(':id/download')
  @RequirePermission(...TASK_READ_PERMISSIONS)
  async download(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string, @Res() reply: FastifyReply): Promise<void> {
    const { filename, size, stream } = await this.taskService.download(spaceId, id);
    void reply
      .header('content-disposition', buildContentDisposition(filename, true))
      .header('content-length', size)
      .header('cache-control', 'private, no-store')
      .type(filename.endsWith('.json') ? 'application/json' : 'application/zip')
      .send(stream);
  }

  /** Exports and metadata regeneration: `{ kind, path? | locale? }`. */
  @Post()
  @RequirePermission(...TASK_READ_PERMISSIONS)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zTaskCreate }) body: TaskCreate, @CurrentUser() user: UserEntity) {
    return this.taskService.create(spaceId, body, user);
  }

  /**
   * Imports: `multipart/form-data` with `kind` (and `locale` for a single-locale translation import)
   * **before** the `file` part. The file is stored as the task's original.
   */
  @Post('import')
  @RequirePermission(...TASK_READ_PERMISSIONS)
  async createImport(@Param('spaceId') spaceId: string, @Req() request: FastifyRequest, @CurrentUser() user: UserEntity) {
    if (!request.isMultipart()) throw new BadRequestException('Expected multipart/form-data');
    const file = await request.file();
    if (!file) throw new BadRequestException('Missing file part');
    const fields = zTaskImportCreate.safeParse(fieldValues(file));
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
    return this.taskService.createImport(spaceId, { ...fields.data, filename: file.filename, stream: file.file });
  }

  /** Logs cascade; the task's files go too. */
  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(...TASK_READ_PERMISSIONS)
  remove(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string, @CurrentUser() user: UserEntity): Promise<void> {
    return this.taskService.remove(spaceId, id, user);
  }
}
