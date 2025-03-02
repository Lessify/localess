import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAnalytics, provideAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { getPerformance, providePerformance } from '@angular/fire/performance';
import { environment } from '../environments/environment';
import {
  browserPopupRedirectResolver,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  provideAuth,
} from '@angular/fire/auth';
import { connectFirestoreEmulator, initializeFirestore, provideFirestore } from '@angular/fire/firestore';
import { connectStorageEmulator, getStorage, provideStorage } from '@angular/fire/storage';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import { getRemoteConfig, provideRemoteConfig } from '@angular/fire/remote-config';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_PAGINATOR_DEFAULT_OPTIONS } from '@angular/material/paginator';
import { MAT_CHIPS_DEFAULT_OPTIONS } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler } from '@angular/router';
import { routes } from './app-routing';
import { provideMarkdown } from 'ngx-markdown';
import { CoreModule } from '@core/core.module';
import { AuthGuardModule } from '@angular/fire/auth-guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withNavigationErrorHandler(console.error)),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideAnimations(),
    provideMarkdown(),
    importProvidersFrom(CoreModule, AuthGuardModule),
    // Firebase
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = initializeAuth(getApp(), {
        persistence: indexedDBLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      });
      if (environment.emulator.enabled) {
        connectAuthEmulator(auth, 'http://localhost:9099', {
          disableWarnings: true,
        });
      }
      return auth;
    }),
    provideFirestore(() => {
      const firestore = initializeFirestore(getApp(), { localCache: { kind: 'persistent' } });
      if (environment.emulator.enabled) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    }),
    provideStorage(() => {
      const storage = getStorage();
      if (environment.emulator.enabled) {
        connectStorageEmulator(storage, 'localhost', 9199);
      }
      return storage;
    }),
    provideFunctions(() => {
      const functions = getFunctions();
      if (environment.emulator.enabled) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
        //functions.customDomain = 'http://localhost:4200/api'
        functions.region = 'europe-west6';
      } else {
        functions.region = 'europe-west6';
      }
      return functions;
    }),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    UserTrackingService,
    providePerformance(() => getPerformance()),
    provideRemoteConfig(() => {
      const remoteConfig = getRemoteConfig();
      remoteConfig.defaultConfig = {
        unsplash_ui_enable: false,
      };
      console.log('RemoteConfig:init', remoteConfig);
      return remoteConfig;
    }),
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
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' },
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
      provide: MAT_CHIPS_DEFAULT_OPTIONS,
      useValue: {
        separatorKeyCodes: [ENTER, COMMA],
      },
    },
  ],
};
