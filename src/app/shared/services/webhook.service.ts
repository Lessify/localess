import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { WebHook, WebHookCreate, WebHookLog, WebHookUpdate } from '@shared/models/webhook.model';
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

  /** Ordered by name (server side). */
  findAll(spaceId: string): Observable<WebHook[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['webhooks'] }, () => this.http.get<WebHook[]>(this.base(spaceId)));
  }

  findById(spaceId: string, id: string): Observable<WebHook> {
    return liveQueryWith(this.events, { spaceId, entities: ['webhooks'], id }, () => this.http.get<WebHook>(`${this.base(spaceId)}/${id}`));
  }

  /** Resolves to the new webhook's id. */
  create(spaceId: string, entity: WebHookCreate): Observable<string> {
    return this.http.post<WebHook>(this.base(spaceId), this.body(entity)).pipe(map(it => it.id));
  }

  /** Headers and secret are only replaced when sent. */
  update(spaceId: string, id: string, entity: WebHookUpdate): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}`, this.body(entity));
  }

  updateStatus(spaceId: string, id: string, enabled: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}/status`, { enabled });
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }

  /** Newest first. */
  findLogs(spaceId: string, webhookId: string, max?: number): Observable<WebHookLog[]> {
    const params = max ? new HttpParams().set('limit', max) : undefined;
    return liveQueryWith(this.events, { spaceId, entities: ['webhook_logs'], id: webhookId }, () =>
      this.http.get<WebHookLog[]>(`${this.base(spaceId)}/${webhookId}/logs`, { params }),
    );
  }

  private body(entity: WebHookCreate | WebHookUpdate): WebHookCreate {
    const body: WebHookCreate = { name: entity.name, url: entity.url, events: entity.events };
    if (entity.headers) body.headers = entity.headers;
    if (entity.secret) body.secret = entity.secret;
    return body;
  }
}
