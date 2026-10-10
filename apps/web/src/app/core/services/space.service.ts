import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Space, SpaceCreate, SpaceEnvironmentInput, SpaceOverview, SpaceUpdate } from '@localess/shared';
import { Observable } from 'rxjs';

const BASE = '/api/app/spaces';

/** Spaces (`/api/app/spaces`); reads are live. */
@Injectable({ providedIn: 'root' })
export class SpaceService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  /** Ordered by name (server side). */
  findAll(): Observable<Space[]> {
    return liveQueryWith(this.events, { entities: ['spaces'] }, () => this.http.get<Space[]>(BASE));
  }

  findById(id: string): Observable<Space> {
    return liveQueryWith(this.events, { entities: ['spaces'], id }, () => this.http.get<Space>(`${BASE}/${id}`));
  }

  /** The server seeds `en` as the only and default locale. */
  create(entity: SpaceCreate): Observable<Space> {
    return this.http.post<Space>(BASE, { name: entity.name });
  }

  update(id: string, entity: SpaceUpdate): Observable<void> {
    return this.http.patch<void>(`${BASE}/${id}`, { name: entity.name });
  }

  /** Adds a Visual Editor environment at the end of the list. */
  createEnvironment(spaceId: string, environment: SpaceEnvironmentInput): Observable<void> {
    return this.http.post<void>(`${BASE}/${spaceId}/environments`, { name: environment.name, url: environment.url });
  }

  updateEnvironment(spaceId: string, environmentId: string, environment: SpaceEnvironmentInput): Observable<void> {
    return this.http.patch<void>(`${BASE}/${spaceId}/environments/${environmentId}`, { name: environment.name, url: environment.url });
  }

  deleteEnvironment(spaceId: string, environmentId: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${spaceId}/environments/${environmentId}`);
  }

  /** `environmentIds`: every environment of the space, in the new order. */
  reorderEnvironments(spaceId: string, environmentIds: string[]): Observable<void> {
    return this.http.put<void>(`${BASE}/${spaceId}/environments/order`, { ids: environmentIds });
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
