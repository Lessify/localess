import { Injectable } from '@angular/core';
import {
  collection,
  collectionCount,
  collectionData,
  deleteDoc,
  deleteField,
  doc,
  docData,
  Firestore,
  query,
  QueryConstraint,
  serverTimestamp,
  setDoc,
  UpdateData,
  updateDoc,
  where,
  WithFieldValue,
} from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';
import { ObjectUtils } from '@core/utils/object-utils.service';
import {
  Schema,
  SchemaComponent,
  SchemaComponentUpdate,
  SchemaComponentUpdateIdFS,
  SchemaCreate,
  SchemaCreateFS,
  SchemaEnum,
  SchemaEnumUpdate,
  SchemaEnumUpdateIdFS,
  SchemaType,
} from '@shared/models/schema.model';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SchemaService {
  constructor(private readonly firestore: Firestore) {}

  findAll(spaceId: string, type?: SchemaType): Observable<Schema[]> {
    const queryConstrains: QueryConstraint[] = [];

    if (type) {
      queryConstrains.push(where('type', '==', type));
    }

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/schemas`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Schemas:findAll'),
      map(it => it as Schema[]),
    );
  }

  countAll(spaceId: string): Observable<number> {
    return collectionCount(collection(this.firestore, `spaces/${spaceId}/schemas`)).pipe(traceUntilFirst('Firestore:Schemas:countAll'));
  }

  findById(spaceId: string, id: string): Observable<Schema> {
    return docData(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Schemas:findById'),
      map(it => it as Schema),
    );
  }

  create(spaceId: string, entity: SchemaCreate): Observable<void> {
    const addEntity: WithFieldValue<SchemaCreateFS> = {
      displayName: entity.displayName,
      type: entity.type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return from(setDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${entity.id}`), addEntity)).pipe(
      traceUntilFirst('Firestore:Schemas:create'),
    );
  }

  updateId(spaceId: string, entity: Schema, newId: string): Observable<void> {
    console.log('updateId', entity, newId);
    let addEntity: any = {};
    if (entity.type === SchemaType.ROOT || entity.type === SchemaType.NODE) {
      const editEntity: WithFieldValue<SchemaComponentUpdateIdFS> = {
        type: entity.type,
        createdAt: entity.createdAt,
        updatedAt: serverTimestamp(),
      };
      if (entity.description) {
        editEntity.description = entity.description;
      }
      if (entity.displayName) {
        editEntity.displayName = entity.displayName;
      }
      if (entity.labels) {
        editEntity.labels = entity.labels;
      }
      if (entity.previewField) {
        editEntity.previewField = entity.previewField;
      }
      if (entity.fields) {
        editEntity.fields = entity.fields;
      }
      addEntity = editEntity;
    } else if (entity.type === SchemaType.ENUM) {
      const editEntity: WithFieldValue<SchemaEnumUpdateIdFS> = {
        type: entity.type,
        createdAt: entity.createdAt,
        updatedAt: serverTimestamp(),
      };
      if (entity.description) {
        editEntity.description = entity.description;
      }
      if (entity.displayName) {
        editEntity.displayName = entity.displayName;
      }
      if (entity.labels) {
        editEntity.labels = entity.labels;
      }
      if (entity.values) {
        editEntity.values = entity.values;
      }
      addEntity = editEntity;
    }

    return from(setDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${newId}`), addEntity)).pipe(
      traceUntilFirst('Firestore:Schemas:updateId'),
      switchMap(() => from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${entity.id}`)))),
    );
  }

  updateComponent(spaceId: string, id: string, entity: SchemaComponentUpdate): Observable<void> {
    ObjectUtils.clean(entity);
    const update: UpdateData<SchemaComponent> = {
      displayName: entity.displayName || deleteField(),
      description: entity.description || deleteField(),
      previewField: entity.previewField || deleteField(),
      labels: entity.labels || deleteField(),
      fields: entity.fields || deleteField(),
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Schemas:update'),
    );
  }

  updateEnum(spaceId: string, id: string, entity: SchemaEnumUpdate): Observable<void> {
    ObjectUtils.clean(entity);
    const update: UpdateData<SchemaEnum> = {
      displayName: entity.displayName || deleteField(),
      description: entity.description || deleteField(),
      labels: entity.labels || deleteField(),
      values: entity.values || deleteField(),
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Schemas:update'),
    );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`))).pipe(traceUntilFirst('Firestore:Schemas:delete'));
  }
}
