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
import {Schematic, SchematicCreate, SchematicCreateFS} from '@shared/models/schematic.model';


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

  add(spaceId: string, entity: SchematicCreate): Observable<DocumentReference> {
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
        traceUntilFirst('Firestore:Schematics:add'),
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
        traceUntilFirst('Firestore:Translations:update'),
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
        traceUntilFirst('Firestore:Translations:updateLocale'),
      );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(
      deleteDoc(doc(this.firestore, `spaces/${spaceId}/translations/${id}`))
    )
      .pipe(
        traceUntilFirst('Firestore:Translations:delete'),
      );
  }

  publish(spaceId: string): Observable<void> {
    const translationsPublish = httpsCallableData<{ spaceId: string }, void>(this.functions, 'translationsPublish');
    return translationsPublish({spaceId})
      .pipe(
        traceUntilFirst('Functions:Translations:publish'),
      );
  }

  export(data: TranslationsExportData): Observable<TranslationLocale | TranslationExportImport[]> {
    const translationsExport = httpsCallableData<TranslationsExportData, TranslationLocale | TranslationExportImport[]>(this.functions, 'translationsExport');
    return translationsExport(data)
      .pipe(
        traceUntilFirst(`Functions:Translations:export:${data.kind}`),
      );
  }

  import(data: TranslationsImportData): Observable<void> {
    const translationsImport = httpsCallableData<TranslationsImportData, void>(this.functions, 'translationsImport');
    return translationsImport(data)
      .pipe(
        traceUntilFirst(`Functions:Translations:import:${data.kind}`),
      );
  }

}
