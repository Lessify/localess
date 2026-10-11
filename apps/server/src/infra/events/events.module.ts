import { Global, Module } from '@nestjs/common';
import { EventsService } from './events.service.js';

/** Change events over pg_notify; the SSE endpoint that streams them to the app is shared/http/events.controller.ts. */
@Global()
@Module({
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
