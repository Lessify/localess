import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { Schema, SchemaCreate, SchemaRename, SchemaType, SchemaUpdate, SchemaUsage } from '@localess/shared';
import { Observable } from 'rxjs';

/** Schemas of a space (`/api/app/spaces/:spaceId/schemas`); reads are live. */
@Injectable({ providedIn: 'root' })
export class SchemaService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/schemas`;
  }

  /** Every schema of the space (not paged: `SpaceStore` holds them for the editors and the Schemas page). */
  findAll(spaceId: string, type?: SchemaType): Observable<Schema[]> {
    const params = type ? new HttpParams().set('type', type) : undefined;
    return liveQueryWith(this.events, { spaceId, entities: ['schemas'] }, () => this.http.get<Schema[]>(this.base(spaceId), { params }));
  }

  findOne(spaceId: string, schemaId: string): Observable<Schema> {
    return liveQueryWith(this.events, { spaceId, entities: ['schemas'], id: schemaId }, () =>
      this.http.get<Schema>(`${this.base(spaceId)}/${schemaId}`),
    );
  }

  /** What uses the schema by name (other schemas' fields, contents): while anything does, no rename or delete. */
  findUsage(spaceId: string, schemaId: string): Observable<SchemaUsage> {
    return this.http.get<SchemaUsage>(`${this.base(spaceId)}/${schemaId}/usage`);
  }

  create(spaceId: string, body: SchemaCreate): Observable<Schema> {
    return this.http.post<Schema>(this.base(spaceId), {
      name: body.name,
      type: body.type,
      displayName: body.displayName,
    } satisfies SchemaCreate);
  }

  /**
   * Replaces a component's or an enum's settings; what is left out is cleared. Sent without empty values (the server
   * takes a string or nothing, not `null`), as a copy: `body` stays as it was.
   */
  update(spaceId: string, schemaId: string, body: SchemaUpdate): Observable<Schema> {
    const sent = structuredClone(body);
    ObjectUtils.clean(sent);
    return this.http.put<Schema>(`${this.base(spaceId)}/${schemaId}`, sent satisfies SchemaUpdate);
  }

  /** Changes the name; the id, fields and timestamps are kept. Refused (409) while the schema is in use. */
  rename(spaceId: string, schemaId: string, name: string): Observable<Schema> {
    return this.http.put<Schema>(`${this.base(spaceId)}/${schemaId}/name`, { name } satisfies SchemaRename);
  }

  remove(spaceId: string, schemaId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${schemaId}`);
  }
}
