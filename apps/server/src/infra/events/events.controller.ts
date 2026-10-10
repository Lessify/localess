import { Controller, MessageEvent, Query, Sse } from '@nestjs/common';
import { filter, interval, map, merge, Observable } from 'rxjs';
import { RequireAnyRole } from '../../auth/decorators.js';
import { CurrentUser } from '../../auth/request-context.js';
import { toPrincipal, type UserRow } from '../../auth/users/users.service.js';
import { canReceive } from './event-access.js';
import { EventsService } from './events.service.js';

const HEARTBEAT_MS = 25_000;

/**
 * Server-sent change events for the SPA (`new EventSource('/api/app/events?spaceId=…')`, cookie-authenticated).
 * The client refetches whatever an event names. Each user gets only the events for data they may read
 * (`canReceive`, checked with the access they had when connecting). A heartbeat keeps proxies from closing idle streams.
 */
@Controller('api/app/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Sse()
  @RequireAnyRole()
  stream(@CurrentUser() user: UserRow, @Query('spaceId') spaceId?: string): Observable<MessageEvent> {
    const principal = toPrincipal(user);
    return merge(
      this.events.stream(spaceId).pipe(
        filter(event => canReceive(principal, event)),
        map(event => ({ type: 'change', data: event }) satisfies MessageEvent),
      ),
      interval(HEARTBEAT_MS).pipe(map(() => ({ type: 'heartbeat', data: {} }) satisfies MessageEvent)),
    );
  }
}
