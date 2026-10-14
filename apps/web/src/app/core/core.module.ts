import { ErrorHandler, inject, NgModule } from '@angular/core';
import { TitleStrategy } from '@angular/router';

import { AppErrorHandler } from './error-handler/app-error-handler.service';
import { PageTitleStrategy } from './title/page-title.strategy';

@NgModule({
  declarations: [],
  exports: [],
  imports: [],
  providers: [
    // HTTP errors are not forwarded here: the caller shows its own message. An error nobody handles
    // reaches AppErrorHandler through provideBrowserGlobalErrorListeners() (app.config.ts).
    { provide: ErrorHandler, useClass: AppErrorHandler },
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
})
export class CoreModule {
  constructor() {
    const parentModule = inject(CoreModule, { optional: true, skipSelf: true });

    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import only in AppModule');
    }
  }
}
