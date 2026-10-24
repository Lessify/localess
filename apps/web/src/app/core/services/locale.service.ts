import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { GCP_SOURCE_SUPPORT_LOCALES, GCP_TARGET_SUPPORT_LOCALES, Locale } from '@localess/shared';
import { toProviderLocale } from '@shared/models/locale.model';
import { Observable } from 'rxjs';

/**
 * The locale catalog (`/api/app/locales`, the server's `LocaleController`) and what the translation provider supports.
 * A space's own locales: `SpaceLocaleService`; its default locale: `SpaceService.setDefaultLocale`.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly http = inject(HttpClient);

  /** Every locale a space can add. Database data, read-only. */
  findAll(): Observable<Locale[]> {
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
