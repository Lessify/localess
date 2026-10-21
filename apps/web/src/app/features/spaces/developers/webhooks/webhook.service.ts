import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Page, WebHook, WebHookCreate, WebHookLog, WebHookStatusUpdate, WebHookUpdate } from '@localess/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Webhooks of a space (`/api/app/spaces/:spaceId/webhooks`); reads are live. */
@Injectable({ providedIn: 'root' })
export class WebHookService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/webhooks`;
  }

  /** One page (`params`: a `PagedList`'s), by name unless sorted otherwise. */
  findAll(spaceId: string, params: HttpParams): Observable<Page<WebHook>> {
    return liveQueryWith(this.events, { spaceId, entities: ['webhooks'] }, () =>
      this.http.get<Page<WebHook>>(this.base(spaceId), { params }),
    );
  }

  findById(spaceId: string, id: string): Observable<WebHook> {
    return liveQueryWith(this.events, { spaceId, entities: ['webhooks'], id }, () => this.http.get<WebHook>(`${this.base(spaceId)}/${id}`));
  }

  /** Resolves to the new webhook's id. */
  create(spaceId: string, entity: WebHookCreate): Observable<string> {
    return this.http.post<WebHook>(this.base(spaceId), this.body(entity)).pipe(map(it => it.id));
  }

  /** Headers and secret are only replaced when sent; `secret: null` removes it. */
  update(spaceId: string, id: string, entity: WebHookUpdate): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}`, this.body(entity));
  }

  updateStatus(spaceId: string, id: string, enabled: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}/status`, { enabled } satisfies WebHookStatusUpdate);
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }

  /** One page of a webhook's delivery logs (`params`: a `PagedList`'s), newest first; a new delivery reloads it. */
  findLogs(spaceId: string, webhookId: string, params: HttpParams): Observable<Page<WebHookLog>> {
    return liveQueryWith(this.events, { spaceId, entities: ['webhook_logs'], id: webhookId }, () =>
      this.http.get<Page<WebHookLog>>(`${this.base(spaceId)}/${webhookId}/logs`, { params }),
    );
  }

  /** Empty headers and secret are left out (kept on update); a `null` secret (update only) removes it. */
  private body(entity: WebHookCreate | WebHookUpdate): WebHookUpdate {
    const body: WebHookUpdate = { name: entity.name, url: entity.url, events: entity.events };
    if (entity.headers) body.headers = entity.headers;
    if (entity.secret) body.secret = entity.secret;
    else if (entity.secret === null) body.secret = null;
    return body;
  }
}
