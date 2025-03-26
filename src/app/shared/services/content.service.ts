import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  addDoc,
  collection,
  collectionCount,
  collectionData,
  deleteDoc,
  doc,
  docData,
  documentId,
  DocumentReference,
  Firestore,
  limit,
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp,
  UpdateData,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { traceUntilFirst } from '@angular/fire/performance';
import { NameUtils } from '@core/utils/name-utils.service';
import {
  Content,
  ContentData,
  ContentDocument,
  ContentDocumentCreate,
  ContentDocumentCreateFS,
  ContentFolder,
  ContentFolderCreate,
  ContentFolderCreateFS,
  ContentKind,
  ContentUpdate,
} from '@shared/models/content.model';
import { ContentHelperService } from '@shared/services/content-helper.service';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ContentService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
    private readonly auth: Auth,
    private readonly contentHelperService: ContentHelperService,
  ) {}

  findAll(spaceId: string, parentSlug?: string): Observable<Content[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('kind', 'desc'), orderBy('name', 'asc')];
    if (parentSlug) {
      queryConstrains.push(where('parentSlug', '==', parentSlug));
    } else {
      queryConstrains.push(where('parentSlug', '==', ''));
    }

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/contents`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Contents:findAll'),
      map(it => it as Content[]),
    );
  }

  countAll(spaceId: string, kind?: ContentKind): Observable<number> {
    const queryConstrains: QueryConstraint[] = [];
    if (kind) {
      queryConstrains.push(where('kind', '==', kind));
    }
    return collectionCount(query(collection(this.firestore, `spaces/${spaceId}/contents`), ...queryConstrains)).pipe(
      traceUntilFirst('Firestore:Contents:countAll'),
    );
  }

  findAllDocuments(spaceId: string): Observable<ContentDocument[]> {
    const queryConstrains: QueryConstraint[] = [where('kind', '==', ContentKind.DOCUMENT)];
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/contents`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Contents:findAllDocuments'),
      map(it => it as ContentDocument[]),
    );
  }

  findAllByName(spaceId: string, name: string, max = 20): Observable<Content[]> {
    const queryConstrains: QueryConstraint[] = [where('name', '>=', name), where('name', '<=', `${name}~`), limit(max)];

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/contents`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Contents:findAllByName'),
      map(it => it as Content[]),
    );
  }

  findAllDocumentsByName(spaceId: string, name: string, max = 20): Observable<ContentDocument[]> {
    const queryConstrains: QueryConstraint[] = [
      where('kind', '==', ContentKind.DOCUMENT),
      where('name', '>=', name),
      where('name', '<=', `${name}~`),
      limit(max),
    ];

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/contents`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Contents:findAllDocumentsByName'),
      map(it => it as ContentDocument[]),
    );
  }

  findAllFoldersByName(spaceId: string, name: string, max = 20): Observable<ContentFolder[]> {
    const queryConstrains: QueryConstraint[] = [
      where('kind', '==', ContentKind.FOLDER),
      where('name', '>=', name),
      where('name', '<=', `${name}~`),
      limit(max),
    ];

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/contents`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Contents:findAllFoldersByName'),
      map(it => it as ContentFolder[]),
    );
  }

  findById(spaceId: string, id: string): Observable<Content> {
    return docData(doc(this.firestore, `spaces/${spaceId}/contents/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Contents:findById'),
      map(it => it as Content),
    );
  }

  findByIds(spaceId: string, ids: string[]): Observable<Content[]> {
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/contents`), where(documentId(), 'in', ids)), {
      idField: 'id',
    }).pipe(
      traceUntilFirst('Firestore:Contents:findByIds'),
      map(it => it as Content[]),
    );
  }

  createDocument(spaceId: string, parentSlug: string, entity: ContentDocumentCreate): Observable<DocumentReference> {
    const addEntity: ContentDocumentCreateFS = {
      kind: ContentKind.DOCUMENT,
      name: entity.name,
      slug: entity.slug,
      parentSlug: parentSlug,
      fullSlug: parentSlug ? `${parentSlug}/${entity.slug}` : entity.slug,
      schema: entity.schema,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (this.auth.currentUser?.email && this.auth.currentUser?.displayName) {
      addEntity.updatedBy = {
        name: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
      };
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/contents`), addEntity)).pipe(
      traceUntilFirst('Firestore:Contents:create'),
    );
  }

  createFolder(spaceId: string, parentSlug: string, entity: ContentFolderCreate): Observable<DocumentReference> {
    const addEntity: ContentFolderCreateFS = {
      kind: ContentKind.FOLDER,
      name: entity.name,
      slug: entity.slug,
      parentSlug: parentSlug,
      fullSlug: parentSlug ? `${parentSlug}/${entity.slug}` : entity.slug,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (this.auth.currentUser?.email && this.auth.currentUser?.displayName) {
      addEntity.updatedBy = {
        name: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
      };
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/contents`), addEntity)).pipe(
      traceUntilFirst('Firestore:Contents:create'),
    );
  }

  update(spaceId: string, id: string, parentSlug: string, entity: ContentUpdate): Observable<void> {
    const update: UpdateData<Content> = {
      name: entity.name,
      slug: entity.slug,
      parentSlug: parentSlug,
      fullSlug: parentSlug ? `${parentSlug}/${entity.slug}` : entity.slug,
      updatedAt: serverTimestamp(),
    };
    if (this.auth.currentUser?.email && this.auth.currentUser?.displayName) {
      update.updatedBy = {
        name: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
      };
    }
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/contents/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Contents:update'),
    );
  }

  move(spaceId: string, id: string, parentSlug: string, slug: string): Observable<void> {
    if (parentSlug === '~') {
      parentSlug = '';
    }
    const update: UpdateData<Content> = {
      parentSlug: parentSlug,
      fullSlug: parentSlug ? `${parentSlug}/${slug}` : slug,
      updatedAt: serverTimestamp(),
    };
    if (this.auth.currentUser?.email && this.auth.currentUser?.displayName) {
      update.updatedBy = {
        name: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
      };
    }
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/contents/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Contents:move'),
    );
  }

  updateDocumentData(spaceId: string, id: string, data: ContentData, refs: [Set<string>, Set<string>]): Observable<void> {
    const update: UpdateData<ContentDocument> = {
      data: JSON.stringify(this.contentHelperService.clone(data)),
      updatedAt: serverTimestamp(),
      assets: Array.from(refs[0]),
      references: Array.from(refs[1]),
    };
    if (this.auth.currentUser?.email && this.auth.currentUser?.displayName) {
      update.updatedBy = {
        name: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
      };
    }
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/contents/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Contents:update'),
    );
  }

  cloneDocument(spaceId: string, entity: ContentDocument): Observable<DocumentReference> {
    const nameSuffix = NameUtils.random(5);
    const addEntity: ContentDocumentCreateFS = {
      kind: ContentKind.DOCUMENT,
      name: `${entity.name} ${nameSuffix}`,
      slug: `${entity.slug}-${nameSuffix}`,
      parentSlug: entity.parentSlug,
      fullSlug: entity.parentSlug ? `${entity.parentSlug}/${entity.slug}-${nameSuffix}` : `${entity.slug}-${nameSuffix}`,
      schema: entity.schema,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (entity.data) {
      addEntity.data = entity.data;
    }
    if (this.auth.currentUser?.email && this.auth.currentUser?.displayName) {
      addEntity.updatedBy = {
        name: this.auth.currentUser.displayName,
        email: this.auth.currentUser.email,
      };
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/contents`), addEntity)).pipe(
      traceUntilFirst('Firestore:Contents:clone'),
    );
  }

  delete(spaceId: string, element: Content): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/contents/${element.id}`))).pipe(
      traceUntilFirst('Firestore:Contents:delete'),
    );
  }

  publish(spaceId: string, id: string): Observable<void> {
    const contentPublish = httpsCallableData<{ spaceId: string; contentId: string }, void>(this.functions, 'content-publish');
    return contentPublish({ spaceId, contentId: id }).pipe(traceUntilFirst('Functions:Contents:publish'));
  }
}
