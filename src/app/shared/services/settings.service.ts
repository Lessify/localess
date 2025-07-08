import { Injectable, inject } from '@angular/core';
import { doc, docData, Firestore, serverTimestamp, setDoc, UpdateData } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { traceUntilFirst } from '@angular/fire/performance';
import { getAllChanges, RemoteConfig } from '@angular/fire/remote-config';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { AppSettings, AppSettingsUiUpdate } from '@shared/models/settings.model';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly firestore = inject(Firestore);
  private readonly functions = inject(Functions);
  private readonly remoteConfig = inject(RemoteConfig);

  find(): Observable<AppSettings> {
    return docData(doc(this.firestore, `configs/settings`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Settings:find'),
      map(it => it as AppSettings),
    );
  }

  config(): Observable<any> {
    return getAllChanges(this.remoteConfig).pipe(
      traceUntilFirst('remote-config'),
      tap(it => console.log('REMOTE CONFIG', it)),
    );
  }

  updateUi(entity: AppSettingsUiUpdate): Observable<void> {
    const update: UpdateData<AppSettings> = {
      ui: ObjectUtils.clone(entity),
      updatedAt: serverTimestamp(),
    };
    return from(setDoc(doc(this.firestore, `configs/settings`), update, { merge: true })).pipe(
      traceUntilFirst('Firestore:Settings:update'),
    );
  }
}
