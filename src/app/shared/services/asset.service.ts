import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
import { traceUntilFirst } from '@angular/fire/performance';
import { ref, Storage, uploadBytes } from '@angular/fire/storage';
import {
  Asset,
  AssetFile,
  AssetFileCreateFS,
  AssetFileImport,
  AssetFileUpdate,
  AssetFolder,
  AssetFolderCreate,
  AssetFolderCreateFS,
  AssetFolderUpdate,
  AssetKind,
} from '@shared/models/asset.model';
import { AssetFileType } from '@shared/models/schema.model';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AssetService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly firestore: Firestore,
    private readonly storage: Storage,
  ) {}

  findAll(spaceId: string, parentPath?: string, fileType?: AssetFileType): Observable<Asset[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('kind', 'desc'), orderBy('name', 'asc')];
    if (parentPath) {
      queryConstrains.push(where('parentPath', '==', parentPath));
    } else {
      queryConstrains.push(where('parentPath', '==', ''));
    }
    let filterFileType: string | undefined = undefined;
    if (fileType || fileType !== AssetFileType.ANY) {
      switch (fileType) {
        case AssetFileType.AUDIO: {
          filterFileType = 'audio/';
          break;
        }
        case AssetFileType.TEXT: {
          filterFileType = 'text/';
          break;
        }
        case AssetFileType.IMAGE: {
          filterFileType = 'image/';
          break;
        }
        case AssetFileType.VIDEO: {
          filterFileType = 'video/';
          break;
        }
        case AssetFileType.APPLICATION: {
          filterFileType = 'application/';
          break;
        }
      }
    }
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/assets`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Assets:findAll'),
      map(it => it as Asset[]),
      map(assets => {
        if (filterFileType) {
          return assets.filter(it => {
            if (it.kind === AssetKind.FILE) {
              return it.type.startsWith(filterFileType!);
            }
            return true;
          });
        } else {
          return assets;
        }
      }),
    );
  }

  countAll(spaceId: string, kind?: AssetKind): Observable<number> {
    const queryConstrains: QueryConstraint[] = [];
    if (kind) {
      queryConstrains.push(where('kind', '==', kind));
    }
    return collectionCount(query(collection(this.firestore, `spaces/${spaceId}/assets`), ...queryConstrains)).pipe(
      traceUntilFirst('Firestore:Assets:countAll'),
    );
  }

  findAllByName(spaceId: string, name: string, max = 20): Observable<Asset[]> {
    const queryConstrains: QueryConstraint[] = [where('name', '>=', name), where('name', '<=', `${name}~`), limit(max)];

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/assets`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Assets:findAllByName'),
      map(it => it as Asset[]),
    );
  }

  findById(spaceId: string, id: string): Observable<Asset> {
    return docData(doc(this.firestore, `spaces/${spaceId}/assets/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Assets:findById'),
      map(it => it as Asset),
    );
  }

  findByIds(spaceId: string, ids: string[]): Observable<Asset[]> {
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/assets`), where(documentId(), 'in', ids)), {
      idField: 'id',
    }).pipe(
      traceUntilFirst('Firestore:Assets:findByIds'),
      map(it => it as Asset[]),
    );
  }

  findAllFilesByName(spaceId: string, name: string, max = 20): Observable<AssetFile[]> {
    const queryConstrains: QueryConstraint[] = [
      where('kind', '==', AssetKind.FILE),
      where('name', '>=', name),
      where('name', '<=', `${name}~`),
      limit(max),
    ];

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/assets`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Assets:findAllFilesByName'),
      map(it => it as AssetFile[]),
    );
  }

  findAllFoldersByName(spaceId: string, name: string, max = 20): Observable<AssetFolder[]> {
    const queryConstrains: QueryConstraint[] = [
      where('kind', '==', AssetKind.FOLDER),
      where('name', '>=', name),
      where('name', '<=', `${name}~`),
      limit(max),
    ];

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/assets`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Assets:findAllFoldersByName'),
      map(it => it as AssetFolder[]),
    );
  }

  importFile(spaceId: string, parentPath: string, entity: AssetFileImport): Observable<DocumentReference> {
    // 1. Download file
    // 2. Add Entity
    // 3. Upload File
    return this.httpClient.get(entity.url, { responseType: 'blob' }).pipe(
      switchMap(fileBlob => {
        const addEntity: AssetFileCreateFS = {
          kind: AssetKind.FILE,
          inProgress: true,
          name: entity.name,
          extension: entity.extension,
          type: fileBlob.type,
          size: fileBlob.size,
          parentPath: parentPath,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (entity.alt) {
          addEntity.alt = entity.alt;
        }
        if (entity.source) {
          addEntity.source = entity.source;
        }
        return from(addDoc(collection(this.firestore, `spaces/${spaceId}/assets`), addEntity)).pipe(
          switchMap(it =>
            from(uploadBytes(ref(this.storage, `spaces/${spaceId}/assets/${it.id}/original`), fileBlob)).pipe(
              //tap(console.log),
              map(() => it),
            ),
          ),
          traceUntilFirst('Firestore:Assets:import'),
        );
      }),
    );
  }

  createFile(spaceId: string, parentPath: string, entity: File): Observable<DocumentReference> {
    const extIdx = entity.name.lastIndexOf('.');
    const addEntity: AssetFileCreateFS = {
      kind: AssetKind.FILE,
      inProgress: true,
      name: extIdx > 0 ? entity.name.substring(0, extIdx) : entity.name,
      extension: extIdx > 0 ? entity.name.substring(extIdx) : '',
      type: entity.type,
      size: entity.size,
      parentPath: parentPath,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/assets`), addEntity)).pipe(
      switchMap(it =>
        from(uploadBytes(ref(this.storage, `spaces/${spaceId}/assets/${it.id}/original`), entity)).pipe(
          //tap(console.log),
          map(() => it),
        ),
      ),
      traceUntilFirst('Firestore:Assets:create'),
    );
  }

  createFolder(spaceId: string, parentPath: string, entity: AssetFolderCreate): Observable<DocumentReference> {
    const addEntity: AssetFolderCreateFS = {
      kind: AssetKind.FOLDER,
      name: entity.name,
      parentPath: parentPath,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/assets`), addEntity)).pipe(traceUntilFirst('Firestore:Assets:create'));
  }

  updateFolder(spaceId: string, id: string, entity: AssetFolderUpdate): Observable<void> {
    const update: UpdateData<AssetFolder> = {
      name: entity.name,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/assets/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Assets:updateFolder'),
    );
  }

  updateFile(spaceId: string, id: string, entity: AssetFileUpdate): Observable<void> {
    const update: UpdateData<AssetFile> = {
      name: entity.name,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/assets/${id}`), update)).pipe(
      traceUntilFirst('Firestore:Assets:updateFile'),
    );
  }

  move(spaceId: string, id: string, parentPath: string): Observable<void> {
    if (parentPath === '~') {
      parentPath = '';
    }
    const update: UpdateData<Asset> = {
      parentPath: parentPath,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/assets/${id}`), update)).pipe(traceUntilFirst('Firestore:Assets:move'));
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/assets/${id}`))).pipe(traceUntilFirst('Firestore:Assets:delete'));
  }
}
