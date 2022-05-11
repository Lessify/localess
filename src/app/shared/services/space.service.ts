import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  DocumentData,
  DocumentReference,
  Firestore,
  serverTimestamp,
  setDoc
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map, tap} from 'rxjs/operators';
import {SpaceDialogModel} from '../../features/spaces/space-dialog/space-dialog.model';
import {Space, SpaceCreate, SpaceUpdate} from '../models/space.model';
import {Locale} from '../models/locale.model';

@Injectable()
export class SpaceService {
  constructor(private firestore: Firestore) {
  }

  findAll(): Observable<Space[]> {
    return collectionData(collection(this.firestore, 'spaces'), {idField: 'id'})
    .pipe(
      traceUntilFirst('firestore'),
      map((it) => it as Space[])
    );
  }

  findById(id: string): Observable<Space> {
    return docData(doc(this.firestore, `spaces/${id}`), {idField: 'id'})
    .pipe(
      traceUntilFirst('firestore'),
      map((it) => it as Space)
    );
  }

  add(entity: SpaceDialogModel): Observable<DocumentReference<DocumentData>> {
    const defaultLocale: Locale = {id: 'en', name: 'English'}
    return from(
      addDoc(collection(this.firestore, 'spaces'),
        <SpaceCreate>{
          ...entity,
          locales: [defaultLocale],
          localeFallback: defaultLocale,
          createdOn: serverTimestamp(),
          updatedOn: serverTimestamp()
        }
      )
    )
    .pipe(
      traceUntilFirst('firestore'),
      tap(it => console.log(it))
    );
  }

  update(id: string, entity: SpaceDialogModel): Observable<void> {
    return from(
      setDoc(doc(this.firestore, `spaces/${id}`),
        <SpaceUpdate>{...entity, updatedOn: serverTimestamp()},
        {merge: true}
      )
    )
    .pipe(
      traceUntilFirst('firestore'),
      tap(it => console.log(it))
    );
  }

  delete(id: string): Observable<void> {
    return from(
      deleteDoc(doc(this.firestore, `spaces/${id}`))
    )
    .pipe(
      traceUntilFirst('firestore'),
    );
  }
}
