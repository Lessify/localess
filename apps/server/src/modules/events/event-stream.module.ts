import { Module } from '@nestjs/common';

import { EventController } from './controllers/event.controller.js';
import { SpaceEventController } from './controllers/space-event.controller.js';
import { EventStreamService } from './services/event-stream.service.js';

/**
 * The SSE change streams of the App API: `/api/app/events` (spaces, users) and `/api/app/spaces/:spaceId/events`
 * (everything in one space), from the events every module publishes through `infra/events`, filtered by what each user
 * may read. Publishing stays in infra; this module only serves them.
 */
@Module({
  controllers: [EventController, SpaceEventController],
  providers: [EventStreamService],
})
export class EventStreamModule {}
