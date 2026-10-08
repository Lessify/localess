import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { AppSettings, AppSettingsUiUpdate } from '@shared/models/settings.model';
import { Observable } from 'rxjs';

const BASE = '/api/app/settings';

/** Global app settings (`/api/app/settings`); reads are live. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  find(): Observable<AppSettings> {
    return liveQueryWith(this.events, { entities: ['settings'] }, () => this.http.get<AppSettings>(BASE));
  }

  updateUi(entity: AppSettingsUiUpdate): Observable<void> {
    return this.http.patch<void>(`${BASE}/ui`, ObjectUtils.clone(entity));
  }
}
