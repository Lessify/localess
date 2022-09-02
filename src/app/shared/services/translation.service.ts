import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  DocumentReference,
  Firestore,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {
  Translation,
  TranslationCreate,
  TranslationCreateFS,
  TranslationExportImport,
  TranslationLocale,
  TranslationsExportData,
  TranslationsImportData,
  TranslationType,
  TranslationUpdate,
  TranslationUpdateFS
} from '../models/translation.model';
import {traceUntilFirst} from '@angular/fire/performance';
import {map, tap} from 'rxjs/operators';
import {UpdateData} from '@firebase/firestore';
import {Functions, httpsCallableData} from '@angular/fire/functions';


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
      locales: {},
      createdOn: serverTimestamp(),
      updatedOn: serverTimestamp()
    }

    if (entity.labels && entity.labels.length > 0) {
      addEntity.labels = entity.labels
    }
    if (entity.description && entity.description.length > 0) {
      addEntity.description = entity.description
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
      updatedOn: serverTimestamp()
    }

    if (entity.labels && entity.labels.length > 0) {
      update.labels = entity.labels
    }
    if (entity.description && entity.description.length > 0) {
      update.description = entity.description
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

  export(data: TranslationsExportData): Observable<TranslationLocale | TranslationExportImport[]> {
    const translationsExport = httpsCallableData<TranslationsExportData, TranslationLocale | TranslationExportImport[]>(this.functions, 'translationsExport');
    return translationsExport(data)
  }

  import(data: TranslationsImportData): Observable<void> {
    const translationsImport = httpsCallableData<TranslationsImportData, void>(this.functions, 'translationsImport');
    return translationsImport(data)
  }

}
