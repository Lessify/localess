import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import type { PublicAppConfig } from '@localess/shared';
import { catchError, firstValueFrom, of } from 'rxjs';

export const DEFAULT_APP_CONFIG: PublicAppConfig = {
  auth: { providers: [], loginMessage: '', passwordResetByEmail: false },
  plugins: { unsplash: false },
  translate: { enabled: false },
};

/** Loaded once before the app renders (see `provideAppInitializer` in app.config.ts). */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  readonly config = signal<PublicAppConfig>(DEFAULT_APP_CONFIG);

  async load(): Promise<void> {
    const config = await firstValueFrom(this.http.get<PublicAppConfig>('/api/config').pipe(catchError(() => of(DEFAULT_APP_CONFIG))));
    this.config.set(config);
  }
}
