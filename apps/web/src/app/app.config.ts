import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_PAGINATOR_DEFAULT_OPTIONS } from '@angular/material/paginator';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler } from '@angular/router';
import { apiInterceptor } from '@core/api/api.interceptor';
import { AppConfigService } from '@core/api/app-config.service';
import { CoreModule } from '@core/core.module';
import { PAGINATOR_DEFAULT_OPTIONS } from '@shared/components/paginator/paginator.component';

import { routes } from './app-routing';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withNavigationErrorHandler(console.error)),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor]), withInterceptorsFromDi()),
    provideNativeDateAdapter(),
    importProvidersFrom(CoreModule),
    // Runtime settings (login providers, plugins) from the server before the first render.
    provideAppInitializer(() => inject(AppConfigService).load()),
    {
      provide: IMAGE_LOADER,
      useValue: (config: ImageLoaderConfig) => {
        // optimize image for API assets
        if (config.src.startsWith('/api/') && config.width) {
          const thumbnailParam = config.loaderParams && config.loaderParams['thumbnail'] ? '&thumbnail=true' : '';
          return `${config.src}?w=${config.width}${thumbnailParam}`;
        } else {
          return config.src;
        }
      },
    },
    {
      provide: MAT_PAGINATOR_DEFAULT_OPTIONS,
      useValue: {
        pageSize: 20,
        pageSizeOptions: [10, 20, 50, 100],
        showFirstLastButtons: true,
      },
    },
    {
      provide: PAGINATOR_DEFAULT_OPTIONS,
      useValue: {
        pageSize: 20,
        pageSizeOptions: [10, 20, 50, 100],
        showFirstLastButtons: true,
      },
    },
  ],
};
