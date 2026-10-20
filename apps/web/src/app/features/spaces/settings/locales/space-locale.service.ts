import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Locale, Page, SpaceLocale, SpaceLocaleCreate, SpaceLocaleMove } from '@localess/shared';
import { Observable } from 'rxjs';

/**
 * A space's locales (`/api/app/spaces/:spaceId/locales`, the server's `SpaceLocaleController`), for Space Settings →
 * Locales. The default locale is the space's: `SpaceService.setDefaultLocale`. The locales a space can add:
 * `LocaleService.findAllLocales`.
 */
@Injectable({ providedIn: 'root' })
export class SpaceLocaleService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/locales`;
  }

  /** One page (`?page=&size=&sort=&direction=&search=`); again whenever the space changes (a locale change touches it). */
  findAll(spaceId: string, params: HttpParams): Observable<Page<SpaceLocale>> {
    return liveQueryWith(this.events, { entities: ['spaces'], id: spaceId }, () =>
      this.http.get<Page<SpaceLocale>>(this.base(spaceId), { params }),
    );
  }

  /** Adds a locale of the catalog at the end of the space's list; the server takes only its id. */
  create(spaceId: string, locale: Locale): Observable<SpaceLocale> {
    return this.http.post<SpaceLocale>(this.base(spaceId), { localeId: locale.id } satisfies SpaceLocaleCreate);
  }

  /** To `position` in the space's order (0 the first; past the end, the last), the others shifting. */
  move(spaceId: string, locale: Locale, position: number): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/${locale.id}/move`, { position } satisfies SpaceLocaleMove);
  }

  remove(spaceId: string, locale: Locale): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${locale.id}`);
  }
}
