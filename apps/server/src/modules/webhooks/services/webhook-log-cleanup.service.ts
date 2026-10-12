import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { WebhooksRepository } from '../repositories/webhooks.repository.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Deletes webhook delivery logs older than `LOCALESS_WEBHOOK_LOG_DAYS` (30 by default): one row is written per
 * delivery, so without this they grow forever. Runs at start, then every hour; every instance may run it.
 */
@Injectable()
export class WebhookLogCleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WebhookLogCleanupService.name);

  constructor(
    private readonly webhooks: WebhooksRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onApplicationBootstrap(): void {
    void this.run();
  }

  @Interval('webhook-log-cleanup', HOUR)
  hourly(): void {
    void this.run();
  }

  async cleanup(): Promise<void> {
    await this.webhooks.deleteLogsBefore(new Date(Date.now() - this.config.webhookLogDays * DAY));
  }

  private async run(): Promise<void> {
    await this.cleanup().catch(error => this.logger.error(`Webhook log cleanup failed: ${error}`));
  }
}
