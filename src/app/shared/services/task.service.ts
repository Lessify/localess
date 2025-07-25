import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  DocumentReference,
  Firestore,
  orderBy,
  query,
  QueryConstraint,
  serverTimestamp,
} from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';
import { getDownloadURL, ref, Storage, uploadBytes } from '@angular/fire/storage';
import {
  Task,
  TaskAssetExportCreateFS,
  TaskAssetImportCreateFS,
  TaskAssetRegenerateMetadataCreateFS,
  TaskContentExportCreateFS,
  TaskContentImportCreateFS,
  TaskKind,
  TaskSchemaExportCreateFS,
  TaskSchemaImportCreateFS,
  TaskStatus,
  TaskTranslationExportCreateFS,
  TaskTranslationImportCreateFS,
} from '@shared/models/task.model';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(Storage);

  findAll(spaceId: string): Observable<Task[]> {
    const queryConstrains: QueryConstraint[] = [orderBy('createdAt', 'desc')];

    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/tasks`), ...queryConstrains), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Tasks:findAll'),
      map(it => it as Task[]),
    );
  }

  findById(spaceId: string, id: string): Observable<Task> {
    return docData(doc(this.firestore, `spaces/${spaceId}/tasks/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Tasks:findById'),
      map(it => it as Task),
    );
  }

  createAssetExportTask(spaceId: string, path?: string): Observable<DocumentReference> {
    const addEntity: TaskAssetExportCreateFS = {
      kind: TaskKind.ASSET_EXPORT,
      status: TaskStatus.INITIATED,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (path) {
      addEntity.path = path;
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity)).pipe(traceUntilFirst('Firestore:Tasks:create'));
  }

  createAssetImportTask(spaceId: string, file: File): Observable<DocumentReference> {
    const tmpPath = `spaces/${spaceId}/tasks/tmp/${Date.now()}`;
    const addEntity: TaskAssetImportCreateFS = {
      kind: TaskKind.ASSET_IMPORT,
      status: TaskStatus.INITIATED,
      tmpPath: tmpPath,
      file: {
        name: file.name,
        size: file.size,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(uploadBytes(ref(this.storage, tmpPath), file)).pipe(
      switchMap(() => from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity))),
      traceUntilFirst('Firestore:Tasks:create'),
    );
  }

  createAssetRegenerateMetadataTask(spaceId: string): Observable<DocumentReference> {
    const addEntity: TaskAssetRegenerateMetadataCreateFS = {
      kind: TaskKind.ASSET_REGEN_METADATA,
      status: TaskStatus.INITIATED,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity)).pipe(traceUntilFirst('Firestore:Tasks:create'));
  }

  createContentExportTask(spaceId: string, path?: string): Observable<DocumentReference> {
    const addEntity: TaskContentExportCreateFS = {
      kind: TaskKind.CONTENT_EXPORT,
      status: TaskStatus.INITIATED,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (path) {
      addEntity.path = path;
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity)).pipe(traceUntilFirst('Firestore:Tasks:create'));
  }

  createContentImportTask(spaceId: string, file: File): Observable<DocumentReference> {
    const tmpPath = `spaces/${spaceId}/tasks/tmp/${Date.now()}`;
    const addEntity: TaskContentImportCreateFS = {
      kind: TaskKind.CONTENT_IMPORT,
      status: TaskStatus.INITIATED,
      tmpPath: tmpPath,
      file: {
        name: file.name,
        size: file.size,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(uploadBytes(ref(this.storage, tmpPath), file)).pipe(
      switchMap(() => from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity))),
      traceUntilFirst('Firestore:Tasks:create'),
    );
  }

  createSchemaExportTask(spaceId: string, fromDate?: number): Observable<DocumentReference> {
    const addEntity: TaskSchemaExportCreateFS = {
      kind: TaskKind.SCHEMA_EXPORT,
      status: TaskStatus.INITIATED,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (fromDate) {
      addEntity.fromDate = fromDate;
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity)).pipe(traceUntilFirst('Firestore:Tasks:create'));
  }

  createSchemaImportTask(spaceId: string, file: File): Observable<DocumentReference> {
    const tmpPath = `spaces/${spaceId}/tasks/tmp/${Date.now()}`;
    const addEntity: TaskSchemaImportCreateFS = {
      kind: TaskKind.SCHEMA_IMPORT,
      status: TaskStatus.INITIATED,
      tmpPath: tmpPath,
      file: {
        name: file.name,
        size: file.size,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(uploadBytes(ref(this.storage, tmpPath), file)).pipe(
      switchMap(() => from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity))),
      traceUntilFirst('Firestore:Tasks:create'),
    );
  }

  createTranslationExportTask(spaceId: string, fromDate?: number, locale?: string): Observable<DocumentReference> {
    const addEntity: TaskTranslationExportCreateFS = {
      kind: TaskKind.TRANSLATION_EXPORT,
      status: TaskStatus.INITIATED,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (fromDate) {
      addEntity.fromDate = fromDate;
    }
    if (locale) {
      addEntity.locale = locale;
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity)).pipe(traceUntilFirst('Firestore:Tasks:create'));
  }

  createTranslationImportTask(spaceId: string, file: File, locale?: string): Observable<DocumentReference> {
    const tmpPath = `spaces/${spaceId}/tasks/tmp/${Date.now()}`;
    const addEntity: TaskTranslationImportCreateFS = {
      kind: TaskKind.TRANSLATION_IMPORT,
      status: TaskStatus.INITIATED,
      tmpPath: tmpPath,
      file: {
        name: file.name,
        size: file.size,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (locale) {
      addEntity.locale = locale;
    }
    return from(uploadBytes(ref(this.storage, tmpPath), file)).pipe(
      switchMap(() => from(addDoc(collection(this.firestore, `spaces/${spaceId}/tasks`), addEntity))),
      traceUntilFirst('Firestore:Tasks:create'),
    );
  }

  downloadUrl(spaceId: string, id: string): Observable<string> {
    return from(getDownloadURL(ref(this.storage, `spaces/${spaceId}/tasks/${id}/original`)));
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/tasks/${id}`))).pipe(traceUntilFirst('Firestore:Tasks:delete'));
  }
}
