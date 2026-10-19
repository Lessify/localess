import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import {
  Page,
  Space,
  SpaceCreate,
  SpaceEnvironmentCreate,
  SpaceEnvironmentOrder,
  SpaceEnvironmentUpdate,
  SpaceOverview,
  SpaceTemplateId,
  SpaceUpdate,
} from '@localess/shared';
import { EMPTY, expand, Observable, reduce } from 'rxjs';

const BASE = '/api/app/spaces';

/** Spaces (`/api/app/spaces`); reads are live. */
@Injectable({ providedIn: 'root' })
export class SpaceService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  /** Ordered by name (server side). */
  /**
   * Every space a user can open (not being imported), by name: page after page of 100 until `total`, emitted once
   * all are in; again whenever a space changes. The space switcher, the selected space and the space guard read it.
   */
  findAllPages(): Observable<Space[]> {
    const get = (page: number) =>
      this.http.get<Page<Space>>(BASE, {
        params: new HttpParams().set('page', page).set('size', 100).set('sort', 'name').set('direction', 'asc').set('importing', 'false'),
      });
    return liveQueryWith(this.events, { entities: ['spaces'] }, () =>
      get(0).pipe(
        expand(it => ((it.page + 1) * it.size < it.total ? get(it.page + 1) : EMPTY)),
        reduce((all, it) => [...all, ...it.items], [] as Space[]),
      ),
    );
  }

  /** One page (`params`: a `PagedList`'s query); read again whenever a space changes. */
  findPage(params: HttpParams): Observable<Page<Space>> {
    return liveQueryWith(this.events, { entities: ['spaces'] }, () => this.http.get<Page<Space>>(BASE, { params }));
  }

  findById(id: string): Observable<Space> {
    return liveQueryWith(this.events, { entities: ['spaces'], id }, () => this.http.get<Space>(`${BASE}/${id}`));
  }

  /** The server seeds `en` as the default locale, and writes the template's content in the same transaction. */
  create(entity: SpaceCreate): Observable<Space> {
    const body: SpaceCreate = entity.template ? { name: entity.name, template: entity.template } : { name: entity.name };
    return this.http.post<Space>(BASE, body);
  }

  /** The ids of the templates this user may create a space from, in the order to offer them (the dialog has their titles and icons). */
  templates(): Observable<SpaceTemplateId[]> {
    return this.http.get<SpaceTemplateId[]>(`${BASE}/templates`);
  }

  update(id: string, entity: SpaceUpdate): Observable<void> {
    return this.http.patch<void>(`${BASE}/${id}`, { name: entity.name } satisfies SpaceUpdate);
  }

  /** Adds a Visual Editor environment at the end of the list. */
  createEnvironment(spaceId: string, environment: SpaceEnvironmentCreate): Observable<void> {
    return this.http.post<void>(`${BASE}/${spaceId}/environments`, {
      name: environment.name,
      url: environment.url,
    } satisfies SpaceEnvironmentCreate);
  }

  updateEnvironment(spaceId: string, environmentId: string, environment: SpaceEnvironmentUpdate): Observable<void> {
    return this.http.patch<void>(`${BASE}/${spaceId}/environments/${environmentId}`, {
      name: environment.name,
      url: environment.url,
    } satisfies SpaceEnvironmentUpdate);
  }

  deleteEnvironment(spaceId: string, environmentId: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${spaceId}/environments/${environmentId}`);
  }

  /** `environmentIds`: every environment of the space, in the new order. */
  reorderEnvironments(spaceId: string, environmentIds: string[]): Observable<void> {
    return this.http.put<void>(`${BASE}/${spaceId}/environments/order`, { ids: environmentIds } satisfies SpaceEnvironmentOrder);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  /**
   * Dashboard numbers, computed by the server on each request; refetched when what they count changes (the space's
   * locales arrive as a `spaces` event).
   */
  overview(spaceId: string): Observable<SpaceOverview> {
    return liveQueryWith(this.events, { spaceId, entities: ['spaces', 'translations', 'assets', 'contents', 'schemas'] }, () =>
      this.http.get<SpaceOverview>(`${BASE}/${spaceId}/overview`),
    );
  }
}
