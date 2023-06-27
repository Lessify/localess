import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  DocumentReference,
  Firestore, orderBy, query, QueryConstraint,
  serverTimestamp,
  setDoc
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {Space, SpaceCreate, SpaceCreateFS, SpaceUpdate, SpaceUpdateFS} from '../models/space.model';
import {Locale} from '../models/locale.model';

@Injectable()
export class SpaceService {
  constructor(private firestore: Firestore) {
  }

  findAll(): Observable<Space[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('name', 'asc')]
    return collectionData(
      query(
        collection(this.firestore, `spaces`),
        ...queryConstrains),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Spaces:findAll'),
        map((it) => it as Space[])
      );
  }

  findById(id: string): Observable<Space> {
    return docData(doc(this.firestore, `spaces/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Spaces:findById'),
        map((it) => it as Space)
      );
  }

  create(entity: SpaceCreate): Observable<DocumentReference> {
    const defaultLocale: Locale = {id: 'en', name: 'English'}
    let add: SpaceCreateFS = {
      name: entity.name,
      locales: [defaultLocale],
      localeFallback: defaultLocale,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    return from(addDoc(collection(this.firestore, 'spaces'), add))
      .pipe(
        traceUntilFirst('Firestore:Spaces:create'),
      );
  }

  update(id: string, entity: SpaceUpdate): Observable<void> {
    const update: SpaceUpdateFS = {
      name: entity.name,
      updatedAt: serverTimestamp()
    }
    return from(setDoc(doc(this.firestore, `spaces/${id}`), update, {merge: true}))
      .pipe(
        traceUntilFirst('Firestore:Spaces:update'),
      );
  }

  delete(id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${id}`)))
      .pipe(
        traceUntilFirst('Firestore:Spaces:delete'),
      );
  }
}
