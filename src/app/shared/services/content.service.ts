import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  DocumentReference,
  Firestore, limit, orderBy,
  query,
  serverTimestamp,
  UpdateData,
  updateDoc
} from '@angular/fire/firestore';
import {from, Observable, switchMap} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {ObjectUtils} from '@core/utils/object-utils.service';
import {
  Content,
  ContentFolderCreate,
  ContentFolderCreateFS,
  ContentKind, ContentPage,
  ContentPageCreate,
  ContentPageCreateFS,
  ContentPageData,
  ContentPageDataUpdateFS,
  ContentUpdate,
  ContentUpdateFS
} from '@shared/models/content.model';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {getDocs, QueryConstraint, where, writeBatch} from '@firebase/firestore';
import {ContentHelperService} from '@shared/services/content-helper.service';
import {SchematicComponentKind} from '@shared/models/schematic.model';

@Injectable()
export class ContentService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
    private readonly contentHelperService: ContentHelperService,
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

  findAllPages(spaceId: string): Observable<ContentPage[]> {
    const queryConstrains: QueryConstraint[] = [where('kind', '==', ContentKind.PAGE)]
    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/contents`),
        ...queryConstrains),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:findAllPages'),
        map((it) => it as ContentPage[])
      );
  }

  findAllPagesByName(spaceId: string, name: string, max: number = 20): Observable<ContentPage[]> {
    const queryConstrains: QueryConstraint[] = [
      where('kind', '==', ContentKind.PAGE),
      where('name', '>=', name),
      where('name', '<=', `${name}~`),
      limit(max)
    ]

    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/contents`),
        ...queryConstrains),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:findAllPagesByName'),
        map((it) => it as ContentPage[])
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
    const update: UpdateData<ContentPageDataUpdateFS> = {
      data: this.contentHelperService.clone(data),
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

  delete(spaceId: string, element: Content): Observable<void> {
    const batch = writeBatch(this.firestore)
    batch.delete(doc(this.firestore, `spaces/${spaceId}/contents/${element.id}`))

    return from(
      // Query only id's
      getDocs(
        query(
          collection(this.firestore, `spaces/${spaceId}/contents`),
          where('parentSlug', '>=', element.fullSlug)
        )
      )
    )
    .pipe(
      switchMap( it => {
        it.docs.forEach( d => batch.delete(doc(this.firestore, `spaces/${spaceId}/contents/${d.id}`)))
        return from(
          batch.commit()
        )
      }),
      traceUntilFirst('Firestore:Contents:delete'),
    )
  }

  publish(spaceId: string, id: string): Observable<void> {
    const contentPublish = httpsCallableData<{ spaceId: string, contentId: string }, void>(this.functions, 'contentPublish');
    return contentPublish({spaceId, contentId: id})
      .pipe(
        traceUntilFirst('Functions:Contents:publish'),
      );
  }

}
