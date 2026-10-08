import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import { OAuthService } from '../auth/oauth.service.js';
import { APP_CONFIG, AppConfig } from '../config/config.js';

export interface PublicAppConfig {
  auth: {
    /** OAuth providers the login page offers, in the Firebase-era names. */
    providers: ('GOOGLE' | 'MICROSOFT')[];
    loginMessage: string;
    passwordResetByEmail: boolean;
  };
}

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
    };
  }
}
