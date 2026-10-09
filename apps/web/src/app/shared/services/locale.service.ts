import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AVAILABLE_LOCALES, GCP_SOURCE_SUPPORT_LOCALES, GCP_TARGET_SUPPORT_LOCALES, Locale } from '@localess/shared';
import { Observable, of } from 'rxjs';

import { toProviderLocale } from '../models/locale.model';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly http = inject(HttpClient);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}`;
  }

  markAsFallback(spaceId: string, entity: Locale): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/locale-fallback`, { id: entity.id });
  }

  create(spaceId: string, entity: Locale): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/locales`, { id: entity.id, name: entity.name });
  }

  delete(spaceId: string, entity: Locale): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/locales/${entity.id}`);
  }

  findAllLocales(): Observable<Locale[]> {
    return of([...AVAILABLE_LOCALES]);
  }

  /**
   * Whether a locale can be the *source* of a translation.
   *
   * On the content side the locale id can be the `default` sentinel rather than a language, so
   * callers there pass the space's fallback and it is resolved first - see `toProviderLocale()`.
   * Without a fallback the sentinel resolves to itself and is reported unsupported, which is the
   * safe answer: that is exactly what the provider would be sent.
   * @param locale locale id, possibly `CONTENT_DEFAULT_LOCALE.id`
   * @param fallbackLocale the space's fallback locale id, when `locale` may be the sentinel
   */
  isLocaleTranslatableFrom(locale: string, fallbackLocale?: string): boolean {
    return GCP_SOURCE_SUPPORT_LOCALES.has(toProviderLocale(locale, fallbackLocale));
  }

  /**
   * Whether a locale can be the *target* of a translation. Resolves the `default` sentinel the same
   * way as {@link isLocaleTranslatableFrom}.
   * @param locale locale id, possibly `CONTENT_DEFAULT_LOCALE.id`
   * @param fallbackLocale the space's fallback locale id, when `locale` may be the sentinel
   */
  isLocaleTranslatableTo(locale: string, fallbackLocale?: string): boolean {
    return GCP_TARGET_SUPPORT_LOCALES.has(toProviderLocale(locale, fallbackLocale));
  }
}
