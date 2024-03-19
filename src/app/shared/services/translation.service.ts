import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionCount,
  collectionData,
  deleteDoc,
  doc,
  docData,
  DocumentReference,
  Firestore,
  serverTimestamp,
  UpdateData,
  updateDoc,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { Translation, TranslationCreate, TranslationCreateFS, TranslationType, TranslationUpdate } from '../models/translation.model';
import { traceUntilFirst } from '@angular/fire/performance';
import { map } from 'rxjs/operators';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { deleteField } from '@firebase/firestore';
import { Auth } from '@angular/fire/auth';

@Injectable()
export class TranslationService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
    private readonly auth: Auth
  ) {}

  findAll(spaceId: string): Observable<Translation[]> {
    return collectionData(collection(this.firestore, `spaces/${spaceId}/translations`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Translations:findAll'),
      map(it => it as Translation[])
    );
  }

  countAll(spaceId: string): Observable<number> {
    return collectionCount(collection(this.firestore, `spaces/${spaceId}/translations`)).pipe(
      traceUntilFirst('Firestore:Translations:countAll')
    );
  }

  findById(spaceId: string, id: string): Observable<Translation> {
    return docData(doc(this.firestore, `spaces/${spaceId}/translations/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Translations:findById'),
      map(it => it as Translation)
    );
  }

  create(spaceId: string, entity: TranslationCreate): Observable<DocumentReference> {
    const addEntity: TranslationCreateFS = {
      name: entity.name,
      type: entity.type,
      locales: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (entity.autoTranslate) {
      addEntity.autoTranslate = entity.autoTranslate;
    }

    if (entity.labels && entity.labels.length > 0) {
      addEntity.labels = entity.labels;
    }
    if (entity.description && entity.description.length > 0) {
      addEntity.description = entity.description;
    }

    switch (entity.type) {
      case TranslationType.STRING: {
        addEntity.locales[entity.locale] = entity.value;
        break;
      }
      case TranslationType.ARRAY: {
        addEntity.locales[entity.locale] = `["${entity.value}"]`;
        break;
      }
      case TranslationType.PLURAL: {
        addEntity.locales[entity.locale] = `{"0":"${entity.value}"}`;
        break;
      }
    }
    if (this.auth.currentUser?.email && this.auth.currentUser?.displayName) {
      addEntity.updatedBy = {
        name: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
      };
    }

    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/translations`), addEntity)).pipe(
      traceUntilFirst('Firestore:Translations:create')
    );
  }

  update(spaceId: string, id: string, entity: TranslationUpdate): Observable<void> {
    const update: UpdateData<Translation> = {
      updatedAt: serverTimestamp(),
    };

    if (entity.labels && entity.labels.length > 0) {
      update.labels = entity.labels;
    } else {
      update.labels = deleteField();
    }
    if (entity.description && entity.description.length > 0) {
      update.description = entity.description;
    } else {
      update.description = deleteField();
    }
    if (this.auth.currentUser?.email && this.auth.currentUser?.displayName) {
      update.updatedBy = {
        name: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
      };
    }
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Translations:update')
    );
  }

  updateLocale(spaceId: string, id: string, locale: string, value: string): Observable<void> {
    const update: UpdateData<Translation> = {
      updatedAt: serverTimestamp(),
    };
    update[`locales.${locale}`] = value;
    if (this.auth.currentUser?.email && this.auth.currentUser?.displayName) {
      update.updatedBy = {
        name: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
      };
    }
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Translations:updateLocale')
    );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`))).pipe(
      traceUntilFirst('Firestore:Translations:delete')
    );
  }

  publish(spaceId: string): Observable<void> {
    const translationsPublish = httpsCallableData<{ spaceId: string }, void>(this.functions, 'translation-publish');
    return translationsPublish({ spaceId }).pipe(traceUntilFirst('Functions:Translations:publish'));
  }
}
