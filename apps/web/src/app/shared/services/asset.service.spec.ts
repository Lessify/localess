import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Asset, AssetFileType, AssetKind } from '@localess/shared';
import { AssetService } from './asset.service';

const BASE = '/api/app/spaces/space-1/assets';

describe('AssetService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AssetService);
  }

  function formEntries(body: unknown): [string, FormDataEntryValue][] {
    const entries: [string, FormDataEntryValue][] = [];
    (body as FormData).forEach((value, key) => entries.push([key, value]));
    return entries;
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() lists the children of a parent path, the root by default', async () => {
    const service = setup();
    const root = firstValueFrom(service.findAll('space-1'));
    http.expectOne(`${BASE}?parentPath=`).flush([{ id: 'a1' }]);
    expect(await root).toEqual([{ id: 'a1' }]);

    const nested = firstValueFrom(service.findAll('space-1', 'f1/f2'));
    http.expectOne(`${BASE}?parentPath=f1/f2`).flush([]);
    expect(await nested).toEqual([]);
  });

  it('findAll() narrows files by MIME prefix, except for ANY', async () => {
    const service = setup();
    const images = firstValueFrom(service.findAll('space-1', '', AssetFileType.IMAGE));
    http.expectOne(`${BASE}?parentPath=&fileType=image/`).flush([]);
    await images;

    const any = firstValueFrom(service.findAll('space-1', '', AssetFileType.ANY));
    http.expectOne(`${BASE}?parentPath=`).flush([]);
    await any;
  });

  it('findAll() refetches when an asset of the space changes, ignoring other entities', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Asset[][] = [];
    const subscription = service.findAll('space-1').subscribe(it => results.push(it));
    http.expectOne(`${BASE}?parentPath=`).flush([]);

    events.next({ spaceId: 'space-1', entity: 'contents', id: 'c', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(`${BASE}?parentPath=`);

    events.next({ spaceId: 'space-1', entity: 'assets', id: 'a1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${BASE}?parentPath=`).flush([{ id: 'a1' } as Asset]);
    expect(results).toEqual([[], [{ id: 'a1' }]]);
    subscription.unsubscribe();
  });

  it('countAll() reads the count, filtered by kind when given', async () => {
    const service = setup();
    const all = firstValueFrom(service.countAll('space-1'));
    http.expectOne(`${BASE}/count`).flush({ count: 4 });
    expect(await all).toBe(4);

    const files = firstValueFrom(service.countAll('space-1', AssetKind.FILE));
    http.expectOne(`${BASE}/count?kind=FILE`).flush({ count: 2 });
    expect(await files).toBe(2);
  });

  it('find*ByName() search by name prefix with kind and limit', async () => {
    const service = setup();
    const any = firstValueFrom(service.findAllByName('space-1', 'lo'));
    http.expectOne(`${BASE}?name=lo&limit=20`).flush([]);
    await any;

    const files = firstValueFrom(service.findAllFilesByName('space-1', 'lo', 5));
    http.expectOne(`${BASE}?name=lo&kind=FILE&limit=5`).flush([]);
    await files;

    const folders = firstValueFrom(service.findAllFoldersByName('space-1', 'lo'));
    http.expectOne(`${BASE}?name=lo&kind=FOLDER&limit=20`).flush([{ id: 'f1' }]);
    expect(await folders).toEqual([{ id: 'f1' }]);
  });

  it('findById() reads one asset', async () => {
    const service = setup();
    const result = firstValueFrom(service.findById('space-1', 'a1'));
    http.expectOne(`${BASE}/a1`).flush({ id: 'a1' });
    expect(await result).toEqual({ id: 'a1' });
  });

  it('findByIds() lists the given ids, without a request when there are none', async () => {
    const service = setup();
    const result = firstValueFrom(service.findByIds('space-1', ['a', 'b']));
    http.expectOne(`${BASE}?ids=a,b`).flush([{ id: 'a' }]);
    expect(await result).toEqual([{ id: 'a' }]);

    expect(await firstValueFrom(service.findByIds('space-1', []))).toEqual([]);
  });

  it('createFile() uploads the file as multipart with the parent path first', async () => {
    const service = setup();
    const file = new File(['hello'], 'logo.png', { type: 'image/png' });
    const result = firstValueFrom(service.createFile('space-1', 'f1', file));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/files` });
    const entries = formEntries(request.request.body);
    expect(entries.map(([key]) => key)).toEqual(['parentPath', 'file']);
    expect(entries[0][1]).toBe('f1');
    expect((entries[1][1] as File).name).toBe('logo.png');
    request.flush({ id: 'a1' });
    expect((await result).id).toBe('a1');
  });

  it('importFile() downloads the URL and uploads it with its metadata', async () => {
    const service = setup();
    const result = firstValueFrom(
      service.importFile('space-1', '', { url: 'https://images.example/x', name: 'photo', extension: '.jpg', source: 'unsplash' }),
    );
    http.expectOne('https://images.example/x').flush(new Blob(['img'], { type: 'image/jpeg' }));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/files` });
    const entries = formEntries(request.request.body);
    expect(entries.map(([key]) => key)).toEqual(['parentPath', 'name', 'extension', 'source', 'file']);
    expect(entries.slice(0, 4).map(([, value]) => value)).toEqual(['', 'photo', '.jpg', 'unsplash']);
    expect((entries[4][1] as File).name).toBe('photo.jpg');
    request.flush({ id: 'a2' });
    expect((await result).id).toBe('a2');
  });

  it('createFolder() posts the folder and returns it', async () => {
    const service = setup();
    const result = firstValueFrom(service.createFolder('space-1', 'f1', { name: 'Images' }));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/folders` });
    expect(request.request.body).toEqual({ parentPath: 'f1', name: 'Images' });
    request.flush({ id: 'f2' });
    expect((await result).id).toBe('f2');
  });

  it('updateFolder() and updateFile() patch the editable fields, an empty alt removing it', async () => {
    const service = setup();
    const folder = firstValueFrom(service.updateFolder('space-1', 'f1', { name: 'Pics' }));
    const folderRequest = http.expectOne({ method: 'PATCH', url: `${BASE}/f1` });
    expect(folderRequest.request.body).toEqual({ name: 'Pics' });
    folderRequest.flush({});
    await folder;

    const file = firstValueFrom(service.updateFile('space-1', 'a1', { name: 'logo', alt: undefined }));
    const fileRequest = http.expectOne({ method: 'PATCH', url: `${BASE}/a1` });
    expect(fileRequest.request.body).toEqual({ name: 'logo', alt: '' });
    fileRequest.flush({});
    await file;
  });

  it('move() puts the new parent path, mapping "~" to the root', async () => {
    const service = setup();
    const toRoot = firstValueFrom(service.move('space-1', 'a1', '~'));
    const request = http.expectOne({ method: 'PUT', url: `${BASE}/a1/parent` });
    expect(request.request.body).toEqual({ parentPath: '' });
    request.flush({});
    await toRoot;

    const toFolder = firstValueFrom(service.move('space-1', 'a1', 'f1'));
    const folderRequest = http.expectOne({ method: 'PUT', url: `${BASE}/a1/parent` });
    expect(folderRequest.request.body).toEqual({ parentPath: 'f1' });
    folderRequest.flush({});
    await toFolder;
  });

  it('delete() deletes the asset', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('space-1', 'a1'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/a1` }).flush(null);
    await done;
  });
});
