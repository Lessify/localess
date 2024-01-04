import { Injectable } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { map } from 'rxjs/operators';
import { TranslationHistory } from '@shared/models/translation-history.model';

@Injectable()
export class TranslationHistoryService {
  constructor(private readonly firestore: Firestore) {}

  findAll(spaceId: string): Observable<TranslationHistory[]> {
    return collectionData(collection(this.firestore, `spaces/${spaceId}/translations_history`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Translations:findAll'),
      map(it => it as TranslationHistory[])
    );
  }
}
