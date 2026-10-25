import { ANY_ROLE } from '@localess/shared';
import { Controller, MessageEvent, Param, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';

import { RequireRole } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { EventStreamService } from '../services/event-stream.service.js';

/**
 * Server-sent change events of one space (`new EventSource('/api/app/spaces/:spaceId/events')`, cookie-authenticated):
 * its contents, schemas, translations, assets, tasks, tokens, webhooks, and the space itself. 404 for an unknown space.
 */
@Controller('api/app/spaces/:spaceId/events')
export class SpaceEventController {
  constructor(private readonly eventStreamService: EventStreamService) {}

  @Sse()
  @RequireRole(ANY_ROLE)
  findAll(@CurrentUser() user: UserEntity, @Param('spaceId', UuidParamPipe) spaceId: string): Promise<Observable<MessageEvent>> {
    return this.eventStreamService.findSpace(user, spaceId);
  }
}
