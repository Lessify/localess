import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { traceUntilFirst } from '@angular/fire/performance';
import { UnsplashRandomResult, UnsplashSearchParams, UnsplashSearchResult } from '@shared/models/unsplash-plugin.model';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UnsplashPluginService {
  private readonly functions = inject(Functions);

  enabled(): boolean {
    return environment.plugins.unsplash;
  }

  search(params: UnsplashSearchParams): Observable<UnsplashSearchResult> {
    const unsplashSearch = httpsCallableData<UnsplashSearchParams, UnsplashSearchResult>(this.functions, 'unsplash-search');
    return unsplashSearch(params).pipe(traceUntilFirst('Functions:Plugins:Unsplash:search'));
  }

  random(): Observable<UnsplashRandomResult> {
    const unsplashRandom = httpsCallableData<never, UnsplashRandomResult>(this.functions, 'unsplash-random');
    return unsplashRandom().pipe(traceUntilFirst('Functions:Plugins:Unsplash:random'));
  }
}
