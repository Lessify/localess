import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Asset, Page } from '@localess/shared';
import { AssetService } from './asset.service';

const BASE = '/api/app/spaces/space-1/assets';

/** One page of the list, the last one unless `total` says otherwise. */
const page = <T>(items: T[], total = items.length, at = 0) => ({ items, page: at, size: 100, total });

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

  it('findAll() reads one page of the query, and again when an asset of the space changes, ignoring other entities', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Page<Asset>[] = [];
    const params = new HttpParams().set('page', 1).set('size', 20).set('parentId', 'f1');
    const subscription = service.findAll('space-1', params).subscribe(it => results.push(it));
    http.expectOne(`${BASE}?page=1&size=20&parentId=f1`).flush(page([], 21, 1));

    events.next({ spaceId: 'space-1', entity: 'contents', id: 'c', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(`${BASE}?page=1&size=20&parentId=f1`);

    events.next({ spaceId: 'space-1', entity: 'assets', id: 'a1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${BASE}?page=1&size=20&parentId=f1`).flush(page([{ id: 'a1' } as Asset], 22, 1));
    expect(results.map(it => it.total)).toEqual([21, 22]);
    subscription.unsubscribe();
  });

  it('findFolders() reads every folder of the space, live', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: unknown[][] = [];
    const subscription = service.findFolders('space-1').subscribe(it => results.push(it));
    http.expectOne(`${BASE}/folders`).flush([{ id: 'f1', name: 'Photos' }]);
    events.next({ spaceId: 'space-1', entity: 'assets', id: 'f2', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${BASE}/folders`).flush([]);
    expect(results).toEqual([[{ id: 'f1', name: 'Photos' }], []]);
    subscription.unsubscribe();
  });

  it('search() reads one page of `max` assets whose name has the text, across the space', async () => {
    const service = setup();
    const found = firstValueFrom(service.search('space-1', 'lo', 5));
    http.expectOne(`${BASE}?search=lo&deep=true&size=5`).flush(page([{ id: 'a1' }]));
    expect(await found).toEqual([{ id: 'a1' }]);
  });

  it('findFiles() reads every file of the space, light, live', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: unknown[][] = [];
    const subscription = service.findFiles('space-1').subscribe(it => results.push(it));
    http.expectOne(`${BASE}/files`).flush([{ id: 'a1', name: 'logo' }]);
    events.next({ spaceId: 'space-1', entity: 'assets', id: 'a1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${BASE}/files`).flush([{ id: 'a1', name: 'brand' }]);
    expect(results).toEqual([[{ id: 'a1', name: 'logo' }], [{ id: 'a1', name: 'brand' }]]);
    subscription.unsubscribe();
  });

  it('createFile() uploads the file as multipart with the parent folder first', async () => {
    const service = setup();
    const file = new File(['hello'], 'logo.png', { type: 'image/png' });
    const result = firstValueFrom(service.createFile('space-1', 'f1', file));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/files` });
    const entries = formEntries(request.request.body);
    expect(entries.map(([key]) => key)).toEqual(['parentId', 'file']);
    expect(entries[0][1]).toBe('f1');
    expect((entries[1][1] as File).name).toBe('logo.png');
    request.flush({ id: 'a1' });
    expect((await result).id).toBe('a1');
  });

  it('importFile() downloads the URL and uploads it with its metadata', async () => {
    const service = setup();
    const result = firstValueFrom(
      service.importFile('space-1', undefined, { url: 'https://images.example/x', name: 'photo', extension: '.jpg', source: 'unsplash' }),
    );
    http.expectOne('https://images.example/x').flush(new Blob(['img'], { type: 'image/jpeg' }));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/files` });
    const entries = formEntries(request.request.body);
    expect(entries.map(([key]) => key)).toEqual(['parentId', 'name', 'extension', 'source', 'file']);
    expect(entries.slice(0, 4).map(([, value]) => value)).toEqual(['', 'photo', '.jpg', 'unsplash']);
    expect((entries[4][1] as File).name).toBe('photo.jpg');
    request.flush({ id: 'a2' });
    expect((await result).id).toBe('a2');
  });

  it('createFolder() posts the folder and returns it', async () => {
    const service = setup();
    const result = firstValueFrom(service.createFolder('space-1', 'f1', { name: 'Images' }));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/folders` });
    expect(request.request.body).toEqual({ parentId: 'f1', name: 'Images' });
    request.flush({ id: 'f2' });
    expect((await result).id).toBe('f2');
  });

  it('findUsage() reads how many contents use an asset', async () => {
    const service = setup();
    const result = firstValueFrom(service.findUsage('space-1', 'a1'));
    http.expectOne({ method: 'GET', url: `${BASE}/a1/usage` }).flush({ contents: 3 });
    expect(await result).toEqual({ contents: 3 });
  });

  it('update() patches what it is given and answers the asset as stored', async () => {
    const service = setup();
    const result = firstValueFrom(service.update('space-1', 'a1', { name: 'logo', alt: '' }));
    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/a1` });
    expect(request.request.body).toEqual({ name: 'logo', alt: '' });
    request.flush({ id: 'a1', name: 'logo' });
    expect(await result).toEqual({ id: 'a1', name: 'logo' });
  });

  it('move() patches the new parent folder, null for the root (as contents)', async () => {
    const service = setup();
    const toRoot = firstValueFrom(service.move('space-1', 'a1', null));
    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/a1` });
    expect(request.request.body).toEqual({ parentId: null });
    request.flush({ id: 'a1' });
    await toRoot;

    const toFolder = firstValueFrom(service.move('space-1', 'a1', 'f1'));
    const folderRequest = http.expectOne({ method: 'PATCH', url: `${BASE}/a1` });
    expect(folderRequest.request.body).toEqual({ parentId: 'f1' });
    folderRequest.flush({ id: 'a1', parentId: 'f1' });
    expect((await toFolder).parentId).toBe('f1');
  });

  it('remove() deletes the asset', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('space-1', 'a1'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/a1` }).flush(null);
    await done;
  });
});
