import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { environment } from '../environments/environment';
import {
  browserPopupRedirectResolver,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  provideAuth,
} from '@angular/fire/auth';
import { AuthGuardModule } from '@angular/fire/auth-guard';
import { connectFirestoreEmulator, initializeFirestore, provideFirestore } from '@angular/fire/firestore';
import { connectStorageEmulator, getStorage, provideStorage } from '@angular/fire/storage';
import { CoreModule } from '@core/core.module';
import { MAT_PAGINATOR_DEFAULT_OPTIONS } from '@angular/material/paginator';
import { MAT_CHIPS_DEFAULT_OPTIONS } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import { getPerformance, providePerformance } from '@angular/fire/performance';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';

@NgModule({
  declarations: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MarkdownModule.forRoot(),
    //Core
    CoreModule,

    //Firebase
    AuthGuardModule,

    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = initializeAuth(getApp(), {
        persistence: indexedDBLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      });
      if (environment.useEmulators) {
        connectAuthEmulator(auth, 'http://localhost:9099', {
          disableWarnings: true,
        });
      }
      return auth;
    }),
    provideFirestore(() => {
      const firestore = initializeFirestore(getApp(), { localCache: { kind: 'persistent' } });
      if (environment.useEmulators) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    }),
    provideStorage(() => {
      const storage = getStorage();
      if (environment.useEmulators) {
        connectStorageEmulator(storage, 'localhost', 9199);
      }
      return storage;
    }),
    provideFunctions(() => {
      const functions = getFunctions();
      if (environment.useEmulators) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
        //functions.customDomain = 'http://localhost:4200/api'
        functions.region = 'europe-west6';
      } else {
        functions.region = 'europe-west6';
      }
      return functions;
    }),
    providePerformance(() => {
      return getPerformance();
    }),
  ],
  providers: [
    {
      provide: IMAGE_LOADER,
      useValue: (config: ImageLoaderConfig) => {
        // optimize image for API assets
        if (config.src.startsWith('/api/') && config.width) {
          return `${config.src}?w=${config.width}`;
        } else {
          return config.src;
        }
      },
    },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
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
  bootstrap: [AppComponent],
})
export class AppModule {}
