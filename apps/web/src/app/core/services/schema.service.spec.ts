import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Schema, SchemaType, SchemaUpdate } from '@localess/shared';
import { SchemaService } from './schema.service';

describe('SchemaService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SchemaService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads the space schemas, filtered by type when given', async () => {
    const service = setup();
    const all = firstValueFrom(service.findAll('space-1'));
    http.expectOne('/api/app/spaces/space-1/schemas').flush([{ id: 's1' }]);
    expect(await all).toEqual([{ id: 's1' }]);

    const roots = firstValueFrom(service.findAll('space-1', SchemaType.ROOT));
    http.expectOne('/api/app/spaces/space-1/schemas?type=ROOT').flush([]);
    expect(await roots).toEqual([]);
  });

  it('findAll() refetches when a schema of the space changes, ignoring other entities', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Schema[][] = [];
    const subscription = service.findAll('space-1').subscribe(it => results.push(it));
    http.expectOne('/api/app/spaces/space-1/schemas').flush([]);

    events.next({ spaceId: 'space-1', entity: 'contents', id: 'c', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone('/api/app/spaces/space-1/schemas');

    events.next({ spaceId: 'space-1', entity: 'schemas', id: 'page', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne('/api/app/spaces/space-1/schemas').flush([{ id: 'page' } as Schema]);
    expect(results).toEqual([[], [{ id: 'page' }]]);
    subscription.unsubscribe();
  });

  it('findOne() reads one schema', async () => {
    const service = setup();
    const result = firstValueFrom(service.findOne('space-1', 'page'));
    http.expectOne('/api/app/spaces/space-1/schemas/page').flush({ id: 'page' });
    expect(await result).toEqual({ id: 'page' });
  });

  it('create() posts name, type and display name', async () => {
    const service = setup();
    const done = firstValueFrom(service.create('space-1', { name: 'page', type: SchemaType.ROOT, displayName: 'Page' }));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces/space-1/schemas' });
    expect(request.request.body).toEqual({ name: 'page', type: 'ROOT', displayName: 'Page' });
    request.flush({});
    await done;
  });

  it('findUsage() reads what uses the schema by name', async () => {
    const service = setup();
    const usage = firstValueFrom(service.findUsage('space-1', 'uuid-1'));
    const body = { fields: [{ schema: 'page', field: 'items' }], contents: { count: 1, first: [{ name: 'Home', fullSlug: 'home' }] } };
    http.expectOne('/api/app/spaces/space-1/schemas/uuid-1/usage').flush(body);
    expect(await usage).toEqual(body);
  });

  it('rename() renames on the server, addressing the schema by id', async () => {
    const service = setup();
    const done = firstValueFrom(service.rename('space-1', 'uuid-1', 'new'));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/space-1/schemas/uuid-1/name' });
    expect(request.request.body).toEqual({ name: 'new' });
    request.flush({});
    await done;
  });

  it('update() replaces the settings, sending a copy without empty values and leaving the given body as it was', async () => {
    const service = setup();
    const body = {
      displayName: 'Page',
      description: undefined,
      previewField: null,
      fields: [{ name: 'title', kind: 'TEXT', minLength: null }],
    } as unknown as SchemaUpdate;
    const before = structuredClone(body);
    const done = firstValueFrom(service.update('space-1', 'page', body));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/space-1/schemas/page' });
    expect(request.request.body).toEqual({ displayName: 'Page', fields: [{ name: 'title', kind: 'TEXT' }] });
    request.flush({ id: 'page' });
    expect(await done).toEqual({ id: 'page' });
    expect(body).toEqual(before);
  });

  it('remove() deletes the schema', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('space-1', 'page'));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/space-1/schemas/page' }).flush(null);
    await done;
  });
});
