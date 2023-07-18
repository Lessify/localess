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
  UpdateData,
  updateDoc
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
import {map} from 'rxjs/operators';
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
        traceUntilFirst('Firestore:Translations:findAll'),
        map((it) => it as Translation[])
      );
  }

  findById(spaceId: string, id: string): Observable<Translation> {
    return docData(doc(this.firestore, `spaces/${spaceId}/translations/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Translations:findById'),
        map((it) => it as Translation)
      );
  }

  create(spaceId: string, entity: TranslationCreate): Observable<DocumentReference> {
    let addEntity: TranslationCreateFS = {
      name: entity.name,
      type: entity.type,
      locales: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    if (entity.autoTranslate) {
      addEntity.autoTranslate = entity.autoTranslate
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

    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/translations`), addEntity))
      .pipe(
        traceUntilFirst('Firestore:Translations:create'),
      );
  }

  update(spaceId: string, id: string, entity: TranslationUpdate): Observable<void> {
    const update: UpdateData<Translation> = {
      updatedAt: serverTimestamp()
    }

    if (entity.labels && entity.labels.length > 0) {
      update.labels = entity.labels
    }
    if (entity.description && entity.description.length > 0) {
      update.description = entity.description
    }

    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`), update))
      .pipe(
        traceUntilFirst('Firestore:Translations:update'),
      );
  }

  updateLocale(spaceId: string, id: string, locale: string, value: string): Observable<void> {
    let update: any = {
      updatedAt: serverTimestamp()
    }
    update[`locales.${locale}`] = value
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`), update))
      .pipe(
        traceUntilFirst('Firestore:Translations:updateLocale'),
      );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`)))
      .pipe(
        traceUntilFirst('Firestore:Translations:delete'),
      );
  }

  publish(spaceId: string): Observable<void> {
    const translationsPublish = httpsCallableData<{ spaceId: string }, void>(this.functions, 'translation-publish');
    return translationsPublish({spaceId})
      .pipe(
        traceUntilFirst('Functions:Translations:publish'),
      );
  }

}
