import { ANY_ROLE } from '@localess/shared';
import { Controller, MessageEvent, Param, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';

import { RequireRole } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { SpaceExistsPipe } from '../../../shared/http/space-exists.pipe.js';
import { EventStreamService } from '../services/event-stream.service.js';

/**
 * Server-sent change events of one space (`new EventSource('/api/app/spaces/:spaceId/events')`, cookie-authenticated):
 * its contents, schemas, translations, assets, tasks, tokens, webhooks, and the space itself. 404 for an unknown space,
 * from the pipe: once the handler returns, the stream's 200 is sent.
 */
@Controller('api/app/spaces/:spaceId/events')
export class SpaceEventController {
  constructor(private readonly eventStreamService: EventStreamService) {}

  @Sse()
  @RequireRole(ANY_ROLE)
  findAll(@CurrentUser() user: UserEntity, @Param('spaceId', SpaceExistsPipe) spaceId: string): Observable<MessageEvent> {
    return this.eventStreamService.findSpace(user, spaceId);
  }
}
