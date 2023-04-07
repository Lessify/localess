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
import {delay, from, Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {ref, Storage, uploadBytes} from '@angular/fire/storage';
import {map, switchMap} from 'rxjs/operators';
import {
  Asset,
  AssetFileCreateFS,
  AssetFolderCreate,
  AssetFolderCreateFS, AssetFolderUpdate, AssetFolderUpdateFS,
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
              map(() => it),
            )
        ),
        switchMap(it =>
          from(
            updateDoc(doc(this.firestore, `spaces/${spaceId}/assets/${it.id}`),
              {updatedAt: serverTimestamp()}
            )
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

  update(spaceId: string, id: string, entity: AssetFolderUpdate): Observable<void> {
    const update: UpdateData<AssetFolderUpdateFS> = {
      name: entity.name,
      updatedAt: serverTimestamp()
    }
    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/assets/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Assets:update'),
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
