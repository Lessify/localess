import { provideHttpClient } from '@angular/common/http';
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

  it('findAll() lists the children of a parent slug, the root by default', async () => {
    const service = setup();
    const root = firstValueFrom(service.findAll('space-1'));
    http.expectOne(`${BASE}?parentSlug=`).flush([{ id: 'c1' }]);
    expect(await root).toEqual([{ id: 'c1' }]);

    const nested = firstValueFrom(service.findAll('space-1', 'blog/posts'));
    http.expectOne(`${BASE}?parentSlug=blog/posts`).flush([]);
    expect(await nested).toEqual([]);
  });

  it('findAll() refetches when a content of the space changes, ignoring other entities', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Content[][] = [];
    const subscription = service.findAll('space-1').subscribe(it => results.push(it));
    http.expectOne(`${BASE}?parentSlug=`).flush([]);

    events.next({ spaceId: 'space-1', entity: 'assets', id: 'a', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(`${BASE}?parentSlug=`);

    events.next({ spaceId: 'space-1', entity: 'contents', id: 'c1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${BASE}?parentSlug=`).flush([{ id: 'c1' } as Content]);
    expect(results).toEqual([[], [{ id: 'c1' }]]);
    subscription.unsubscribe();
  });

  it('countAll() reads the count, filtered by kind when given', async () => {
    const service = setup();
    const all = firstValueFrom(service.countAll('space-1'));
    http.expectOne(`${BASE}/count`).flush({ count: 7 });
    expect(await all).toBe(7);

    const documents = firstValueFrom(service.countAll('space-1', ContentKind.DOCUMENT));
    http.expectOne(`${BASE}/count?kind=DOCUMENT`).flush({ count: 3 });
    expect(await documents).toBe(3);
  });

  it('findAllDocuments() lists documents only', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAllDocuments('space-1'));
    http.expectOne(`${BASE}?kind=DOCUMENT`).flush([{ id: 'd1' }]);
    expect(await result).toEqual([{ id: 'd1' }]);
  });

  it('findAll*ByName() search by name prefix with kind and limit', async () => {
    const service = setup();
    const any = firstValueFrom(service.findAllByName('space-1', 'Ho'));
    http.expectOne(`${BASE}?name=Ho&limit=20`).flush([]);
    await any;

    const documents = firstValueFrom(service.findAllDocumentsByName('space-1', 'Ho', 5));
    http.expectOne(`${BASE}?name=Ho&kind=DOCUMENT&limit=5`).flush([]);
    await documents;

    const folders = firstValueFrom(service.findAllFoldersByName('space-1', 'Ho'));
    http.expectOne(`${BASE}?name=Ho&kind=FOLDER&limit=20`).flush([{ id: 'f1' }]);
    expect(await folders).toEqual([{ id: 'f1' }]);
  });

  it('findById() and findDocumentById() read one content', async () => {
    const service = setup();
    const content = firstValueFrom(service.findById('space-1', 'c1'));
    http.expectOne(`${BASE}/c1`).flush({ id: 'c1' });
    expect(await content).toEqual({ id: 'c1' });

    const document = firstValueFrom(service.findDocumentById('space-1', 'd1'));
    http.expectOne(`${BASE}/d1`).flush({ id: 'd1', data: { _id: 'x' } });
    expect(await document).toEqual({ id: 'd1', data: { _id: 'x' } });
  });

  it('findByIds() lists the given ids, without a request when there are none', async () => {
    const service = setup();
    const result = firstValueFrom(service.findByIds('space-1', ['a', 'b']));
    http.expectOne(`${BASE}?ids=a,b`).flush([{ id: 'a' }, { id: 'b' }]);
    expect(await result).toEqual([{ id: 'a' }, { id: 'b' }]);

    expect(await firstValueFrom(service.findByIds('space-1', []))).toEqual([]);
  });

  it('createDocument() and createFolder() post the new content and return it', async () => {
    const service = setup();
    const document = firstValueFrom(service.createDocument('space-1', 'blog', { name: 'Home', slug: 'home', schema: 'page' }));
    const request = http.expectOne({ method: 'POST', url: BASE });
    expect(request.request.body).toEqual({ kind: 'DOCUMENT', parentSlug: 'blog', name: 'Home', slug: 'home', schema: 'page' });
    request.flush({ id: 'd1' });
    expect((await document).id).toBe('d1');

    const folder = firstValueFrom(service.createFolder('space-1', '', { name: 'Blog', slug: 'blog' }));
    const folderRequest = http.expectOne({ method: 'POST', url: BASE });
    expect(folderRequest.request.body).toEqual({ kind: 'FOLDER', parentSlug: '', name: 'Blog', slug: 'blog' });
    folderRequest.flush({ id: 'f1' });
    expect((await folder).id).toBe('f1');
  });

  it('update() patches name, slug and parent slug', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('space-1', 'c1', 'blog', { name: 'Home', slug: 'home' }));
    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/c1` });
    expect(request.request.body).toEqual({ name: 'Home', slug: 'home', parentSlug: 'blog' });
    request.flush({});
    await done;
  });

  it('move() patches the parent slug, mapping "~" to the root', async () => {
    const service = setup();
    const toRoot = firstValueFrom(service.move('space-1', 'c1', '~', 'home'));
    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/c1` });
    expect(request.request.body).toEqual({ parentSlug: '', slug: 'home' });
    request.flush({});
    await toRoot;

    const toFolder = firstValueFrom(service.move('space-1', 'c1', 'blog', 'home'));
    const folderRequest = http.expectOne({ method: 'PATCH', url: `${BASE}/c1` });
    expect(folderRequest.request.body).toEqual({ parentSlug: 'blog', slug: 'home' });
    folderRequest.flush({});
    await toFolder;
  });

  it('updateDocumentData() puts the normalized data as an object with its references', async () => {
    const service = setup();
    // A legacy block keyed by `schema`: normalizeContent stores it as `_schema`.
    const data = { _id: 'root', schema: 'page', title: 'Hi' };
    const done = firstValueFrom(service.updateDocumentData('space-1', 'd1', data as never, [new Set(['a1']), new Set(['l1']), new Set()]));
    const request = http.expectOne({ method: 'PUT', url: `${BASE}/d1/data` });
    expect(request.request.body).toEqual({
      data: { _id: 'root', _schema: 'page', title: 'Hi' },
      assets: ['a1'],
      links: ['l1'],
      references: [],
    });
    request.flush({});
    await done;
  });

  it('cloneDocument() clones on the server and returns the copy', async () => {
    const service = setup();
    const result = firstValueFrom(service.cloneDocument('space-1', { id: 'd1' } as ContentDocument));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/d1/clone` });
    request.flush({ id: 'd2' });
    expect((await result).id).toBe('d2');
  });

  it('delete() deletes the content', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('space-1', { id: 'c1' } as Content));
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
