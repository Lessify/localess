import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore and @angular/fire/storage are mocked globally in src/test-setup.ts.
import { addDoc, collectionCount, collectionData, deleteDoc, deleteField, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Storage, uploadBytes } from '@angular/fire/storage';
import { firstValueFrom, of } from 'rxjs';

import {
  Asset,
  AssetFile,
  AssetFileImport,
  AssetFileUpdateForm,
  AssetFolder,
  AssetFolderCreate,
  AssetFolderUpdateForm,
  AssetKind,
} from '../models/asset.model';
import { AssetFileType } from '../models/schema.model';
import { AssetService } from './asset.service';

describe('AssetService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    const httpGet = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: Storage, useValue: {} },
        { provide: HttpClient, useValue: { get: httpGet } },
      ],
    });
    return { service: TestBed.inject(AssetService), httpGet };
  }

  it('findAll() filters root assets by an empty parentPath when none given', async () => {
    const { service } = setup();
    const assets: Asset[] = [{ id: 'a1', kind: AssetKind.FOLDER, name: 'Folder' } as unknown as Asset];
    vi.mocked(collectionData).mockReturnValue(of(assets));

    const result = await firstValueFrom(service.findAll('space-1'));

    expect(result).toEqual(assets);
    const [queryArg] = vi.mocked(collectionData).mock.calls[0];
    expect(queryArg).toMatchObject({ constraints: expect.arrayContaining([{ type: 'where', field: 'parentPath', op: '==', value: '' }]) });
  });

  it('findAll() filters by the given parentPath', async () => {
    const { service } = setup();
    vi.mocked(collectionData).mockReturnValue(of([]));

    await firstValueFrom(service.findAll('space-1', 'folder'));

    const [queryArg] = vi.mocked(collectionData).mock.calls[0];
    expect(queryArg).toMatchObject({
      constraints: expect.arrayContaining([{ type: 'where', field: 'parentPath', op: '==', value: 'folder' }]),
    });
  });

  it('findAll() filters out files whose type does not match the requested fileType', async () => {
    const { service } = setup();
    const folder: AssetFolder = { id: 'f1', kind: AssetKind.FOLDER, name: 'Folder' } as unknown as AssetFolder;
    const image: AssetFile = { id: 'i1', kind: AssetKind.FILE, name: 'pic', type: 'image/png' } as unknown as AssetFile;
    const audio: AssetFile = { id: 'a1', kind: AssetKind.FILE, name: 'song', type: 'audio/mpeg' } as unknown as AssetFile;
    vi.mocked(collectionData).mockReturnValue(of([folder, image, audio]));

    const result = await firstValueFrom(service.findAll('space-1', undefined, AssetFileType.IMAGE));

    expect(result).toEqual([folder, image]);
  });

  it('countAll() counts all assets when no kind is given', async () => {
    const { service } = setup();
    vi.mocked(collectionCount).mockReturnValue(of(4) as never);

    const result = await firstValueFrom(service.countAll('space-1'));

    expect(result).toBe(4);
  });

  it('countAll() filters by kind when given', async () => {
    const { service } = setup();
    vi.mocked(collectionCount).mockReturnValue(of(2) as never);

    await firstValueFrom(service.countAll('space-1', AssetKind.FILE));

    const [queryArg] = vi.mocked(collectionCount).mock.calls[0];
    expect(queryArg).toMatchObject({ constraints: [{ type: 'where', field: 'kind', op: '==', value: AssetKind.FILE }] });
  });

  it('findAllByName() bounds the name range query and applies the limit', async () => {
    const { service } = setup();
    vi.mocked(collectionData).mockReturnValue(of([]));

    await firstValueFrom(service.findAllByName('space-1', 'logo'));

    const [queryArg] = vi.mocked(collectionData).mock.calls[0];
    expect(queryArg).toMatchObject({
      constraints: [
        { type: 'where', field: 'name', op: '>=', value: 'logo' },
        { type: 'where', field: 'name', op: '<=', value: 'logo~' },
        { type: 'limit', n: 20 },
      ],
    });
  });

  it('findById() reads the asset doc at the expected path', async () => {
    const { service } = setup();
    const asset: Asset = { id: 'a1' } as unknown as Asset;
    vi.mocked(docData).mockReturnValue(of(asset));

    const result = await firstValueFrom(service.findById('space-1', 'a1'));

    expect(result).toEqual(asset);
  });

  it('findByIds() queries by document id "in" the given ids', async () => {
    const { service } = setup();
    vi.mocked(collectionData).mockReturnValue(of([]));

    await firstValueFrom(service.findByIds('space-1', ['a1', 'a2']));

    const [queryArg] = vi.mocked(collectionData).mock.calls[0];
    expect(queryArg).toMatchObject({ constraints: [{ type: 'where', field: '__name__', op: 'in', value: ['a1', 'a2'] }] });
  });

  it('findAllFilesByName() restricts the kind filter to files', async () => {
    const { service } = setup();
    vi.mocked(collectionData).mockReturnValue(of([]));

    await firstValueFrom(service.findAllFilesByName('space-1', 'logo'));

    const [queryArg] = vi.mocked(collectionData).mock.calls[0];
    expect(queryArg).toMatchObject({
      constraints: expect.arrayContaining([{ type: 'where', field: 'kind', op: '==', value: AssetKind.FILE }]),
    });
  });

  it('findAllFoldersByName() restricts the kind filter to folders', async () => {
    const { service } = setup();
    vi.mocked(collectionData).mockReturnValue(of([]));

    await firstValueFrom(service.findAllFoldersByName('space-1', 'logo'));

    const [queryArg] = vi.mocked(collectionData).mock.calls[0];
    expect(queryArg).toMatchObject({
      constraints: expect.arrayContaining([{ type: 'where', field: 'kind', op: '==', value: AssetKind.FOLDER }]),
    });
  });

  it('importFile() downloads the url, adds the doc, then uploads the blob', async () => {
    const { service, httpGet } = setup();
    const fileBlob = new Blob(['data'], { type: 'image/png' });
    httpGet.mockReturnValue(of(fileBlob));
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-asset' } as never);
    const entity: AssetFileImport = { url: 'https://x/file.png', name: 'file', extension: '.png', alt: 'Alt text' };

    await firstValueFrom(service.importFile('space-1', 'folder', entity));

    expect(httpGet).toHaveBeenCalledWith('https://x/file.png', { responseType: 'blob' });
    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({
      kind: AssetKind.FILE,
      inProgress: true,
      name: 'file',
      extension: '.png',
      type: 'image/png',
      parentPath: 'folder',
      alt: 'Alt text',
    });
    expect(uploadBytes).toHaveBeenCalledWith({ path: 'mock-storage-ref' }, fileBlob);
  });

  it('createFile() splits the file name/extension and uploads the bytes', async () => {
    const { service } = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-asset' } as never);
    const file = new File(['data'], 'photo.png', { type: 'image/png' });

    await firstValueFrom(service.createFile('space-1', 'folder', file));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: AssetKind.FILE, name: 'photo', extension: '.png', type: 'image/png', parentPath: 'folder' });
    expect(uploadBytes).toHaveBeenCalledWith({ path: 'mock-storage-ref' }, file);
  });

  it('createFile() keeps the whole name and an empty extension when the file has none', async () => {
    const { service } = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-asset' } as never);
    const file = new File(['data'], 'noext', { type: 'application/octet-stream' });

    await firstValueFrom(service.createFile('space-1', 'folder', file));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ name: 'noext', extension: '' });
  });

  it('createFolder() adds a folder entity', async () => {
    const { service } = setup();
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-folder' } as never);
    const entity: AssetFolderCreate = { name: 'Folder' };

    await firstValueFrom(service.createFolder('space-1', 'parent', entity));

    const [, addedEntity] = vi.mocked(addDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ kind: AssetKind.FOLDER, name: 'Folder', parentPath: 'parent' });
  });

  it('updateFolder() sets the folder name', async () => {
    const { service } = setup();
    const entity: AssetFolderUpdateForm = { name: 'Renamed' };

    await firstValueFrom(service.updateFolder('space-1', 'a1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ name: 'Renamed' });
  });

  it('updateFile() deletes the alt field when not provided', async () => {
    const { service } = setup();
    const entity: AssetFileUpdateForm = { name: 'Renamed', alt: '' };

    await firstValueFrom(service.updateFile('space-1', 'a1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ name: 'Renamed', alt: deleteField() });
  });

  it('updateFile() sets the alt field when provided', async () => {
    const { service } = setup();
    const entity: AssetFileUpdateForm = { name: 'Renamed', alt: 'New alt' };

    await firstValueFrom(service.updateFile('space-1', 'a1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ alt: 'New alt' });
  });

  it('move() clears parentPath when moved to the root sentinel "~"', async () => {
    const { service } = setup();

    await firstValueFrom(service.move('space-1', 'a1', '~'));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ parentPath: '' });
  });

  it('move() sets a real parentPath as given', async () => {
    const { service } = setup();

    await firstValueFrom(service.move('space-1', 'a1', 'folder'));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ parentPath: 'folder' });
  });

  it('delete() deletes the asset doc at the expected path', async () => {
    const { service } = setup();

    await firstValueFrom(service.delete('space-1', 'a1'));

    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
  });
});
