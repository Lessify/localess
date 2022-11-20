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
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {ObjectUtils} from '../../core/utils/object-utils.service';
import {
  Page, PageContentUpdateFS,
  PageCreate,
  PageCreateFS,
  PageUpdate,
  PageUpdateFS
} from '@shared/models/page.model';
import {Functions, httpsCallableData} from '@angular/fire/functions';

@Injectable()
export class PageService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {
  }

  findAll(spaceId: string): Observable<Page[]> {
    return collectionData(collection(this.firestore, `spaces/${spaceId}/pages`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Pages:findAll'),
        map((it) => it as Page[])
      );
  }

  findById(spaceId: string, id: string): Observable<Page> {
    return docData(doc(this.firestore, `spaces/${spaceId}/pages/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Pages:findById'),
        map((it) => it as Page)
      );
  }

  create(spaceId: string, entity: PageCreate): Observable<DocumentReference> {
    let addEntity: PageCreateFS = {
      name: entity.name,
      slug: entity.slug,
      schematic: entity.schematic,
      createdOn: serverTimestamp(),
      updatedOn: serverTimestamp()
    }

    return from(
      addDoc(collection(this.firestore, `spaces/${spaceId}/pages`),
        addEntity
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Pages:create'),
      );
  }

  update(spaceId: string, id: string, entity: PageUpdate): Observable<void> {
    ObjectUtils.clean(entity);
    const update: UpdateData<PageUpdateFS> = {
      name: entity.name,
      slug: entity.slug,
      updatedOn: serverTimestamp()
    }

    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/pages/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Pages:update'),
      );
  }

  updateContent(spaceId: string, id: string, content: any): Observable<void> {
    ObjectUtils.clean(content);
    const update: UpdateData<PageContentUpdateFS> = {
      content: content,
      updatedOn: serverTimestamp()
    }

    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/pages/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Pages:update'),
      );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(
      deleteDoc(doc(this.firestore, `spaces/${spaceId}/pages/${id}`))
    )
      .pipe(
        traceUntilFirst('Firestore:Pages:delete'),
      );
  }

  publish(spaceId: string, id: string): Observable<void> {
    const translationsPublish = httpsCallableData<{ spaceId: string }, void>(this.functions, 'pagePublish');
    return translationsPublish({spaceId})
      .pipe(
        traceUntilFirst('Functions:Pages:publish'),
      );
  }

}
