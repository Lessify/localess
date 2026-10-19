import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { TaskLogService } from '../services/task-log.service.js';
import { TASK_READ_PERMISSIONS } from '../utils/task-permissions.js';

/** The steps of a task, for its detail page. */
@Controller('api/app/spaces/:spaceId/tasks/:id/logs')
export class TaskLogController {
  constructor(private readonly logs: TaskLogService) {}

  @Get()
  @RequirePermission(...TASK_READ_PERMISSIONS)
  findAll(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.logs.findAll(spaceId, id);
  }
}
