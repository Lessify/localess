import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import {
  IdName,
  Page,
  Space,
  SpaceCreate,
  SpaceEnvironment,
  SpaceEnvironmentCreate,
  SpaceEnvironmentOrder,
  SpaceEnvironmentUpdate,
  SpaceOverview,
  SpaceTemplateId,
  SpaceUpdate,
} from '@localess/shared';
import { Observable } from 'rxjs';

const BASE = '/api/app/spaces';

/** Spaces (`/api/app/spaces`); reads are live. */
@Injectable({ providedIn: 'root' })
export class SpaceService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  /** Every space the user can open (not being imported), by name; again whenever a space changes. The sidebar's list. */
  findAllNames(): Observable<IdName[]> {
    return liveQueryWith(this.events, { entities: ['spaces'] }, () => this.http.get<IdName[]>(`${BASE}/names`));
  }

  /** One page (`params`: a `PagedList`'s query); read again whenever a space changes. */
  findPage(params: HttpParams): Observable<Page<Space>> {
    return liveQueryWith(this.events, { entities: ['spaces'] }, () => this.http.get<Page<Space>>(BASE, { params }));
  }

  /** The space with its default locale and its locales; again whenever it changes. */
  findById(id: string): Observable<Space> {
    return liveQueryWith(this.events, { entities: ['spaces'], id }, () => this.http.get<Space>(`${BASE}/${id}`));
  }

  /** The space's environments in their order; again whenever the space changes (an environment change touches it). */
  findEnvironments(spaceId: string): Observable<SpaceEnvironment[]> {
    return liveQueryWith(this.events, { entities: ['spaces'], id: spaceId }, () =>
      this.http.get<SpaceEnvironment[]>(`${BASE}/${spaceId}/environments`),
    );
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

  /** Adds a Visual Editor environment at the end of the list. Environment writes answer the list after them. */
  createEnvironment(spaceId: string, environment: SpaceEnvironmentCreate): Observable<SpaceEnvironment[]> {
    return this.http.post<SpaceEnvironment[]>(`${BASE}/${spaceId}/environments`, {
      name: environment.name,
      url: environment.url,
    } satisfies SpaceEnvironmentCreate);
  }

  updateEnvironment(spaceId: string, environmentId: string, environment: SpaceEnvironmentUpdate): Observable<SpaceEnvironment[]> {
    return this.http.patch<SpaceEnvironment[]>(`${BASE}/${spaceId}/environments/${environmentId}`, {
      name: environment.name,
      url: environment.url,
    } satisfies SpaceEnvironmentUpdate);
  }

  deleteEnvironment(spaceId: string, environmentId: string): Observable<SpaceEnvironment[]> {
    return this.http.delete<SpaceEnvironment[]>(`${BASE}/${spaceId}/environments/${environmentId}`);
  }

  /** `environmentIds`: every environment of the space, in the new order. */
  reorderEnvironments(spaceId: string, environmentIds: string[]): Observable<SpaceEnvironment[]> {
    return this.http.put<SpaceEnvironment[]>(`${BASE}/${spaceId}/environments/order`, {
      ids: environmentIds,
    } satisfies SpaceEnvironmentOrder);
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
