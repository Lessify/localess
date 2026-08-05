import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore and @angular/fire/storage are mocked globally in src/test-setup.ts.
import { addDoc, collectionData, deleteDoc, docData, Firestore } from '@angular/fire/firestore';
import { getDownloadURL, ref, Storage, uploadBytesResumable } from '@angular/fire/storage';
import { firstValueFrom, of } from 'rxjs';

import { Task, TaskKind, TaskLog, TaskStatus } from '../models/task.model';
import { TaskService } from './task.service';

describe('TaskService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Firestore, useValue: {} }, { provide: Storage, useValue: {} }] });
    return TestBed.inject(TaskService);
  }

  it('findAll() reads the space tasks collection ordered by createdAt desc', async () => {
    const service = setup();
    const tasks: Task[] = [{ id: 't1' } as unknown as Task];
    vi.mocked(collectionData).mockReturnValue(of(tasks));

    const result = await firstValueFrom(service.findAll('space-1'));

    expect(result).toEqual(tasks);
    expect(collectionData).toHaveBeenCalledWith(
      { ref: { path: 'mock-collection-ref' }, constraints: [{ type: 'orderBy', field: 'createdAt', direction: 'desc' }] },
      { idField: 'id' },
    );
  });

  it('findById() reads the task doc at the expected path', async () => {
    const service = setup();
    const task: Task = { id: 't1' } as unknown as Task;
    vi.mocked(docData).mockReturnValue(of(task));

    const result = await firstValueFrom(service.findById('space-1', 't1'));

    expect(result).toEqual(task);
  });

  it('createAssetExportTask() adds a task without a path when not given', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);

    await firstValueFrom(service.createAssetExportTask('space-1'));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.ASSET_EXPORT, status: TaskStatus.INITIATED });
    expect(addedEntity).not.toHaveProperty('path');
  });

  it('createAssetExportTask() includes the path when given', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);

    await firstValueFrom(service.createAssetExportTask('space-1', 'folder/sub'));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ path: 'folder/sub' });
  });

  it('createAssetImportTask() uploads the file then adds a task referencing it', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);
    const file = new File(['content'], 'assets.zip', { type: 'application/zip' });

    await firstValueFrom(service.createAssetImportTask('space-1', file));

    expect(uploadBytesResumable).toHaveBeenCalledWith({ path: 'mock-storage-ref' }, file);
    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.ASSET_IMPORT, status: TaskStatus.INITIATED, file: { name: 'assets.zip', size: file.size } });
  });

  it('createAssetRegenerateMetadataTask() adds a task', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);

    await firstValueFrom(service.createAssetRegenerateMetadataTask('space-1'));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.ASSET_REGEN_METADATA, status: TaskStatus.INITIATED });
  });

  it('createContentExportTask() includes the path when given', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);

    await firstValueFrom(service.createContentExportTask('space-1', 'folder'));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.CONTENT_EXPORT, path: 'folder' });
  });

  it('createContentImportTask() uploads the file then adds a task', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);
    const file = new File(['content'], 'content.zip');

    await firstValueFrom(service.createContentImportTask('space-1', file));

    expect(uploadBytesResumable).toHaveBeenCalled();
    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.CONTENT_IMPORT });
  });

  it('createSchemaExportTask() adds a task', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);

    await firstValueFrom(service.createSchemaExportTask('space-1'));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.SCHEMA_EXPORT });
  });

  it('createSchemaImportTask() uploads the file then adds a task', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);
    const file = new File(['content'], 'schema.zip');

    await firstValueFrom(service.createSchemaImportTask('space-1', file));

    expect(uploadBytesResumable).toHaveBeenCalled();
    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.SCHEMA_IMPORT });
  });

  it('createTranslationExportTask() includes the locale when given', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);

    await firstValueFrom(service.createTranslationExportTask('space-1', 'de'));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.TRANSLATION_EXPORT, locale: 'de' });
  });

  it('createTranslationImportTask() defaults to a full import when no locale is given', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);
    const file = new File(['content'], 'translations.zip');

    await firstValueFrom(service.createTranslationImportTask('space-1', file));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.TRANSLATION_IMPORT, type: 'full' });
    expect(addedEntity).not.toHaveProperty('locale');
  });

  it('createTranslationImportTask() switches to flat-json with the given locale', async () => {
    const service = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-task' } as never);
    const file = new File(['content'], 'de.json');

    await firstValueFrom(service.createTranslationImportTask('space-1', file, 'de'));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: TaskKind.TRANSLATION_IMPORT, type: 'flat-json', locale: 'de' });
  });

  it('downloadUrl() resolves the download URL for the task original file', async () => {
    const service = setup();
    vi.mocked(getDownloadURL).mockResolvedValue('https://download-url');

    const result = await firstValueFrom(service.downloadUrl('space-1', 't1'));

    expect(result).toBe('https://download-url');
    expect(ref).toHaveBeenCalledWith({}, 'spaces/space-1/tasks/t1/original');
  });

  it('delete() deletes the task doc at the expected path', async () => {
    const service = setup();

    await firstValueFrom(service.delete('space-1', 't1'));

    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
  });

  it('findLogs() orders logs by createdAt asc', async () => {
    const service = setup();
    vi.mocked(collectionData).mockReturnValue(of([] as TaskLog[]));

    await firstValueFrom(service.findLogs('space-1', 't1'));

    expect(collectionData).toHaveBeenCalledWith(
      { ref: { path: 'mock-collection-ref' }, constraints: [{ type: 'orderBy', field: 'createdAt', direction: 'asc' }] },
      { idField: 'id' },
    );
  });
});
