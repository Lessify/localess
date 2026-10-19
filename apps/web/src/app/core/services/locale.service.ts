import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import {
  GCP_SOURCE_SUPPORT_LOCALES,
  GCP_TARGET_SUPPORT_LOCALES,
  Locale,
  Page,
  Space,
  SpaceDefaultLocaleUpdate,
  SpaceLocale,
  SpaceLocaleCreate,
  SpaceLocaleOrder,
} from '@localess/shared';
import { toProviderLocale } from '@shared/models/locale.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}`;
  }

  /**
   * One page of the space's locales (`?page=&size=&sort=&direction=&search=`); again whenever the space changes (a
   * locale change touches it).
   */
  findPage(spaceId: string, params: HttpParams): Observable<Page<SpaceLocale>> {
    return liveQueryWith(this.events, { entities: ['spaces'], id: spaceId }, () =>
      this.http.get<Page<SpaceLocale>>(`${this.base(spaceId)}/locales`, { params }),
    );
  }

  /** Answers the space, with its new `defaultLocaleId`. */
  setDefault(spaceId: string, entity: Locale): Observable<Space> {
    return this.http.put<Space>(`${this.base(spaceId)}/default-locale`, { id: entity.id } satisfies SpaceDefaultLocaleUpdate);
  }

  /** Adds a locale from the list (`findAllLocales`); the server takes only its id. */
  create(spaceId: string, entity: Locale): Observable<SpaceLocale> {
    return this.http.post<SpaceLocale>(`${this.base(spaceId)}/locales`, { id: entity.id } satisfies SpaceLocaleCreate);
  }

  /** `localeIds`: every locale of the space, in the new order. */
  reorder(spaceId: string, localeIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/locales/order`, { ids: localeIds } satisfies SpaceLocaleOrder);
  }

  delete(spaceId: string, entity: Locale): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/locales/${entity.id}`);
  }

  /** Every locale a space can add. Database data, read-only. */
  findAllLocales(): Observable<Locale[]> {
    return this.http.get<Locale[]>('/api/app/locales');
  }

  /**
   * Whether a locale can be the *source* of a translation.
   *
   * On the content side the locale id can be the `default` sentinel rather than a language, so
   * callers there pass the space's fallback and it is resolved first - see `toProviderLocale()`.
   * Without a fallback the sentinel resolves to itself and is reported unsupported, which is the
   * safe answer: that is exactly what the provider would be sent.
   * @param locale locale id, possibly `CONTENT_DEFAULT_LOCALE.id`
   * @param defaultLocale the space's default locale id, when `locale` may be the sentinel
   */
  isLocaleTranslatableFrom(locale: string, defaultLocale?: string): boolean {
    return GCP_SOURCE_SUPPORT_LOCALES.has(toProviderLocale(locale, defaultLocale));
  }

  /**
   * Whether a locale can be the *target* of a translation. Resolves the `default` sentinel the same
   * way as {@link isLocaleTranslatableFrom}.
   * @param locale locale id, possibly `CONTENT_DEFAULT_LOCALE.id`
   * @param defaultLocale the space's default locale id, when `locale` may be the sentinel
   */
  isLocaleTranslatableTo(locale: string, defaultLocale?: string): boolean {
    return GCP_TARGET_SUPPORT_LOCALES.has(toProviderLocale(locale, defaultLocale));
  }
}
