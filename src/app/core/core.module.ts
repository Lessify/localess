import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorHandler, NgModule, inject } from '@angular/core';
import { TitleStrategy } from '@angular/router';

import { AppErrorHandler } from './error-handler/app-error-handler.service';
import { HttpErrorInterceptor } from './http-interceptors/http-error.interceptor';
import { PageTitleStrategy } from './title/page-title.strategy';

@NgModule({
  declarations: [],
  exports: [],
  imports: [],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
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
