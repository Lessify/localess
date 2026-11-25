import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AppConfigService } from '@core/api/app-config.service';
import { UnsplashRandomResult, UnsplashSearch, UnsplashSearchResult } from '@localess/shared';
import { Observable } from 'rxjs';

const BASE = '/api/app/plugins/unsplash';

/** Unsplash search for the asset picker (`/api/app/plugins/unsplash`, the server's `UnsplashController`). */
@Injectable({ providedIn: 'root' })
export class UnsplashService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  /** The runtime `plugins.unsplash` flag (`GET /api/config`): the server has an Unsplash key. */
  enabled(): boolean {
    return this.appConfig.config().plugins.unsplash;
  }

  search(params: UnsplashSearch): Observable<UnsplashSearchResult> {
    let query = new HttpParams().set('query', params.query);
    if (params.page !== undefined) query = query.set('page', params.page);
    if (params.perPage !== undefined) query = query.set('perPage', params.perPage);
    if (params.orientation) query = query.set('orientation', params.orientation);
    return this.http.get<UnsplashSearchResult>(`${BASE}/search`, { params: query });
  }

  random(): Observable<UnsplashRandomResult> {
    return this.http.get<UnsplashRandomResult>(`${BASE}/random`);
  }
}
