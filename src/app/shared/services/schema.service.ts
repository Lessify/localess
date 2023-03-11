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
  SchemaCreateFS,
  SchemaType,
  SchemaUpdate,
  SchemaUpdateFS
} from '@shared/models/schema.model';
import {ObjectUtils} from '@core/utils/object-utils.service';

@Injectable()
export class SchemaService {
  constructor(
    private readonly firestore: Firestore
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
    ObjectUtils.clean(entity);
    const update: UpdateData<SchemaUpdateFS> = {
      name: entity.name,
      displayName: entity.displayName || deleteField(),
      fields: entity.fields || deleteField(),
      updatedAt: serverTimestamp()
    }

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

}
