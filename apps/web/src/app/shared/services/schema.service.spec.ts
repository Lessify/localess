import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Schema, SchemaType } from '@localess/shared';
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

  it('findById() reads one schema', async () => {
    const service = setup();
    const result = firstValueFrom(service.findById('space-1', 'page'));
    http.expectOne('/api/app/spaces/space-1/schemas/page').flush({ id: 'page' });
    expect(await result).toEqual({ id: 'page' });
  });

  it('create() posts id, type and display name', async () => {
    const service = setup();
    const done = firstValueFrom(service.create('space-1', { id: 'page', type: SchemaType.ROOT, displayName: 'Page' } as never));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces/space-1/schemas' });
    expect(request.request.body).toEqual({ id: 'page', type: 'ROOT', displayName: 'Page' });
    request.flush({});
    await done;
  });

  it('updateId() renames on the server', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateId('space-1', { id: 'old' } as Schema, 'new'));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/space-1/schemas/old/id' });
    expect(request.request.body).toEqual({ id: 'new' });
    request.flush({});
    await done;
  });

  it('updateComponent() and updateEnum() replace the editable fields, dropping null/undefined ones', async () => {
    const service = setup();
    const component = firstValueFrom(
      service.updateComponent('space-1', 'page', { displayName: 'Page', description: undefined, fields: [] } as never),
    );
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/space-1/schemas/page' });
    expect(request.request.body).toEqual({ displayName: 'Page', fields: [] });
    request.flush({});
    await component;

    const enumUpdate = firstValueFrom(service.updateEnum('space-1', 'colors', { values: [{ name: 'Red', value: 'red' }] } as never));
    const enumRequest = http.expectOne({ method: 'PUT', url: '/api/app/spaces/space-1/schemas/colors' });
    expect(enumRequest.request.body).toEqual({ values: [{ name: 'Red', value: 'red' }] });
    enumRequest.flush({});
    await enumUpdate;
  });

  it('delete() deletes the schema', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('space-1', 'page'));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/space-1/schemas/page' }).flush(null);
    await done;
  });
});
