import { Global, Module } from '@nestjs/common';

import { EventService } from './event.service.js';

/** Change events over pg_notify; the SSE endpoint that streams them to the app is modules/events (EventStreamModule). */
@Global()
@Module({
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
