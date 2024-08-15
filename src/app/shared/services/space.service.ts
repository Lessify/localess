import { Injectable } from '@angular/core';
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
  updateDoc,
  deleteField,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { map } from 'rxjs/operators';
import { Space, SpaceCreate, SpaceCreateFS, SpaceEnvironment, SpaceUpdate } from '../models/space.model';
import { Locale } from '../models/locale.model';
import { Functions, httpsCallableData } from '@angular/fire/functions';

@Injectable({ providedIn: 'root' })
export class SpaceService {
  constructor(
    private firestore: Firestore,
    private readonly functions: Functions,
  ) {}

  findAll(): Observable<Space[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('name', 'asc')];
    return collectionData(query(collection(this.firestore, `spaces`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Spaces:findAll'),
      map(it => it as Space[]),
    );
  }

  findById(id: string): Observable<Space> {
    return docData(doc(this.firestore, `spaces/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Spaces:findById'),
      map(it => it as Space),
    );
  }

  create(entity: SpaceCreate): Observable<DocumentReference> {
    const defaultLocale: Locale = { id: 'en', name: 'English' };
    const add: SpaceCreateFS = {
      name: entity.name,
      locales: [defaultLocale],
      localeFallback: defaultLocale,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return from(addDoc(collection(this.firestore, 'spaces'), add)).pipe(traceUntilFirst('Firestore:Spaces:create'));
  }

  update(id: string, entity: SpaceUpdate): Observable<void> {
    const update: UpdateData<Space> = {
      name: entity.name,
      icon: entity.icon || deleteField(),
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${id}`), update)).pipe(traceUntilFirst('Firestore:Spaces:update'));
  }

  updateEnvironments(id: string, environments: SpaceEnvironment[]): Observable<void> {
    const update: UpdateData<Space> = {
      environments: environments,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${id}`), update)).pipe(traceUntilFirst('Firestore:Spaces:updateEnvironments'));
  }

  delete(id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${id}`))).pipe(traceUntilFirst('Firestore:Spaces:delete'));
  }

  calculateOverview(spaceId: string): Observable<void> {
    const calculateoverview = httpsCallableData<{ spaceId: string }, void>(this.functions, 'space-calculateoverview');
    return calculateoverview({ spaceId }).pipe(traceUntilFirst('Functions:Spaces:calculateOverview'));
  }
}
