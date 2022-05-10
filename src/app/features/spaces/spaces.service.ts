import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  setDoc
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map, tap} from 'rxjs/operators';
import {DocumentData, DocumentReference, serverTimestamp} from 'firebase/firestore';
import {Space} from './spaces.model';
import {SpaceDialogModel} from './space-dialog/space-dialog.model';

@Injectable()
export class SpacesService {
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

  create(entity: SpaceDialogModel): Observable<DocumentReference<DocumentData>> {
    return from(
      addDoc(collection(this.firestore, 'spaces'),
        <Space>{
          ...entity,
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
        {...entity, updatedOn: serverTimestamp()},
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
