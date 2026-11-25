import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { AppConfigService } from '@core/api/app-config.service';
import { Locale } from '@localess/shared';
import { toProviderLocale } from '@shared/models/locale.model';
import { Observable } from 'rxjs';

/**
 * The locale catalog (`/api/app/locales`, the server's `LocaleController`) and what the connected translation providers support.
 * A space's own locales: `SpaceLocaleService`; its default locale: `SpaceService.setDefaultLocale`.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
  /** What the connected providers translate (`GET /api/config`, live): empty when none is connected. */
  private readonly sources = computed(() => new Set(this.appConfig.config().translate.sourceLocales));
  private readonly targets = computed(() => new Set(this.appConfig.config().translate.targetLocales));

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
    return this.sources().has(toProviderLocale(locale, defaultLocale));
  }

  /**
   * Whether a locale can be the *target* of a translation. Resolves the `default` sentinel the same
   * way as {@link isLocaleTranslatableFrom}.
   * @param locale locale id, possibly `CONTENT_DEFAULT_LOCALE.id`
   * @param defaultLocale the space's default locale id, when `locale` may be the sentinel
   */
  isLocaleTranslatableTo(locale: string, defaultLocale?: string): boolean {
    return this.targets().has(toProviderLocale(locale, defaultLocale));
  }
}
