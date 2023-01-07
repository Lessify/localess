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
  query,
  serverTimestamp,
  UpdateData,
  updateDoc
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {
  Schematic,
  SchematicCreate,
  SchematicCreateFS,
  SchematicType,
  SchematicUpdate,
  SchematicUpdateFS
} from '@shared/models/schematic.model';
import {ObjectUtils} from '@core/utils/object-utils.service';
import {deleteField, QueryConstraint, where} from '@firebase/firestore';

@Injectable()
export class SchematicService {
  constructor(
    private readonly firestore: Firestore
  ) {
  }

  findAll(spaceId: string, type?: SchematicType): Observable<Schematic[]> {
    const queryConstrains: QueryConstraint[] = []

    if (type) {
      queryConstrains.push(
        where('type', '==', type)
      )
    }

    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/schematics`),
        ...queryConstrains
      ), {idField: 'id'}
    )
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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
    ObjectUtils.clean(entity);
    const update: UpdateData<SchematicUpdateFS> = {
      name: entity.name,
      displayName: entity.displayName || deleteField(),
      components: entity.components || deleteField(),
      updatedAt: serverTimestamp()
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
