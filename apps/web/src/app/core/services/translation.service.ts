import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Translation, TranslationCreate, TranslationType, TranslationUpdate } from '@localess/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

  countAll(spaceId: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.base(spaceId)}/count`).pipe(map(it => it.count));
  }

  findById(spaceId: string, id: string): Observable<Translation> {
    return liveQueryWith(this.events, { spaceId, entities: ['translations'], id }, () =>
      this.http.get<Translation>(`${this.base(spaceId)}/${id}`),
    );
  }

  create(spaceId: string, entity: TranslationCreate): Observable<void> {
    const locales: Record<string, string> = {};
    for (const [locale, value] of Object.entries(entity.locales)) {
      locales[locale] = this.wrapLocaleValue(entity.type, value);
    }
    const body: TranslationCreate = { id: entity.id, type: entity.type, locales };
    if (entity.labels && entity.labels.length > 0) {
      body.labels = entity.labels;
    }
    if (entity.description && entity.description.length > 0) {
      body.description = entity.description;
    }
    return this.http.post<void>(this.base(spaceId), body);
  }

  private wrapLocaleValue(type: TranslationType, value: string): string {
    switch (type) {
      case TranslationType.ARRAY:
        return `["${value}"]`;
      case TranslationType.PLURAL:
        return `{"0":"${value}"}`;
      case TranslationType.STRING:
      default:
        return value;
    }
  }

  /** Empty labels/description clear them. */
  update(spaceId: string, id: string, entity: TranslationUpdate): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { labels: entity.labels, description: entity.description });
  }

  /** Renames in one server transaction (values and timestamps are kept). */
  updateId(spaceId: string, entity: Translation, newId: string): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${entity.id}/id`, { id: newId });
  }

  /** An empty value removes the locale. */
  updateLocale(spaceId: string, id: string, locale: string, value: string): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}/locales/${locale}`, { value });
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }

  publish(spaceId: string): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/publish`, {});
  }

  deleteAll(spaceId: string): Observable<void> {
    return this.http.delete<void>(this.base(spaceId));
  }

  translateLocale(spaceId: string, sourceLocaleId: string, targetLocaleId: string, overwrite = false): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/translate-locale`, { sourceLocaleId, targetLocaleId, overwrite });
  }
}
