import type { PublicAppConfig } from '@localess/shared';
import { Controller, Get, Inject } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';
import { IntegrationService } from '../../shared/services/integration.service.js';
import { TranslateService } from '../../shared/services/translate.service.js';
import { Public } from '../decorators.js';
import { OAuthService } from '../services/oauth.service.js';

/**
 * Runtime settings for the SPA, replacing the build-time LOCALESS_* `--define`s so one build works
 * for every install. Public: the login page needs it before anyone is signed in.
 */
@Public()
@Controller('api/config')
export class AppConfigController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly oauthService: OAuthService,
    private readonly integrationService: IntegrationService,
    private readonly translateService: TranslateService,
  ) {}

  /** Read on every request: integrations change at runtime (Admin → Settings). */
  @Get()
  async get(): Promise<PublicAppConfig> {
    const unsplash = (await this.integrationService.resolve('unsplash')) !== undefined;
    const locales = await this.translateService.translatableLocales();
    return {
      auth: {
        providers: this.oauthService.enabledProviders().map(it => it.toUpperCase() as 'GOOGLE' | 'MICROSOFT'),
        loginMessage: this.config.loginMessage,
        passwordResetByEmail: this.config.smtp !== undefined,
      },
      plugins: { unsplash },
      translate: { enabled: locales.targetLocales.length > 0, ...locales },
      ...(this.config.instance ? { instance: this.config.instance } : {}),
    };
  }
}
