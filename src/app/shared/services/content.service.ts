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
  limit,
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
  Content,
  ContentData,
  ContentDocument,
  ContentDocumentCreate,
  ContentDocumentCreateFS,
  ContentDocumentDataUpdateFS,
  ContentFolderCreate,
  ContentFolderCreateFS,
  ContentKind,
  ContentUpdate,
  ContentUpdateFS
} from '@shared/models/content.model';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {ContentHelperService} from '@shared/services/content-helper.service';

@Injectable()
export class ContentService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
    private readonly contentHelperService: ContentHelperService,
  ) {
  }

  findAll(spaceId: string, parentSlug?: string): Observable<Content[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('kind', 'desc'), orderBy('name', 'asc')]
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

  findAllDocuments(spaceId: string): Observable<ContentDocument[]> {
    const queryConstrains: QueryConstraint[] = [where('kind', '==', ContentKind.DOCUMENT)]
    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/contents`),
        ...queryConstrains),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:findAllDocuments'),
        map((it) => it as ContentDocument[])
      );
  }

  findAllDocumentsByName(spaceId: string, name: string, max: number = 20): Observable<ContentDocument[]> {
    const queryConstrains: QueryConstraint[] = [
      where('kind', '==', ContentKind.DOCUMENT),
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
        traceUntilFirst('Firestore:Contents:findAllDocumentsByName'),
        map((it) => it as ContentDocument[])
      );
  }

  findById(spaceId: string, id: string): Observable<Content> {
    return docData(doc(this.firestore, `spaces/${spaceId}/contents/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Contents:findById'),
        map((it) => it as Content)
      );
  }

  createDocument(spaceId: string, parentSlug: string, entity: ContentDocumentCreate): Observable<DocumentReference> {
    let addEntity: ContentDocumentCreateFS = {
      kind: ContentKind.DOCUMENT,
      name: entity.name,
      slug: entity.slug,
      parentSlug: parentSlug,
      fullSlug: parentSlug ? `${parentSlug}/${entity.slug}` : entity.slug,
      schema: entity.schema,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/contents`), addEntity))
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

    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/contents`), addEntity))
      .pipe(
        traceUntilFirst('Firestore:Contents:create'),
      );
  }

  update(spaceId: string, id: string, parentSlug: string, entity: ContentUpdate): Observable<void> {
    const update: UpdateData<ContentUpdateFS> = {
      name: entity.name,
      slug: entity.slug,
      parentSlug: parentSlug,
      fullSlug: parentSlug ? `${parentSlug}/${entity.slug}` : entity.slug,
      updatedAt: serverTimestamp()
    }
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/contents/${id}`), update))
      .pipe(
        traceUntilFirst('Firestore:Contents:update'),
      );
  }

  updateDocumentData(spaceId: string, id: string, data: ContentData): Observable<void> {
    const update: UpdateData<ContentDocumentDataUpdateFS> = {
      data: this.contentHelperService.clone(data),
      updatedAt: serverTimestamp()
    }

    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/contents/${id}`), update))
      .pipe(
        traceUntilFirst('Firestore:Contents:update'),
      );
  }

  delete(spaceId: string, element: Content): Observable<void> {
    /*const batch = writeBatch(this.firestore)
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
    )*/

    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/contents/${element.id}`)))
      .pipe(
        traceUntilFirst('Firestore:Contents:delete'),
      );
  }

  publish(spaceId: string, id: string): Observable<void> {
    const contentPublish = httpsCallableData<{ spaceId: string, contentId: string }, void>(this.functions, 'content-publish');
    return contentPublish({spaceId, contentId: id})
      .pipe(
        traceUntilFirst('Functions:Contents:publish'),
      );
  }

}
