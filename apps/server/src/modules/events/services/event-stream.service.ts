import { Injectable, MessageEvent, NotFoundException } from '@nestjs/common';
import { filter, interval, map, merge, Observable } from 'rxjs';

import { type ChangeEvent, EventService } from '../../../infra/events/event.service.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { canReceive, isGlobal, isInSpace } from '../utils/event-access.js';

const HEARTBEAT_MS = 25_000;

/**
 * The App API's two change streams: the global one (spaces, users) and one per space (everything in it). Each user gets
 * only the events for data they may read (`canReceive`, checked with the access they had when connecting). A heartbeat
 * keeps proxies from closing idle streams.
 */
@Injectable()
export class EventStreamService {
  constructor(
    private readonly eventService: EventService,
    private readonly spaceLookupRepository: SpaceLookupRepository,
  ) {}

  /** Changes outside spaces: the spaces themselves (the space lists) and users. */
  findGlobal(user: UserEntity): Observable<MessageEvent> {
    return this.messages(user, isGlobal);
  }

  /** Everything that changes in the space, the space itself included. 404 for an unknown space. */
  async findSpace(user: UserEntity, spaceId: string): Promise<Observable<MessageEvent>> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
    return this.messages(user, event => isInSpace(event, spaceId));
  }

  private messages(user: UserEntity, scope: (event: ChangeEvent) => boolean): Observable<MessageEvent> {
    const listener = { id: user.id, role: user.role };
    return merge(
      this.eventService.stream().pipe(
        filter(event => scope(event) && canReceive(listener, event)),
        map(event => ({ type: 'change', data: event }) satisfies MessageEvent),
      ),
      interval(HEARTBEAT_MS).pipe(map(() => ({ type: 'heartbeat', data: {} }) satisfies MessageEvent)),
    );
  }
}
