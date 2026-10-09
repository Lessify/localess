import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Space, SpaceCreate, SpaceEnvironment, SpaceUpdate } from '@localess/shared';
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

  /** The server seeds the default `en` locale as fallback. */
  create(entity: SpaceCreate): Observable<Space> {
    return this.http.post<Space>(BASE, { name: entity.name });
  }

  update(id: string, entity: SpaceUpdate): Observable<void> {
    return this.http.patch<void>(`${BASE}/${id}`, { name: entity.name });
  }

  updateEnvironments(id: string, environments: SpaceEnvironment[]): Observable<void> {
    return this.http.patch<void>(`${BASE}/${id}`, { environments });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  calculateOverview(spaceId: string): Observable<void> {
    return this.http.post<void>(`${BASE}/${spaceId}/overview`, {});
  }
}
