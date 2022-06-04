import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData, DocumentReference,
  Firestore,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {
  Translation,
  TranslationCreate,
  TranslationCreateFS,
  TranslationType,
  TranslationUpdate,
  TranslationUpdateFS
} from '../models/translation.model';
import {traceUntilFirst} from '@angular/fire/performance';
import {map, tap} from 'rxjs/operators';
import {UpdateData, WriteBatch, documentId} from '@firebase/firestore';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {importLocaleJson} from '../../../../functions/src';



@Injectable()
export class TranslationService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {
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

  add(spaceId: string, entity: TranslationCreate): Observable<DocumentReference> {
    let addEntity: TranslationCreateFS = {
      name: entity.name,
      type: entity.type,
      labels: entity.labels,
      description: entity.description,
      locales: {},
      createdOn: serverTimestamp(),
      updatedOn: serverTimestamp()
    }

    switch (entity.type) {
      case TranslationType.STRING: {
        addEntity.locales[entity.locale] = entity.value
        break;
      }
      case TranslationType.ARRAY: {
        addEntity.locales[entity.locale] = `["${entity.value}"]`
        break;
      }
      case TranslationType.PLURAL: {
        addEntity.locales[entity.locale] = `{"0":"${entity.value}"}`
        break;
      }
    }

    return from(
      addDoc(collection(this.firestore, `spaces/${spaceId}/translations`),
        addEntity
      )
    )
    .pipe(
      traceUntilFirst('firestore'),
      tap(it => console.log(it))
    );
  }

  update(spaceId: string, id: string, entity: TranslationUpdate): Observable<void> {
    const update: UpdateData<TranslationUpdateFS> = {
      labels: entity.labels,
      description: entity.description,
      updatedOn: serverTimestamp()
    }

    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`),
        update
      )
    )
    .pipe(
      traceUntilFirst('firestore'),
      tap(it => console.log(it))
    );
  }

  updateLocale(spaceId: string, id: string, locale: string, value: string): Observable<void> {
    let update: any = {
      updatedOn: serverTimestamp()
    }
    update[`locales.${locale}`] = value
    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`),
        update
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

  publish(spaceId: string): Observable<void> {
    const publishTranslations = httpsCallableData<{ spaceId: string }, void>(this.functions, 'publishTranslations');
    return publishTranslations({spaceId})
  }

  importDiffBatch(spaceId: string, locale: string, translations: { [key: string]: string }): Observable<void> {
    const importLocaleJson = httpsCallableData<{ spaceId: string, locale: string, translations: { [key: string]: string } }, void>(this.functions, 'importLocaleJson');
    return importLocaleJson({spaceId, locale, translations})
  }

}
