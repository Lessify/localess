import {Injectable} from '@angular/core';
import {
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  serverTimestamp,
  setDoc
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {Translation, TranslationCreate, TranslationUpdate} from '../models/translation.model';
import {traceUntilFirst} from '@angular/fire/performance';
import {map, tap} from 'rxjs/operators';

@Injectable()
export class TranslationService {
  constructor(private firestore: Firestore) {
  }

  findAll(spaceId: string): Observable<Translation[]> {
    return collectionData(collection(this.firestore, `spaces/${spaceId}/translations`), {idField: 'id'})
    .pipe(
      traceUntilFirst('firestore'),
      map((it) => it as Translation[])
    );
  }

  findById(spaceId: string, id: string): Observable<Translation> {
    return docData(doc(this.firestore, `spaces/${spaceId}/translations/${id}`), {idField: 'id'})
    .pipe(
      traceUntilFirst('firestore'),
      map((it) => it as Translation)
    );
  }

  add(spaceId: string, id: string, entity: TranslationCreate): Observable<void> {
    return from(
      setDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`),
        {
          ...entity,
          createdOn: serverTimestamp(),
          updatedOn: serverTimestamp()
        },
        {merge: true}
      )
    )
    .pipe(
      traceUntilFirst('firestore'),
      tap(it => console.log(it))
    );
  }

  update(spaceId: string, id: string, entity: TranslationUpdate): Observable<void> {
    return from(
      setDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`),
        {
          labels: entity.labels,
          description: entity.description,
          updatedOn: serverTimestamp()
        },
        {merge: true}
      )
    )
    .pipe(
      traceUntilFirst('firestore'),
      tap(it => console.log(it))
    );
  }

  delete(spaceId: string, id: string): Observable<void> {
    console.log(`TranslationService::delete spaceId:${spaceId} id:${id}`)
    return from(
      deleteDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`))
    )
    .pipe(
      traceUntilFirst('firestore'),
    );
  }

}
