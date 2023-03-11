import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  documentId,
  DocumentReference,
  Firestore,
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
import {ref, Storage, uploadBytes} from '@angular/fire/storage';
import {map, switchMap} from 'rxjs/operators';
import {
  ContentData,
  ContentDocumentDataUpdateFS,
  ContentUpdate,
  ContentUpdateFS
} from '@shared/models/content.model';
import {
  Asset,
  AssetFileCreateFS,
  AssetFolderCreate,
  AssetFolderCreateFS,
  AssetKind
} from '@shared/models/asset.model';

@Injectable()
export class AssetService {
  constructor(
    private readonly firestore: Firestore,
    private readonly storage: Storage,
  ) {
  }

  findAll(spaceId: string, parentPath?: string): Observable<Asset[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('kind', 'desc'), orderBy('name', 'asc')]
    if (parentPath) {
      queryConstrains.push(
        where('parentPath', '==', parentPath)
      )
    } else {
      queryConstrains.push(
        where('parentPath', '==', '')
      )
    }

    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/assets`),
        ...queryConstrains),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Assets:findAll'),
        map((it) => it as Asset[])
      );
  }

  findById(spaceId: string, id: string): Observable<Asset> {
    return docData(doc(this.firestore, `spaces/${spaceId}/assets/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Assets:findById'),
        map((it) => it as Asset)
      );
  }

  findByIds(spaceId: string, ids: string[]): Observable<Asset[]> {
    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/assets`),
        where(documentId(), 'in', ids)
      ),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Assets:findByIds'),
        map((it) => it as Asset[])
      );
  }

  createFile(spaceId: string, parentPath: string, entity: File): Observable<DocumentReference> {
    const extIdx = entity.name.lastIndexOf('.')
    let addEntity: AssetFileCreateFS = {
      kind: AssetKind.FILE,
      name: entity.name.substring(0, extIdx),
      extension: entity.name.substring(extIdx),
      type: entity.type,
      size: entity.size,
      parentPath: parentPath,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    return from(
      addDoc(collection(this.firestore, `spaces/${spaceId}/assets`),
        addEntity
      )
    )
      .pipe(
        switchMap(it =>
          from(
            uploadBytes(ref(this.storage, `spaces/${spaceId}/assets/${it.id}/original`), entity)
          )
            .pipe(
              //tap(console.log),
              map(() => it)
            )
        ),
        traceUntilFirst('Firestore:Assets:create'),
      );
  }

  createFolder(spaceId: string, parentPath: string, entity: AssetFolderCreate): Observable<DocumentReference> {
    let addEntity: AssetFolderCreateFS = {
      kind: AssetKind.FOLDER,
      name: entity.name,
      parentPath: parentPath,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    return from(
      addDoc(collection(this.firestore, `spaces/${spaceId}/assets`),
        addEntity
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Assets:create'),
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
    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/contents/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:update'),
      );
  }

  updatePageData(spaceId: string, id: string, data: ContentData): Observable<void> {
    const update: UpdateData<ContentDocumentDataUpdateFS> = {}

    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/contents/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Contents:update'),
      );
  }

  delete(spaceId: string, element: Asset): Observable<void> {
    return from(
      deleteDoc(doc(this.firestore, `spaces/${spaceId}/assets/${element.id}`))
    )
      .pipe(
        traceUntilFirst('Firestore:Assets:delete'),
      );
  }

}
