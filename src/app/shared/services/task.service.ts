import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  DocumentReference,
  Firestore,
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {ref, Storage, uploadBytes} from '@angular/fire/storage';
import {map, switchMap} from 'rxjs/operators';
import {AssetKind} from '@shared/models/asset.model';
import {Task, TaskAssetExportCreateFS, TaskAssetImportCreateFS, TaskCreateFS, TaskKind, TaskStatus} from "@shared/models/task.model";

@Injectable()
export class TaskService {
  constructor(
    private readonly firestore: Firestore,
    private readonly storage: Storage,
  ) {
  }

  findAll(spaceId: string): Observable<Task[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('createdAt', 'desc')]

    return collectionData(
      query(
        collection(this.firestore, `spaces/${spaceId}/tasks`),
        ...queryConstrains),
      {idField: 'id'}
    )
      .pipe(
        traceUntilFirst('Firestore:Tasks:findAll'),
        map((it) => it as Task[])
      );
  }

  findById(spaceId: string, id: string): Observable<Task> {
    return docData(doc(this.firestore, `spaces/${spaceId}/tasks/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Tasks:findById'),
        map((it) => it as Task)
      );
  }

  createTask(spaceId: string, kind: TaskKind): Observable<DocumentReference> {
    let addEntity: any = {
      kind: AssetKind.FOLDER,
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity))
      .pipe(
        traceUntilFirst('Firestore:Tasks:create'),
      );
  }

  createAssetExportTask(spaceId: string): Observable<DocumentReference> {
    let addEntity: TaskAssetExportCreateFS = {
      kind: TaskKind.ASSET_EXPORT,
      status: TaskStatus.INITIATED,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity))
      .pipe(
        traceUntilFirst('Firestore:Tasks:create'),
      );
  }

  createAssetImportTask(spaceId: string, file: File): Observable<DocumentReference> {
    const tmpPath = `spaces/${spaceId}/tasks/tmp/${Date.now()}`
    let addEntity: TaskAssetImportCreateFS = {
      kind: TaskKind.ASSET_IMPORT,
      status: TaskStatus.INITIATED,
      tmpPath: tmpPath,
      file: {
        type: file.type,
        name: file.name,
        size: file.size,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    return from(uploadBytes(ref(this.storage, tmpPath), file))
      .pipe(
        switchMap((it) =>
          from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity))
        ),
        traceUntilFirst('Firestore:Tasks:create'),
      );
  }

}
