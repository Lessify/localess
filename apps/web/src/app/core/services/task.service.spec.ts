import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Task, TaskKind } from '@localess/shared';
import { TaskService } from './task.service';

const BASE = '/api/app/spaces/space-1/tasks';

describe('TaskService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(TaskService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads one page of the space tasks with the query given', async () => {
    const service = setup();
    const params = new HttpParams().set('page', 1).set('size', 20).append('status', 'ERROR').append('status', 'FINISHED');
    const result = firstValueFrom(service.findAll('space-1', params));
    const page = { items: [{ id: 't1' }], page: 1, size: 20, total: 21 };
    http.expectOne(`${BASE}?page=1&size=20&status=ERROR&status=FINISHED`).flush(page);
    expect(await result).toEqual(page);
  });

  it('findActive() reads the queued and running tasks of the kinds given', async () => {
    const service = setup();
    const result = firstValueFrom(service.findActive('space-1', [TaskKind.TRANSLATION_IMPORT, TaskKind.TRANSLATION_TRANSLATE]));
    http.expectOne(`${BASE}/active?kind=TRANSLATION_IMPORT&kind=TRANSLATION_TRANSLATE`).flush([{ id: 't1' }]);
    expect(await result).toEqual([{ id: 't1' }]);
  });

  it('findOne() reads one task', async () => {
    const service = setup();
    const result = firstValueFrom(service.findOne('space-1', 't1'));
    http.expectOne(`${BASE}/t1`).flush({ id: 't1' });
    expect(await result).toEqual({ id: 't1' });
  });

  async function expectExport(call: Observable<Task>, body: object) {
    const done = firstValueFrom(call);
    const request = http.expectOne({ method: 'POST', url: BASE });
    expect(request.request.body).toEqual(body);
    request.flush({ id: 'new-task' });
    expect((await done).id).toBe('new-task');
  }

  it('creators post the kind, and translate locale its params', async () => {
    const service = setup();
    await expectExport(service.createSchemaExport('space-1'), { kind: 'SCHEMA_EXPORT' });
    await expectExport(service.createTranslationExport('space-1'), { kind: 'TRANSLATION_EXPORT' });
    await expectExport(service.createAssetRegenerateMetadata('space-1'), { kind: 'ASSET_REGEN_METADATA' });
    const params = { sourceLocale: 'en', targetLocale: 'de', overwrite: false };
    await expectExport(service.createTranslationTranslate('space-1', params), {
      kind: 'TRANSLATION_TRANSLATE',
      params: { type: 'translation-translate', ...params },
    });
  });

  async function expectImport(call: Observable<Task>, fields: [string, string][]) {
    const done = firstValueFrom(call);
    const request = http.expectOne({ method: 'POST', url: `${BASE}/import` });
    const form = request.request.body as FormData;
    const entries: [string, FormDataEntryValue][] = [];
    form.forEach((value, key) => entries.push([key, value]));
    expect(entries.slice(0, -1)).toEqual(fields);
    expect(entries.at(-1)?.[0]).toBe('file');
    expect((entries.at(-1)?.[1] as File).name).toBe('data.json');
    request.flush({ id: 'new-task' });
    expect((await done).id).toBe('new-task');
  }

  it('import creators post multipart with the fields before the file', async () => {
    const service = setup();
    const file = new File(['{}'], 'data.json', { type: 'application/json' });
    await expectImport(service.createSchemaImport('space-1', file), [['kind', 'SCHEMA_IMPORT']]);
    await expectImport(service.createTranslationImport('space-1', file), [
      ['kind', 'TRANSLATION_IMPORT'],
      ['type', 'translation-full'],
    ]);
    await expectImport(service.createTranslationImport('space-1', file, 'de'), [
      ['kind', 'TRANSLATION_IMPORT'],
      ['type', 'translation-json-flat'],
      ['locale', 'de'],
    ]);
  });

  it("progress() follows one task's progress events, nothing else", () => {
    const service = setup();
    const seen: unknown[] = [];
    const subscription = service.progress('space-1', 't1').subscribe(it => seen.push(it));
    events.next({ spaceId: 'space-1', entity: 'tasks', id: 't2', op: 'progress', progress: { step: 'Writing', done: 9 } });
    events.next({ spaceId: 'space-1', entity: 'tasks', id: 't1', op: 'updated' });
    events.next({ spaceId: 'space-1', entity: 'tasks', id: 't1', op: 'progress', progress: { step: 'Writing', done: 3, total: 10 } });
    expect(seen).toEqual([{ step: 'Writing', done: 3, total: 10 }]);
    subscription.unsubscribe();
  });

  it('downloadUrl() resolves to the same-origin download endpoint', async () => {
    const service = setup();
    expect(await firstValueFrom(service.downloadUrl('space-1', 't1'))).toBe(`${BASE}/t1/download`);
  });

  it('remove() deletes the task', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('space-1', 't1'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/t1` }).flush(null);
    await done;
  });
});
