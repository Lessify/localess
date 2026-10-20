import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { IdNameUrl, Page, SpaceEnvironment, SpaceEnvironmentCreate, SpaceEnvironmentMove, SpaceEnvironmentUpdate } from '@localess/shared';
import { Observable } from 'rxjs';

/**
 * A space's Visual Editor environments (`/api/app/spaces/:spaceId/environments`, the server's `SpaceEnvironmentController`);
 * reads are live: an environment change touches the space, so they read again whenever the space changes.
 */
@Injectable({ providedIn: 'root' })
export class SpaceEnvironmentService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/environments`;
  }

  /** One page (`?page=&size=&sort=&direction=&search=`): Space Settings → Visual Editor. */
  findAll(spaceId: string, params: HttpParams): Observable<Page<SpaceEnvironment>> {
    return liveQueryWith(this.events, { entities: ['spaces'], id: spaceId }, () =>
      this.http.get<Page<SpaceEnvironment>>(this.base(spaceId), { params }),
    );
  }

  /** Every environment of the space in its order, as `{ id, name, url }` (what the Visual Editor previews with). */
  findAllNames(spaceId: string): Observable<IdNameUrl[]> {
    return liveQueryWith(this.events, { entities: ['spaces'], id: spaceId }, () =>
      this.http.get<IdNameUrl[]>(`${this.base(spaceId)}/names`),
    );
  }

  /** At the end of the space's list; answers it. */
  create(spaceId: string, environment: SpaceEnvironmentCreate): Observable<SpaceEnvironment> {
    return this.http.post<SpaceEnvironment>(this.base(spaceId), {
      name: environment.name,
      url: environment.url,
    } satisfies SpaceEnvironmentCreate);
  }

  update(spaceId: string, environmentId: string, environment: SpaceEnvironmentUpdate): Observable<SpaceEnvironment> {
    return this.http.put<SpaceEnvironment>(`${this.base(spaceId)}/${environmentId}`, {
      name: environment.name,
      url: environment.url,
    } satisfies SpaceEnvironmentUpdate);
  }

  remove(spaceId: string, environmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${environmentId}`);
  }

  /** To `position` in the space's order (0 the first; past the end, the last), the others shifting. */
  move(spaceId: string, environmentId: string, position: number): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/${environmentId}/move`, { position } satisfies SpaceEnvironmentMove);
  }
}
