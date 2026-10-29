import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import type { PublicAppConfig } from '@localess/shared';
import { catchError, filter, firstValueFrom, of, Subscription } from 'rxjs';

import { ChangeEventsService } from './change-events.service';

export const DEFAULT_APP_CONFIG: PublicAppConfig = {
  auth: { providers: [], loginMessage: '', passwordResetByEmail: false },
  plugins: { unsplash: false },
  translate: { enabled: false, sourceLocales: [], targetLocales: [] },
};

/**
 * Loaded once before the app renders (see `provideAppInitializer` in app.config.ts), and again when an admin changes an
 * integration (`watch()`, while signed in): the Translate buttons and the Unsplash picker follow without a reload.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);
  readonly config = signal<PublicAppConfig>(DEFAULT_APP_CONFIG);

  async load(): Promise<void> {
    const config = await firstValueFrom(this.http.get<PublicAppConfig>('/api/config').pipe(catchError(() => of(DEFAULT_APP_CONFIG))));
    this.config.set(config);
  }

  /** Reloads on `integrations` events and after the stream reconnects (`*`). Signed-in only: the stream needs a session. */
  watch(): Subscription {
    return this.events
      .changes()
      .pipe(filter(event => event.entity === 'integrations' || event.entity === '*'))
      .subscribe(() => void this.load());
  }
}
