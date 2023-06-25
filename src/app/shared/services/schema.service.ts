import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  deleteField,
  doc,
  docData,
  DocumentReference,
  Firestore,
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp,
  UpdateData,
  updateDoc,
  where
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {
  Schema,
  SchemaCreate,
  SchemaCreateFS, SchemaExportImport,
  SchemasExportData, SchemasImportData,
  SchemaType,
  SchemaUpdate,
  SchemaUpdateFS
} from '@shared/models/schema.model';
import {ObjectUtils} from '@core/utils/object-utils.service';
import {Functions, httpsCallableData} from "@angular/fire/functions";

@Injectable()
export class SchemaService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {
  }

  findAll(spaceId: string, type?: SchemaType): Observable<Schema[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('name', 'asc')]

    if (type) {
      queryConstrains.push(
        where('type', '==', type)
      )
    }

    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/schemas`),
        ...queryConstrains
      ), {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Schemas:findAll'),
        map((it) => it as Schema[])
      );
  }

  findById(spaceId: string, id: string): Observable<Schema> {
    return docData(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Schemas:findById'),
        map((it) => it as Schema)
      );
  }

  create(spaceId: string, entity: SchemaCreate): Observable<DocumentReference> {
    let addEntity: SchemaCreateFS = {
      name: entity.name,
      displayName: entity.displayName,
      type: entity.type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    return from(
      addDoc(collection(this.firestore, `spaces/${spaceId}/schemas`),
        addEntity
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Schemas:create'),
      );
  }

  update(spaceId: string, id: string, entity: SchemaUpdate): Observable<void> {
    console.log(entity)
    ObjectUtils.clean(entity);

    const update: UpdateData<SchemaUpdateFS> = {
      name: entity.name,
      displayName: entity.displayName || deleteField(),
      previewField: entity.previewField || deleteField(),
      fields: entity.fields || deleteField(),
      updatedAt: serverTimestamp()
    }
    console.log(update)
    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Schemas:update'),
      );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(
      deleteDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`))
    )
      .pipe(
        traceUntilFirst('Firestore:Schemas:delete'),
      );
  }

  export(data: SchemasExportData): Observable<SchemaExportImport[]> {
    const schemasExport = httpsCallableData<SchemasExportData, any>(this.functions, 'schemasExport');
    return schemasExport(data)
      .pipe(
        traceUntilFirst(`Functions:Schemas:export`),
      );
  }

  import(data: SchemasImportData): Observable<void> {
    const schemasImport = httpsCallableData<SchemasImportData, void>(this.functions, 'schemasImport');
    return schemasImport(data)
      .pipe(
        traceUntilFirst(`Functions:Schemas:import`),
      );
  }

}
