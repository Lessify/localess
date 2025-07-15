import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  DocumentReference,
  Firestore,
  limit,
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp,
} from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';
import { Token, TokenCreateFS } from '@shared/models/token.model';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private firestore = inject(Firestore);

  findAll(spaceId: string): Observable<Token[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('createdAt', 'desc')];

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/tokens`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Tokens:findAll'),
      map(it => it as Token[]),
    );
  }

  findFirst(spaceId: string): Observable<Token[]> {
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/tokens`), limit(1)), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Tokens:findFirst'),
      map(it => it as Token[]),
    );
  }

  findById(spaceId: string, id: string): Observable<Token> {
    return docData(doc(this.firestore, `spaces/${spaceId}/tokens/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Tokens:findById'),
      map(it => it as Token),
    );
  }

  create(spaceId: string, name: string): Observable<DocumentReference> {
    const addEntity: TokenCreateFS = {
      name: name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/tokens`), addEntity)).pipe(traceUntilFirst('Firestore:Tokens:create'));
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/tokens/${id}`))).pipe(traceUntilFirst('Firestore:Tokens:delete'));
  }
}
