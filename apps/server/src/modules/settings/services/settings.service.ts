import { Injectable } from '@nestjs/common';
import { toSettings } from '../../../shared/transformers/settings.transformer.js';
import { SettingsRepository, type SettingsUi } from '../repositories/settings.repository.js';

/** Global app settings. */
@Injectable()
export class SettingsService {
  constructor(private readonly settings: SettingsRepository) {}

  /** `{}` until something was saved. */
  async get(): Promise<Record<string, unknown>> {
    const entity = await this.settings.find();
    return entity ? toSettings(entity) : {};
  }

  async updateUi(ui: SettingsUi): Promise<Record<string, unknown>> {
    return toSettings(await this.settings.saveUi(ui));
  }
}
