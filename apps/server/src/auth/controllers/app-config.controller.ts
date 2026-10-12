import { Controller, Get, Inject } from '@nestjs/common';
import type { PublicAppConfig } from '@localess/shared';
import { Public } from '../decorators.js';
import { OAuthService } from '../services/oauth.service.js';
import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';

/**
 * Runtime settings for the SPA, replacing the build-time LOCALESS_* `--define`s so one build works
 * for every install. Public: the login page needs it before anyone is signed in.
 */
@Public()
@Controller('api/config')
export class AppConfigController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly oauth: OAuthService,
  ) {}

  @Get()
  get(): PublicAppConfig {
    return {
      auth: {
        providers: this.oauth.enabledProviders().map(it => it.toUpperCase() as 'GOOGLE' | 'MICROSOFT'),
        loginMessage: this.config.loginMessage,
        passwordResetByEmail: this.config.smtp !== undefined,
      },
      plugins: { unsplash: this.config.unsplash !== undefined },
      translate: { enabled: this.config.translate.provider !== 'none' },
      ...(this.config.instance ? { instance: this.config.instance } : {}),
    };
  }
}
