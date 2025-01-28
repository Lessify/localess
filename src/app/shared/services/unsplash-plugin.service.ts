import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { RemoteConfig, getBooleanChanges } from '@angular/fire/remote-config';
import { Observable } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { UnsplashRandomResult, UnsplashSearchParams, UnsplashSearchResult } from '@shared/models/unsplash-plugin.model';

@Injectable()
export class UnsplashPluginService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
    private readonly remoteConfig: RemoteConfig,
  ) {}

  ok(): Observable<boolean> {
    return getBooleanChanges(this.remoteConfig, 'unsplash_ui_enable').pipe(traceUntilFirst('Functions:Plugins:Unsplash:ok'));
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
