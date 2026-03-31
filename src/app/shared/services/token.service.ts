import { inject, Injectable } from '@angular/core';
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
  updateDoc,
  where,
  WithFieldValue,
} from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';
import { UpdateData } from '@firebase/firestore';
import { Token, TokenForm, TokenFS, TokenPermission } from '@shared/models/token.model';
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

  findFirstByPermission(spaceId: string, permission: TokenPermission): Observable<Token[]> {
    const queryConstrains: QueryConstraint[] = [where('permissions', 'array-contains', permission), limit(1)];
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/tokens`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Tokens:findFirstByPermission'),
      map(it => it as Token[]),
    );
  }

  findById(spaceId: string, id: string): Observable<Token> {
    return docData(doc(this.firestore, `spaces/${spaceId}/tokens/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Tokens:findById'),
      map(it => it as Token),
    );
  }

  create(spaceId: string, model: TokenForm): Observable<DocumentReference> {
    const addEntity: WithFieldValue<TokenFS> = {
      version: 2,
      name: model.name,
      permissions: model.permissions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/tokens`), addEntity)).pipe(traceUntilFirst('Firestore:Tokens:create'));
  }

  update(spaceId: string, id: string, model: TokenForm): Observable<void> {
    const update: UpdateData<TokenFS> = {
      version: 2,
      name: model.name,
      permissions: model.permissions,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/tokens/${id}`), update)).pipe(traceUntilFirst('Firestore:Tokens:update'));
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/tokens/${id}`))).pipe(traceUntilFirst('Firestore:Tokens:delete'));
  }
}
