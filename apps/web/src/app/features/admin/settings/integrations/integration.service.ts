import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import type {
  Integration,
  IntegrationEnabledUpdate,
  IntegrationId,
  IntegrationList,
  IntegrationSave,
  IntegrationTest,
  IntegrationTestResult,
  TranslatePrimary,
  TranslatePrimaryUpdate,
} from '@localess/shared';
import { Observable } from 'rxjs';

const BASE = '/api/app/admin/integrations';

/** Admin → Settings → Integrations (`/api/app/admin/integrations`); the list is live. Answers never carry a saved key. */
@Injectable({ providedIn: 'root' })
export class IntegrationService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  findAll(): Observable<IntegrationList> {
    return liveQueryWith(this.events, { entities: ['integrations'] }, () => this.http.get<IntegrationList>(BASE));
  }

  /** Tests, then saves; a failed test answers 422 with its `IntegrationTestResult`. */
  save(id: IntegrationId, body: IntegrationSave): Observable<Integration> {
    return this.http.put<Integration>(`${BASE}/${id}`, body);
  }

  /** `values` without saving them; without, the active configuration. */
  test(id: IntegrationId, values?: Record<string, string>): Observable<IntegrationTestResult> {
    return this.http.post<IntegrationTestResult>(`${BASE}/${id}/test`, (values ? { values } : {}) satisfies IntegrationTest);
  }

  setEnabled(id: IntegrationId, enabled: boolean): Observable<Integration> {
    return this.http.patch<Integration>(`${BASE}/${id}/enabled`, { enabled } satisfies IntegrationEnabledUpdate);
  }

  /** Disconnect: the saved key is deleted. */
  remove(id: IntegrationId): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  setTranslatePrimary(value: TranslatePrimary): Observable<IntegrationList['translatePrimary']> {
    return this.http.put<IntegrationList['translatePrimary']>(`${BASE}/translate-primary`, { value } satisfies TranslatePrimaryUpdate);
  }
}
