import { Injectable, inject } from '@angular/core';
import { collection, collectionData, Firestore, limit, orderBy, query, QueryConstraint } from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';
import { ContentHistory } from '@shared/models/content-history.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ContentHistoryService {
  private readonly firestore = inject(Firestore);

  findAll(spaceId: string, id: string): Observable<ContentHistory[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(30)];
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/contents/${id}/histories`), ...queryConstrains), {
      idField: 'id',
    }).pipe(
      traceUntilFirst('Firestore:ContentHistory:findAll'),
      map(it => it as ContentHistory[]),
    );
  }
}
