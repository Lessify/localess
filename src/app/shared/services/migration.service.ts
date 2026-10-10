import { inject, Injectable } from '@angular/core';
import { doc, docData, Firestore } from '@angular/fire/firestore';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** The environment's migration token, used by a self-hosted install to import spaces. */
@Injectable({ providedIn: 'root' })
export class MigrationService {
  private readonly firestore = inject(Firestore);
  private readonly functions = inject(Functions);

  status(): Observable<{ createdAt?: string }> {
    return docData(doc(this.firestore, 'configs/migration')).pipe(
      map(it => ({ createdAt: (it?.['createdAt'] as { toDate?: () => Date } | undefined)?.toDate?.().toISOString() })),
    );
  }

  generate(): Observable<{ token: string; createdAt: string }> {
    return httpsCallableData<void, { token: string; createdAt: string }>(this.functions, 'migrationtoken-generate')();
  }

  revoke(): Observable<void> {
    return httpsCallableData<void, void>(this.functions, 'migrationtoken-revoke')();
  }
}
