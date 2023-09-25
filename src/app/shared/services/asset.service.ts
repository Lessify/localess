import { Injectable } from '@angular/core';
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
  limit,
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp,
  UpdateData,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { ref, Storage, uploadBytes } from '@angular/fire/storage';
import { map, switchMap } from 'rxjs/operators';
import {
  Asset,
  AssetFileCreateFS,
  AssetFolder,
  AssetFolderCreate,
  AssetFolderCreateFS,
  AssetFolderUpdate,
  AssetKind,
} from '@shared/models/asset.model';
import { AssetFileType } from '@shared/models/schema.model';

@Injectable()
export class AssetService {
  constructor(
    private readonly firestore: Firestore,
    private readonly storage: Storage
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
      })
    );
  }

  findAllByName(spaceId: string, name: string, max = 20): Observable<Asset[]> {
    const queryConstrains: QueryConstraint[] = [where('name', '>=', name), where('name', '<=', `${name}~`), limit(max)];

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/assets`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Assets:findAllByName'),
      map(it => it as Asset[])
    );
  }

  findById(spaceId: string, id: string): Observable<Asset> {
    return docData(doc(this.firestore, `spaces/${spaceId}/assets/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Assets:findById'),
      map(it => it as Asset)
    );
  }

  findByIds(spaceId: string, ids: string[]): Observable<Asset[]> {
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/assets`), where(documentId(), 'in', ids)), {
      idField: 'id',
    }).pipe(
      traceUntilFirst('Firestore:Assets:findByIds'),
      map(it => it as Asset[])
    );
  }

  createFile(spaceId: string, parentPath: string, entity: File): Observable<DocumentReference> {
    const extIdx = entity.name.lastIndexOf('.');
    const addEntity: AssetFileCreateFS = {
      kind: AssetKind.FILE,
      inProgress: true,
      name: entity.name.substring(0, extIdx),
      extension: entity.name.substring(extIdx),
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
          map(() => it)
        )
      ),
      traceUntilFirst('Firestore:Assets:create')
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

  update(spaceId: string, id: string, entity: AssetFolderUpdate): Observable<void> {
    const update: UpdateData<AssetFolder> = {
      name: entity.name,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/assets/${id}`), update)).pipe(traceUntilFirst('Firestore:Assets:update'));
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/assets/${id}`))).pipe(traceUntilFirst('Firestore:Assets:delete'));
  }
}
