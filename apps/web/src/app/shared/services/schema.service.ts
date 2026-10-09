import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { Schema, SchemaComponentUpdate, SchemaCreate, SchemaEnumUpdate, SchemaType } from '@localess/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Schemas of a space (`/api/app/spaces/:spaceId/schemas`); reads are live. */
@Injectable({ providedIn: 'root' })
export class SchemaService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/schemas`;
  }

  findAll(spaceId: string, type?: SchemaType): Observable<Schema[]> {
    const params = type ? new HttpParams().set('type', type) : undefined;
    return liveQueryWith(this.events, { spaceId, entities: ['schemas'] }, () => this.http.get<Schema[]>(this.base(spaceId), { params }));
  }

  countAll(spaceId: string): Observable<number> {
    return this.findAll(spaceId).pipe(map(it => it.length));
  }

  findById(spaceId: string, id: string): Observable<Schema> {
    return liveQueryWith(this.events, { spaceId, entities: ['schemas'], id }, () => this.http.get<Schema>(`${this.base(spaceId)}/${id}`));
  }

  create(spaceId: string, entity: SchemaCreate): Observable<void> {
    return this.http.post<void>(this.base(spaceId), { id: entity.id, type: entity.type, displayName: entity.displayName });
  }

  /** Renames in one server transaction (fields and timestamps are kept). */
  updateId(spaceId: string, entity: Schema, newId: string): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${entity.id}/id`, { id: newId });
  }

  updateComponent(spaceId: string, id: string, entity: SchemaComponentUpdate): Observable<void> {
    ObjectUtils.clean(entity);
    return this.http.put<void>(`${this.base(spaceId)}/${id}`, entity);
  }

  updateEnum(spaceId: string, id: string, entity: SchemaEnumUpdate): Observable<void> {
    ObjectUtils.clean(entity);
    return this.http.put<void>(`${this.base(spaceId)}/${id}`, entity);
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }
}
