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
import {ObjectUtils} from '@core/utils/object-utils.service';
import {
  Content,
  ContentFolderCreate,
  ContentFolderCreateFS,
  ContentKind,
  ContentPageCreate,
  ContentPageCreateFS,
  ContentPageData,
  ContentPageDataUpdateFS,
  ContentUpdate,
  ContentUpdateFS
} from '@shared/models/content.model';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {QueryConstraint, where, writeBatch} from '@firebase/firestore';

@Injectable()
export class ContentService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {
  }

  findAll(spaceId: string, parentSlug?: string): Observable<Content[]> {
    const queryConstrains: QueryConstraint[] = []
    if (parentSlug) {
      queryConstrains.push(
        where('parentSlug', '==', parentSlug)
      )
    } else {
      queryConstrains.push(
        where('parentSlug', '==', '')
      )
    }

    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/contents`),
        ...queryConstrains),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:findAll'),
        map((it) => it as Content[])
      );
  }

  findById(spaceId: string, id: string): Observable<Content> {
    return docData(doc(this.firestore, `spaces/${spaceId}/contents/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Contents:findById'),
        map((it) => it as Content)
      );
  }

  createPage(spaceId: string, parentSlug: string, entity: ContentPageCreate): Observable<DocumentReference> {
    let addEntity: ContentPageCreateFS = {
      kind: ContentKind.PAGE,
      name: entity.name,
      slug: entity.slug,
      parentSlug: parentSlug,
      fullSlug: parentSlug ? `${parentSlug}/${entity.slug}` : entity.slug,
      schematic: entity.schematic,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    return from(
      addDoc(collection(this.firestore, `spaces/${spaceId}/contents`),
        addEntity
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:create'),
      );
  }

  createFolder(spaceId: string, parentSlug: string, entity: ContentFolderCreate): Observable<DocumentReference> {
    let addEntity: ContentFolderCreateFS = {
      kind: ContentKind.FOLDER,
      name: entity.name,
      slug: entity.slug,
      parentSlug: parentSlug,
      fullSlug: parentSlug ? `${parentSlug}/${entity.slug}` : entity.slug,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    return from(
      addDoc(collection(this.firestore, `spaces/${spaceId}/contents`),
        addEntity
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:create'),
      );
  }

  update(spaceId: string, id: string, entity: ContentUpdate): Observable<void> {
    const update: UpdateData<ContentUpdateFS> = {
      name: entity.name,
      slug: entity.slug,
      updatedAt: serverTimestamp()
    }

    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/contents/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:update'),
      );
  }

  updatePageData(spaceId: string, id: string, data: ContentPageData): Observable<void> {
    ObjectUtils.clean(data);
    const update: UpdateData<ContentPageDataUpdateFS> = {
      data: data,
      updatedAt: serverTimestamp()
    }

    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/contents/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:update'),
      );
  }

  delete(spaceId: string, ...ids: string[]): Observable<void> {
    if (ids.length === 1) {
      return from(
        deleteDoc(doc(this.firestore, `spaces/${spaceId}/contents/${ids[0]}`))
      )
        .pipe(
          traceUntilFirst('Firestore:Contents:delete'),
        );
    }
    const batch = writeBatch(this.firestore)
    ids.forEach(id => batch.delete(doc(this.firestore, `spaces/${spaceId}/contents/${id}`)))
    return from(
      batch.commit()
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:delete'),
      );
  }

  publish(spaceId: string, id: string): Observable<void> {
    const contentPublish = httpsCallableData<{ spaceId: string, contentId: string }, void>(this.functions, 'contentPublish');
    return contentPublish({spaceId, contentId: id})
      .pipe(
        traceUntilFirst('Functions:Contents:publish'),
      );
  }

}
