import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { FirebaseImport, FirebaseImportConnection, FirebaseImportStart, FirebaseSourceSpace } from '@localess/shared';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';

const POLL_MS = 2000;

/** Admin → Spaces → Import from Firebase (`/api/app/admin/firebase-import`). The token is sent, never kept. */
@Injectable({ providedIn: 'root' })
export class FirebaseImportService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/app/admin/firebase-import';

  sourceSpaces(origin: string, token: string): Observable<FirebaseSourceSpace[]> {
    return this.http.post<FirebaseSourceSpace[]>(`${this.base}/spaces`, { origin, token } satisfies FirebaseImportConnection);
  }

  start(origin: string, token: string, spaceId: string): Observable<FirebaseImport> {
    return this.http.post<FirebaseImport>(this.base, { origin, token, spaceId } satisfies FirebaseImportStart);
  }

  findAll(): Observable<FirebaseImport[]> {
    return this.http.get<FirebaseImport[]>(this.base);
  }

  /** Stops a running import: it fails at the stage it reached (409 when it already ended). */
  cancel(id: string): Observable<FirebaseImport> {
    return this.http.post<FirebaseImport>(`${this.base}/${id}/cancel`, {});
  }

  /** The run every 2 s while RUNNING; completes after the first FINISHED or FAILED value. */
  poll(id: string): Observable<FirebaseImport> {
    return timer(0, POLL_MS).pipe(
      switchMap(() => this.http.get<FirebaseImport>(`${this.base}/${id}`)),
      takeWhile(run => run.status === 'RUNNING', true),
    );
  }
}
