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
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp,
  UpdateData,
  updateDoc
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {Space, SpaceCreate, SpaceCreateFS, SpaceEnvironment, SpaceUiUpdate, SpaceUpdate} from '../models/space.model';
import {Locale} from '../models/locale.model';
import {ObjectUtils} from "@core/utils/object-utils.service";

@Injectable()
export class SpaceService {
  constructor(private firestore: Firestore) {
  }

  findAll(): Observable<Space[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('name', 'asc')]
    return collectionData(
      query(
        collection(this.firestore, `spaces`),
        ...queryConstrains),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Spaces:findAll'),
        map((it) => it as Space[])
      );
  }

  findById(id: string): Observable<Space> {
    return docData(doc(this.firestore, `spaces/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Spaces:findById'),
        map((it) => it as Space)
      );
  }

  create(entity: SpaceCreate): Observable<DocumentReference> {
    const defaultLocale: Locale = {id: 'en', name: 'English'}
    let add: SpaceCreateFS = {
      name: entity.name,
      locales: [defaultLocale],
      localeFallback: defaultLocale,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    return from(addDoc(collection(this.firestore, 'spaces'), add))
      .pipe(
        traceUntilFirst('Firestore:Spaces:create'),
      );
  }

  update(id: string, entity: SpaceUpdate): Observable<void> {
    const update: UpdateData<Space> = {
      name: entity.name,
      updatedAt: serverTimestamp()
    }
    return from(updateDoc(doc(this.firestore, `spaces/${id}`), update))
      .pipe(
        traceUntilFirst('Firestore:Spaces:update'),
      );
  }

  updateUi(id: string, entity: SpaceUiUpdate): Observable<void> {
    const update: UpdateData<Space> = {
      ui: ObjectUtils.clone(entity),
      updatedAt: serverTimestamp()
    }
    return from(updateDoc(doc(this.firestore, `spaces/${id}`), update))
      .pipe(
        traceUntilFirst('Firestore:Spaces:update'),
      );
  }

  updateEnvironments(id: string, environments: SpaceEnvironment[]): Observable<void> {
    const update: UpdateData<Space> = {
      environments: environments,
      updatedAt: serverTimestamp()
    }
    return from(updateDoc(doc(this.firestore, `spaces/${id}`), update))
      .pipe(
        traceUntilFirst('Firestore:Spaces:updateEnvironments'),
      );
  }

  delete(id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${id}`)))
      .pipe(
        traceUntilFirst('Firestore:Spaces:delete'),
      );
  }
}
