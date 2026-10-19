import { Controller, MessageEvent, Query, Sse } from '@nestjs/common';
import { filter, interval, map, merge, Observable } from 'rxjs';
import { RequireAnyRole } from '../../auth/decorators.js';
import { CurrentUser } from '../../auth/request-context.js';
import { toPrincipal } from '../transformers/user.transformer.js';
import { canReceive } from './event-access.js';
import { EventService } from '../../infra/events/event.service.js';
import type { UserEntity } from '../entities/user.entity.js';

const HEARTBEAT_MS = 25_000;

/**
 * Server-sent change events for the SPA (`new EventSource('/api/app/events?spaceId=…')`, cookie-authenticated).
 * The client refetches whatever an event names. Each user gets only the events for data they may read
 * (`canReceive`, checked with the access they had when connecting). A heartbeat keeps proxies from closing idle streams.
 */
@Controller('api/app/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Sse()
  @RequireAnyRole()
  stream(@CurrentUser() user: UserEntity, @Query('spaceId') spaceId?: string): Observable<MessageEvent> {
    const principal = toPrincipal(user);
    return merge(
      this.eventService.stream(spaceId).pipe(
        filter(event => canReceive(principal, event)),
        map(event => ({ type: 'change', data: event }) satisfies MessageEvent),
      ),
      interval(HEARTBEAT_MS).pipe(map(() => ({ type: 'heartbeat', data: {} }) satisfies MessageEvent)),
    );
  }
}
