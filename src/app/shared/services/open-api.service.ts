import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { Functions, httpsCallableData } from '@angular/fire/functions';

@Injectable()
export class OpenApiService {
  constructor(private readonly functions: Functions) {}

  generate(spaceId: string): Observable<string> {
    const openApiGenerate = httpsCallableData<{ spaceId: string }, string>(this.functions, 'openapi-generate');
    return openApiGenerate({ spaceId }).pipe(traceUntilFirst('Functions:OpenApi:generate'));
  }
}
