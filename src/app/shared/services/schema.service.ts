import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionCount,
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
  where,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { map } from 'rxjs/operators';
import {
  Schema,
  SchemaComponent,
  SchemaComponentUpdate,
  SchemaCreate,
  SchemaCreateFS,
  SchemaEnum,
  SchemaEnumUpdate,
  SchemaType,
} from '@shared/models/schema.model';
import { ObjectUtils } from '@core/utils/object-utils.service';
import { WithFieldValue } from '@firebase/firestore';

@Injectable()
export class SchemaService {
  constructor(private readonly firestore: Firestore) {}

  findAll(spaceId: string, type?: SchemaType): Observable<Schema[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('name', 'asc')];

    if (type) {
      queryConstrains.push(where('type', '==', type));
    }

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/schemas`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Schemas:findAll'),
      map(it => it as Schema[])
    );
  }

  countAll(spaceId: string): Observable<number> {
    return collectionCount(collection(this.firestore, `spaces/${spaceId}/schemas`)).pipe(traceUntilFirst('Firestore:Schemas:countAll'));
  }

  findById(spaceId: string, id: string): Observable<Schema> {
    return docData(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Schemas:findById'),
      map(it => it as Schema)
    );
  }

  create(spaceId: string, entity: SchemaCreate): Observable<DocumentReference> {
    const addEntity: WithFieldValue<SchemaCreateFS> = {
      name: entity.name,
      displayName: entity.displayName,
      type: entity.type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/schemas`), addEntity)).pipe(
      traceUntilFirst('Firestore:Schemas:create')
    );
  }

  updateComponent(spaceId: string, id: string, entity: SchemaComponentUpdate): Observable<void> {
    ObjectUtils.clean(entity);
    const update: UpdateData<SchemaComponent> = {
      name: entity.name,
      displayName: entity.displayName || deleteField(),
      previewField: entity.previewField || deleteField(),
      previewImage: entity.previewImage || deleteField(),
      fields: entity.fields || deleteField(),
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Schemas:update')
    );
  }

  updateEnum(spaceId: string, id: string, entity: SchemaEnumUpdate): Observable<void> {
    ObjectUtils.clean(entity);
    const update: UpdateData<SchemaEnum> = {
      name: entity.name,
      displayName: entity.displayName || deleteField(),
      values: entity.values || deleteField(),
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Schemas:update')
    );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`))).pipe(traceUntilFirst('Firestore:Schemas:delete'));
  }
}
