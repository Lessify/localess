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
  TranslationExportImport,
  TranslationLocale,
  TranslationsExportData,
  TranslationsImportData,
  TranslationUpdate,
  TranslationUpdateFS
} from '../models/translation.model';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {translationsPublish} from '../../../../functions/src';
import {
  Schematic,
  SchematicCreate,
  SchematicCreateFS,
  SchematicUpdate,
  SchematicUpdateFS
} from '@shared/models/schematic.model';

@Injectable()
export class SchematicService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {
  }

  findAll(spaceId: string): Observable<Schematic[]> {
    return collectionData(collection(this.firestore, `spaces/${spaceId}/schematics`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Schematics:findAll'),
        map((it) => it as Schematic[])
      );
  }

  findById(spaceId: string, id: string): Observable<Schematic> {
    return docData(doc(this.firestore, `spaces/${spaceId}/schematics/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Schematics:findById'),
        map((it) => it as Schematic)
      );
  }

  create(spaceId: string, entity: SchematicCreate): Observable<DocumentReference> {
    let addEntity: SchematicCreateFS = {
      name: entity.name,
      type: entity.type,
      createdOn: serverTimestamp(),
      updatedOn: serverTimestamp()
    }

    return from(
      addDoc(collection(this.firestore, `spaces/${spaceId}/schematics`),
        addEntity
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Schematics:create'),
      );
  }

  update(spaceId: string, id: string, entity: SchematicUpdate): Observable<void> {
    const update: UpdateData<SchematicUpdateFS> = {
      name: entity.name,
      updatedOn: serverTimestamp()
    }

    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/schematics/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Schematics:update'),
      );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(
      deleteDoc(doc(this.firestore, `spaces/${spaceId}/schematics/${id}`))
    )
      .pipe(
        traceUntilFirst('Firestore:Schematics:delete'),
      );
  }

}
