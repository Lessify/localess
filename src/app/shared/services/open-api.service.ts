import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OpenApiService {
  private readonly http = inject(HttpClient);

  /** The space's OpenAPI document, serialized as JSON. */
  generate(spaceId: string): Observable<string> {
    return this.http.post<unknown>(`/api/app/spaces/${spaceId}/open-api`, {}).pipe(map(it => JSON.stringify(it)));
  }
}
