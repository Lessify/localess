import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Page, Webhook, WebhookCreate, WebhookLog, WebhookStatusUpdate, WebhookUpdate } from '@localess/shared';
import { Observable } from 'rxjs';

/** Webhooks of a space (`/api/app/spaces/:spaceId/webhooks`); reads are live. */
@Injectable({ providedIn: 'root' })
export class WebhookService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/webhooks`;
  }

  /** One page (`params`: a `PagedList`'s), by name unless sorted otherwise. */
  findAll(spaceId: string, params: HttpParams): Observable<Page<Webhook>> {
    return liveQueryWith(this.events, { spaceId, entities: ['webhooks'] }, () =>
      this.http.get<Page<Webhook>>(this.base(spaceId), { params }),
    );
  }

  findById(spaceId: string, id: string): Observable<Webhook> {
    return liveQueryWith(this.events, { spaceId, entities: ['webhooks'], id }, () => this.http.get<Webhook>(`${this.base(spaceId)}/${id}`));
  }

  /** The new webhook; with `signed`, its `secret`, answered this once. Headers carry their values. */
  create(spaceId: string, entity: WebhookCreate): Observable<Webhook> {
    const body: WebhookCreate = { name: entity.name, url: entity.url, events: entity.events };
    if (entity.headers && Object.keys(entity.headers).length) body.headers = entity.headers;
    if (entity.signed) body.signed = true;
    return this.http.post<Webhook>(this.base(spaceId), body);
  }

  /**
   * `headers`, when given, is every header kept: a value replaces, `null` keeps the one it has, one left out goes; the
   * secret has its own calls.
   */
  update(spaceId: string, id: string, entity: WebhookUpdate): Observable<void> {
    const body: WebhookUpdate = { name: entity.name, url: entity.url, events: entity.events };
    if (entity.headers) body.headers = entity.headers;
    return this.http.put<void>(`${this.base(spaceId)}/${id}`, body);
  }

  /** A new signing secret (the one before stops): the webhook with its `secret`, answered this once. */
  createSecret(spaceId: string, id: string): Observable<Webhook> {
    return this.http.post<Webhook>(`${this.base(spaceId)}/${id}/secret`, null);
  }

  /** Deliveries are no longer signed. */
  removeSecret(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}/secret`);
  }

  updateStatus(spaceId: string, id: string, enabled: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}/status`, { enabled } satisfies WebhookStatusUpdate);
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }

  /** One page of a webhook's delivery logs (`params`: a `PagedList`'s), newest first; a new delivery reloads it. */
  findLogs(spaceId: string, webhookId: string, params: HttpParams): Observable<Page<WebhookLog>> {
    return liveQueryWith(this.events, { spaceId, entities: ['webhook_logs'], id: webhookId }, () =>
      this.http.get<Page<WebhookLog>>(`${this.base(spaceId)}/${webhookId}/logs`, { params }),
    );
  }
}
