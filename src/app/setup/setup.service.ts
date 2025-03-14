import { Injectable } from '@angular/core';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { traceUntilFirst } from '@angular/fire/performance';
import { Observable } from 'rxjs';
import { Setup } from './setup.model';

@Injectable()
export class SetupService {
  constructor(private readonly functions: Functions) {}

  init(setup: Setup): Observable<string> {
    const setupFunction = httpsCallableData<Setup, string>(this.functions, 'setup');
    return setupFunction(setup).pipe(traceUntilFirst('Firestore:setup'));
  }
}
