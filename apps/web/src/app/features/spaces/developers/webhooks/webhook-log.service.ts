import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Page, WebhookLog } from '@localess/shared';
import { Observable } from 'rxjs';

/**
 * The delivery logs of a webhook (`/api/app/spaces/:spaceId/webhooks/:webhookId/logs`, the server's
 * `WebhookLogController`); reads are live.
 */
@Injectable({ providedIn: 'root' })
export class WebhookLogService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  /** One page (`params`: a `PagedList`'s), newest first; a new delivery reloads it. */
  findAll(spaceId: string, webhookId: string, params: HttpParams): Observable<Page<WebhookLog>> {
    return liveQueryWith(this.events, { spaceId, entities: ['webhook_logs'], id: webhookId }, () =>
      this.http.get<Page<WebhookLog>>(`/api/app/spaces/${spaceId}/webhooks/${webhookId}/logs`, { params }),
    );
  }
}
