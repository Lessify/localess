import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Page, WebHook, WebHookCreate, WebHookLog, WebHookStatusUpdate, WebHookUpdate } from '@localess/shared';
import { Observable } from 'rxjs';

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

  /** The new webhook; with `signed`, its `secret`, answered this once. */
  create(spaceId: string, entity: WebHookCreate): Observable<WebHook> {
    const body: WebHookCreate = this.body(entity);
    if (entity.signed) body.signed = true;
    return this.http.post<WebHook>(this.base(spaceId), body);
  }

  /** Headers are only replaced when sent; the secret has its own calls. */
  update(spaceId: string, id: string, entity: WebHookUpdate): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}`, this.body(entity));
  }

  /** A new signing secret (the one before stops): the webhook with its `secret`, answered this once. */
  createSecret(spaceId: string, id: string): Observable<WebHook> {
    return this.http.post<WebHook>(`${this.base(spaceId)}/${id}/secret`, null);
  }

  /** Deliveries are no longer signed. */
  removeSecret(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}/secret`);
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

  /** Empty headers are left out (kept on update). */
  private body(entity: WebHookUpdate): WebHookUpdate {
    const body: WebHookUpdate = { name: entity.name, url: entity.url, events: entity.events };
    if (entity.headers) body.headers = entity.headers;
    return body;
  }
}
