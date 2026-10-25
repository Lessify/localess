import { Module } from '@nestjs/common';

import { EventController } from './controllers/event.controller.js';

/**
 * The SSE change stream of the App API (`/api/app/events`): the events every module publishes through `infra/events`,
 * filtered by what each user may read. Publishing stays in infra; this module only serves them.
 */
@Module({
  controllers: [EventController],
})
export class EventStreamModule {}
