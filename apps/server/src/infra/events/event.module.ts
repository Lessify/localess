import { Global, Module } from '@nestjs/common';

import { EventService } from './event.service.js';

/** Change events over pg_notify; the SSE endpoint that streams them to the app is shared/http/event.controller.ts. */
@Global()
@Module({
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
