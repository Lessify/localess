import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { traceUntilFirst } from '@angular/fire/performance';
import { Observable } from 'rxjs';
import { Setup } from './setup.model';

@Injectable()
export class SetupService {
  private readonly functions = inject(Functions);

  init(setup: Setup): Observable<void> {
    const setupFunction = httpsCallableData<Setup, void>(this.functions, 'setup');
    return setupFunction(setup).pipe(traceUntilFirst('Firestore:setup'));
  }
}
