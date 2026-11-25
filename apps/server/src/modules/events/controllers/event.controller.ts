import { ANY_ROLE } from '@localess/shared';
import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';

import { RequireRole } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { EventStreamService } from '../services/event-stream.service.js';

/**
 * Server-sent change events outside spaces (`new EventSource('/api/app/events')`, cookie-authenticated): spaces
 * created, changed or deleted, and users. A space's own data: `SpaceEventController`. The client refetches whatever an
 * event names.
 */
@Controller('api/app/events')
export class EventController {
  constructor(private readonly eventStreamService: EventStreamService) {}

  @Sse()
  @RequireRole(ANY_ROLE)
  findAll(@CurrentUser() user: UserEntity): Observable<MessageEvent> {
    return this.eventStreamService.findGlobal(user);
  }
}
