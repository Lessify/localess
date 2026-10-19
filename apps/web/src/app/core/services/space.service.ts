import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import {
  IdName,
  Locale,
  Page,
  Space,
  SpaceCreate,
  SpaceDefaultLocaleUpdate,
  SpaceOverview,
  SpaceTemplateId,
  SpaceUpdate,
} from '@localess/shared';
import { Observable } from 'rxjs';

const BASE = '/api/app/spaces';

/**
 * Spaces (`/api/app/spaces`, the server's `SpaceController`); reads are live. Their environments:
 * `SpaceEnvironmentService`; their locales: `SpaceLocaleService`.
 */
@Injectable({ providedIn: 'root' })
export class SpaceService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  /** Every space the user can open (not being imported), by name; again whenever a space changes. The sidebar's list. */
  findAllNames(): Observable<IdName[]> {
    return liveQueryWith(this.events, { entities: ['spaces'] }, () => this.http.get<IdName[]>(`${BASE}/names`));
  }

  /** One page (`params`: a `PagedList`'s query); read again whenever a space changes. */
  findAll(params: HttpParams): Observable<Page<Space>> {
    return liveQueryWith(this.events, { entities: ['spaces'] }, () => this.http.get<Page<Space>>(BASE, { params }));
  }

  /** The space with its default locale and its locales; again whenever it changes. */
  findOne(id: string): Observable<Space> {
    return liveQueryWith(this.events, { entities: ['spaces'], id }, () => this.http.get<Space>(`${BASE}/${id}`));
  }

  /** The server seeds `en` as the default locale, and writes the template's content in the same transaction. */
  create(entity: SpaceCreate): Observable<Space> {
    const body: SpaceCreate = entity.template ? { name: entity.name, template: entity.template } : { name: entity.name };
    return this.http.post<Space>(BASE, body);
  }

  /** The ids of the templates this user may create a space from, in the order to offer them (the dialog has their titles and icons). */
  findTemplates(): Observable<SpaceTemplateId[]> {
    return this.http.get<SpaceTemplateId[]>(`${BASE}/templates`);
  }

  update(id: string, entity: SpaceUpdate): Observable<void> {
    return this.http.patch<void>(`${BASE}/${id}`, { name: entity.name } satisfies SpaceUpdate);
  }

  /** Apart from `update`: its own process on the server (the drafts that read the default go). Answers the space. */
  setDefaultLocale(id: string, locale: Locale): Observable<Space> {
    return this.http.put<Space>(`${BASE}/${id}/default-locale`, { id: locale.id } satisfies SpaceDefaultLocaleUpdate);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  /**
   * Dashboard numbers, computed by the server on each request; refetched when what they count changes (the space's
   * locales arrive as a `spaces` event).
   */
  findOverview(spaceId: string): Observable<SpaceOverview> {
    return liveQueryWith(this.events, { spaceId, entities: ['spaces', 'translations', 'assets', 'contents', 'schemas'] }, () =>
      this.http.get<SpaceOverview>(`${BASE}/${spaceId}/overview`),
    );
  }
}
