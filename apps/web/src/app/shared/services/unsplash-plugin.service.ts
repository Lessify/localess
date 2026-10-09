import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AppConfigService } from '@core/api/app-config.service';
import { UnsplashRandomResult, UnsplashSearchParams, UnsplashSearchResult } from '@shared/models/unsplash-plugin.model';
import { Observable } from 'rxjs';

const BASE = '/api/app/plugins/unsplash';

@Injectable({ providedIn: 'root' })
export class UnsplashPluginService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  enabled(): boolean {
    return this.appConfig.config().plugins.unsplash;
  }

  search(params: UnsplashSearchParams): Observable<UnsplashSearchResult> {
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
