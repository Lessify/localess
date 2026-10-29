import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import {
  Page,
  Translation,
  TranslationCreate,
  TranslationLocaleUpdate,
  TranslationNode,
  TranslationRename,
  TranslationUpdate,
} from '@localess/shared';
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

  /** One page of the keys (`params`: page, size and the filter), read once; `TranslationPages` reads again on changes. */
  findAll(spaceId: string, params: HttpParams): Observable<Page<Translation>> {
    return this.http.get<Page<Translation>>(this.base(spaceId), { params });
  }

  /** One level of the tree below `parent` (`params`), read once; `TranslationTree` reads the open levels again on changes. */
  findNodes(spaceId: string, params: HttpParams): Observable<Page<TranslationNode>> {
    return this.http.get<Page<TranslationNode>>(`${this.base(spaceId)}/nodes`, { params });
  }

  /** One translation (the detail panel), read again when it changes. */
  findOne(spaceId: string, id: string): Observable<Translation> {
    return liveQueryWith(this.events, { spaceId, entities: ['translations'], id }, () =>
      this.http.get<Translation>(`${this.base(spaceId)}/${id}`),
    );
  }

  /** Every label of the space's translations, read again on every translation change. */
  findLabels(spaceId: string): Observable<string[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['translations'] }, () =>
      this.http.get<string[]>(`${this.base(spaceId)}/labels`),
    );
  }

  /** Whether the space has a translation with exactly this key (the add and rename dialogs). */
  isKeyTaken(spaceId: string, key: string): Observable<boolean> {
    return this.http
      .get<Page<Translation>>(this.base(spaceId), { params: new HttpParams().set('key', key).set('size', 1) })
      .pipe(map(page => page.total > 0));
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

  /**
   * The URL of `TranslationController.exportLocale` (one locale's draft values as key-value JSON), not a request:
   * same-origin and cookie-authenticated, so it is handed straight to `saveAs`.
   */
  exportLocaleUrl(spaceId: string, locale: string): string {
    return `${this.base(spaceId)}/export/${encodeURIComponent(locale)}`;
  }
}
