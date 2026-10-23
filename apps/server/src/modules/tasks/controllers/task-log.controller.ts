import { type TaskLog, TRANSLATORS } from '@localess/shared';
import { Controller, Get, Param } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { TaskLogService } from '../services/task-log.service.js';

/** The steps of a task, for its detail page. */
@Controller('api/app/spaces/:spaceId/tasks/:id/logs')
export class TaskLogController {
  constructor(private readonly taskLogService: TaskLogService) {}

  @Get()
  @RequireRole(TRANSLATORS)
  findAll(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<TaskLog[]> {
    return this.taskLogService.findAll(spaceId, id, user);
  }
}
