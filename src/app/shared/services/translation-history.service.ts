import { Injectable } from '@angular/core';
import { collection, collectionData, Firestore, orderBy, query, QueryConstraint } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { map } from 'rxjs/operators';
import { TranslationHistory } from '@shared/models/translation-history.model';
import { limit } from '@firebase/firestore';

@Injectable()
export class TranslationHistoryService {
  constructor(private readonly firestore: Firestore) {}

  findAll(spaceId: string): Observable<TranslationHistory[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(20)];
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/translations_history`), ...queryConstrains), {
      idField: 'id',
    }).pipe(
      traceUntilFirst('Firestore:Translations:findAll'),
      map(it => it as TranslationHistory[])
    );
  }
}
