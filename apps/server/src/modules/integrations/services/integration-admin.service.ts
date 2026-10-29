import {
  type Integration,
  INTEGRATION_IDS,
  type IntegrationEnabledUpdate,
  type IntegrationId,
  type IntegrationList,
  type IntegrationSave,
  type IntegrationTest,
  type IntegrationTestResult,
  type TranslatePrimaryUpdate,
} from '@localess/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { INTEGRATION_PROVIDERS, type IntegrationProviders } from '../../../shared/integrations/integration-providers.js';
import { IntegrationService } from '../../../shared/services/integration.service.js';

const isIntegrationId = (id: string): id is IntegrationId => (INTEGRATION_IDS as string[]).includes(id);

/**
 * Admin → Settings → Integrations: connect (test, then save), test, switch on and off, disconnect, pick the primary
 * translation provider. An env-locked integration is read-only (409).
 */
@Injectable()
export class IntegrationAdminService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly integrationService: IntegrationService,
    @Inject(INTEGRATION_PROVIDERS) private readonly providers: IntegrationProviders,
  ) {}

  async findAll(): Promise<IntegrationList> {
    return { integrations: await this.integrationService.findAll(), translatePrimary: await this.integrationService.translatePrimary() };
  }

  /** `values` without saving them; else the active configuration, whose outcome is recorded when it was saved in the UI. */
  async test(id: string, body: IntegrationTest): Promise<IntegrationTestResult> {
    const integration = this.known(id);
    const provider = this.providers[integration];
    if (body.values) {
      const problem = provider.validate(body.values);
      return problem ? { ok: false, reason: 'invalid', message: problem } : provider.test(body.values);
    }
    const active = await this.integrationService.resolve(integration);
    if (!active) throw new NotFoundException(`${integration} is not connected`);
    const result = await provider.test(active.values);
    if (result.ok) await this.integrationService.recordOutcome(integration, { ok: true });
    else if (result.reason === 'auth' || result.reason === 'setup')
      await this.integrationService.recordOutcome(integration, { ok: false, reason: 'auth', message: result.message });
    else if (result.reason === 'quota')
      await this.integrationService.recordOutcome(integration, { ok: false, reason: 'quota', message: result.message });
    return result;
  }

  /** Tests, then saves: a failed test answers 422 with its result and saves nothing; `skipTest` saves it unverified. */
  async update(id: string, body: IntegrationSave, userId: string): Promise<Integration> {
    const integration = this.editable(id);
    const storage = this.integrationService.secretStorage();
    if (!storage.available) throw new ServiceUnavailableException(storage.reason);
    const provider = this.providers[integration];
    const problem = provider.validate(body.values);
    if (problem) throw new BadRequestException(problem);
    if (!body.skipTest) {
      const result = await provider.test(body.values);
      if (!result.ok) throw new UnprocessableEntityException(result);
    }
    await this.integrationService.save(integration, body.values, body.skipTest ? 'unverified' : 'verified', userId);
    return this.findOne(integration);
  }

  async updateEnabled(id: string, body: IntegrationEnabledUpdate, userId: string): Promise<Integration> {
    const integration = this.editable(id);
    if ((await this.findOne(integration)).source !== 'ui') throw new NotFoundException(`${integration} is not connected`);
    await this.integrationService.setEnabled(integration, body.enabled, userId);
    return this.findOne(integration);
  }

  /** Disconnect: the saved values are deleted. */
  async remove(id: string): Promise<void> {
    await this.integrationService.remove(this.editable(id));
  }

  async updateTranslatePrimary(body: TranslatePrimaryUpdate, userId: string): Promise<IntegrationList['translatePrimary']> {
    if (this.config.translatePrimary) throw new ConflictException('Set by LOCALESS_TRANSLATE_PRIMARY in the server environment');
    await this.integrationService.setTranslatePrimary(body.value, userId);
    return this.integrationService.translatePrimary();
  }

  private async findOne(id: IntegrationId): Promise<Integration> {
    return (await this.integrationService.findAll()).find(it => it.id === id)!;
  }

  private known(id: string): IntegrationId {
    if (!isIntegrationId(id)) throw new NotFoundException(`Unknown integration: ${id}`);
    return id;
  }

  /** A known integration the UI may change: not env-locked. */
  private editable(id: string): IntegrationId {
    const integration = this.known(id);
    if (this.integrationService.isEnvLocked(integration)) {
      throw new ConflictException(`${integration} is set in the server environment: change it there and restart`);
    }
    return integration;
  }
}
