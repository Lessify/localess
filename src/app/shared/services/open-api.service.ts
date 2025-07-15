import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { traceUntilFirst } from '@angular/fire/performance';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OpenApiService {
  private readonly functions = inject(Functions);

  generate(spaceId: string): Observable<string> {
    const openApiGenerate = httpsCallableData<{ spaceId: string }, string>(this.functions, 'openapi-generate');
    return openApiGenerate({ spaceId }).pipe(traceUntilFirst('Functions:OpenApi:generate'));
  }
}
