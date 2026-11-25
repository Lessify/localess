import type { TaskProgress } from '@localess/shared';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';

import { EventService } from '../../../infra/events/event.service.js';

/**
 * The latest progress of each running task, kept in memory: progress is live state, published by the worker in events
 * and never stored. Every instance hears every event (LISTEN), so whichever answers `GET …/tasks/active` knows it. A
 * task's `updated` (claimed, ended) or `deleted` event drops it; an instance that just started knows a task's progress
 * from its next event on.
 */
@Injectable()
export class TaskProgressService implements OnModuleInit, OnModuleDestroy {
  private readonly progress = new Map<string, TaskProgress>();
  private subscription?: Subscription;

  constructor(private readonly eventService: EventService) {}

  onModuleInit(): void {
    this.subscription = this.eventService.stream().subscribe(event => {
      if (event.entity !== 'tasks' || !event.id) return;
      if (event.op === 'progress' && event.progress) this.progress.set(event.id, event.progress);
      else if (event.op === 'updated' || event.op === 'deleted') this.progress.delete(event.id);
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** The task's latest progress, if it reported any since it started (or since this instance did). */
  findOne(taskId: string): TaskProgress | undefined {
    return this.progress.get(taskId);
  }
}
