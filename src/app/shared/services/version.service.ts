import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { traceUntilFirst } from '@angular/fire/performance';
import { Version } from '@shared/models/version.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly httpClient = inject(HttpClient);

  checkRemoteVersion(): Observable<Version> {
    return this.httpClient.get<Version>('/assets/version.json', { cache: 'no-store' }).pipe(traceUntilFirst('getCurrentVersion'));
  }
}
