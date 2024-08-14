import { Injectable } from '@angular/core';
import { doc, docData, Firestore, serverTimestamp, setDoc, UpdateData } from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { map } from 'rxjs/operators';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { Functions } from '@angular/fire/functions';
import { AppSettings, AppSettingsUiUpdate } from '@shared/models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(
    private firestore: Firestore,
    private readonly functions: Functions,
  ) {}

  find(): Observable<AppSettings> {
    return docData(doc(this.firestore, `configs/settings`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Settings:find'),
      map(it => it as AppSettings),
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
