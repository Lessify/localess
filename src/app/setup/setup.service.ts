import {Injectable} from '@angular/core';
import {Firestore} from '@angular/fire/firestore';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {Observable} from 'rxjs';
import {Setup} from './setup.model'

@Injectable()
export class SetupService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {
  }

  init(setup: Setup): Observable<any> {
    const setupFunction = httpsCallableData<Setup, any>(this.functions, 'setup');
    return setupFunction(setup)
  }
}
