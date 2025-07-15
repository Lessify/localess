import { Injectable, inject } from '@angular/core';
import { collection, collectionData, Firestore, limit, orderBy, query, QueryConstraint } from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';
import { TranslationHistory } from '@shared/models/translation-history.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslationHistoryService {
  private readonly firestore = inject(Firestore);

  findAll(spaceId: string): Observable<TranslationHistory[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(30)];
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/translations_history`), ...queryConstrains), {
      idField: 'id',
    }).pipe(
      traceUntilFirst('Firestore:TranslationsHistory:findAll'),
      map(it => it as TranslationHistory[]),
    );
  }
}
