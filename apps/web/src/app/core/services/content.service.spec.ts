import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Content, ContentDocument, ContentKind } from '@localess/shared';
import { ContentService } from './content.service';

const BASE = '/api/app/spaces/space-1/contents';

describe('ContentService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(ContentService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  /** A page of the list as the server answers it. */
  const page = (items: unknown[], total = items.length, index = 0) => ({ items, page: index, size: 100, total });

  it('findPage() reads one page with the query as given', async () => {
    const service = setup();
    const params = new HttpParams().set('page', 1).set('size', 20).set('parentId', 'f1').set('deep', 'true').set('search', 'blog');
    const result = firstValueFrom(service.findPage('space-1', params));
    http.expectOne(`${BASE}?page=1&size=20&parentId=f1&deep=true&search=blog`).flush(page([{ id: 'c1' }], 21, 1));
    expect(await result).toEqual(page([{ id: 'c1' }], 21, 1));
  });

  it('findAllNames() reads every folder and document of the space, light, live', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: unknown[][] = [];
    const subscription = service.findAllNames('space-1').subscribe(it => results.push(it));
    http.expectOne(`${BASE}/names`).flush([{ id: 'f1', kind: 'FOLDER', name: 'Blog', slug: 'blog' }]);
    events.next({ spaceId: 'space-1', entity: 'contents', id: 'f2', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${BASE}/names`).flush([]);
    expect(results).toEqual([[{ id: 'f1', kind: 'FOLDER', name: 'Blog', slug: 'blog' }], []]);
    subscription.unsubscribe();
  });

  it('findPage() reads the page again when a content of the space changes, ignoring other entities', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Content[][] = [];
    const params = new HttpParams().set('page', 0).set('size', 20);
    const subscription = service.findPage('space-1', params).subscribe(it => results.push(it.items));
    http.expectOne(`${BASE}?page=0&size=20`).flush(page([]));

    events.next({ spaceId: 'space-1', entity: 'assets', id: 'a', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(`${BASE}?page=0&size=20`);

    events.next({ spaceId: 'space-1', entity: 'contents', id: 'c1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${BASE}?page=0&size=20`).flush(page([{ id: 'c1' } as Content]));
    expect(results).toEqual([[], [{ id: 'c1' }]]);
    subscription.unsubscribe();
  });

  it('search() searches the whole space, one page of at most `max`, by kind when given', async () => {
    const service = setup();
    const any = firstValueFrom(service.search('space-1', 'Ho'));
    http.expectOne(`${BASE}?search=Ho&deep=true&size=20`).flush(page([{ id: 'h' }]));
    expect(await any).toEqual([{ id: 'h' }]);

    const documents = firstValueFrom(service.search('space-1', 'Ho', 5, ContentKind.DOCUMENT));
    http.expectOne(`${BASE}?search=Ho&deep=true&size=5&kind=DOCUMENT`).flush(page([]));
    await documents;
  });

  it('findOne() reads one document, with its data', async () => {
    const service = setup();
    const document = firstValueFrom(service.findOne('space-1', 'd1'));
    http.expectOne(`${BASE}/d1`).flush({ id: 'd1', data: { _id: 'x' } });
    expect(await document).toEqual({ id: 'd1', data: { _id: 'x' } });
  });

  it('createDocument() and createFolder() post the new content and return it', async () => {
    const service = setup();
    const document = firstValueFrom(service.createDocument('space-1', 'f1', { name: 'Home', slug: 'home', schema: 'page' }));
    const request = http.expectOne({ method: 'POST', url: BASE });
    expect(request.request.body).toEqual({ kind: 'DOCUMENT', parentId: 'f1', name: 'Home', slug: 'home', schema: 'page' });
    request.flush({ id: 'd1' });
    expect((await document).id).toBe('d1');

    const folder = firstValueFrom(service.createFolder('space-1', undefined, { name: 'Blog', slug: 'blog' }));
    const folderRequest = http.expectOne({ method: 'POST', url: BASE });
    expect(folderRequest.request.body).toEqual({ kind: 'FOLDER', parentId: undefined, name: 'Blog', slug: 'blog' });
    folderRequest.flush({ id: 'f1' });
    expect((await folder).id).toBe('f1');
  });

  it('update() patches name and slug', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('space-1', 'c1', { name: 'Home', slug: 'home' }));
    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/c1` });
    expect(request.request.body).toEqual({ name: 'Home', slug: 'home' });
    request.flush({});
    await done;
  });

  it('move() patches the parent folder, null for the root', async () => {
    const service = setup();
    const toRoot = firstValueFrom(service.move('space-1', 'c1', null));
    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/c1` });
    expect(request.request.body).toEqual({ parentId: null });
    request.flush({});
    await toRoot;

    const toFolder = firstValueFrom(service.move('space-1', 'c1', 'f1'));
    const folderRequest = http.expectOne({ method: 'PATCH', url: `${BASE}/c1` });
    expect(folderRequest.request.body).toEqual({ parentId: 'f1' });
    folderRequest.flush({});
    await toFolder;
  });

  it('updateData() puts the normalized data only (the server works out what it points to)', async () => {
    const service = setup();
    // A legacy block keyed by `schema`: normalizeContent stores it as `_schema`.
    const data = { _id: 'root', schema: 'page', title: 'Hi' };
    const done = firstValueFrom(service.updateData('space-1', 'd1', data as never));
    const request = http.expectOne({ method: 'PUT', url: `${BASE}/d1/data` });
    expect(request.request.body).toEqual({ data: { _id: 'root', _schema: 'page', title: 'Hi' } });
    request.flush({});
    await done;
  });

  it('clone() clones on the server and returns the copy', async () => {
    const service = setup();
    const result = firstValueFrom(service.clone('space-1', 'd1'));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/d1/clone` });
    request.flush({ id: 'd2' });
    expect((await result).id).toBe('d2');
  });

  it('remove() deletes the content', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('space-1', 'c1'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/c1` }).flush(null);
    await done;
  });

  it('publish() and unpublish() post to the content actions', async () => {
    const service = setup();
    const publish = firstValueFrom(service.publish('space-1', 'd1'));
    http.expectOne({ method: 'POST', url: `${BASE}/d1/publish` }).flush(null);
    await publish;

    const unpublish = firstValueFrom(service.unpublish('space-1', 'd1'));
    http.expectOne({ method: 'POST', url: `${BASE}/d1/unpublish` }).flush(null);
    await unpublish;
  });
});
