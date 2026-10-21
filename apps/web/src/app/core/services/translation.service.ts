import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import {
  Translation,
  TranslationCreate,
  TranslationLocaleUpdate,
  TranslationRename,
  TranslationTranslateLocale,
  TranslationUpdate,
} from '@localess/shared';
import { Observable } from 'rxjs';

/**
 * Translations of a space (`/api/app/spaces/:spaceId/translations`); reads are live.
 * The server recomputes the draft and fires webhooks on every write, so there is no separate draft publish.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/translations`;
  }

  findAll(spaceId: string): Observable<Translation[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['translations'] }, () => this.http.get<Translation[]>(this.base(spaceId)));
  }

  create(spaceId: string, entity: TranslationCreate): Observable<void> {
    const body: TranslationCreate = { key: entity.key, locales: entity.locales };
    if (entity.labels && entity.labels.length > 0) {
      body.labels = entity.labels;
    }
    if (entity.description && entity.description.length > 0) {
      body.description = entity.description;
    }
    return this.http.post<void>(this.base(spaceId), body);
  }

  /** Empty labels/description clear them. */
  update(spaceId: string, id: string, entity: TranslationUpdate): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, {
      labels: entity.labels,
      description: entity.description,
    } satisfies TranslationUpdate);
  }

  /** Changes the key; the id, values and timestamps are kept. */
  rename(spaceId: string, entity: Translation, key: string): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${entity.id}/key`, { key } satisfies TranslationRename);
  }

  /** An empty value removes the locale. */
  updateLocale(spaceId: string, id: string, locale: string, value: string): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}/locales/${locale}`, { value } satisfies TranslationLocaleUpdate);
  }

  remove(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }

  publish(spaceId: string): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/publish`, {});
  }

  removeAll(spaceId: string): Observable<void> {
    return this.http.delete<void>(this.base(spaceId));
  }

  /** Keys written, and keys the provider failed on (left unchanged). */
  translateLocale(
    spaceId: string,
    sourceLocaleId: string,
    targetLocaleId: string,
    overwrite = false,
  ): Observable<{ translated: number; failed: number }> {
    return this.http.post<{ translated: number; failed: number }>(`${this.base(spaceId)}/translate-locale`, {
      sourceLocaleId,
      targetLocaleId,
      overwrite,
    } satisfies TranslationTranslateLocale);
  }
}
