import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Task, TaskLog } from '../models/task.model';
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

  it('findAll() reads the space tasks', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAll('space-1'));
    http.expectOne(BASE).flush([{ id: 't1' }]);
    expect(await result).toEqual([{ id: 't1' }]);
  });

  it('findById() reads one task', async () => {
    const service = setup();
    const result = firstValueFrom(service.findById('space-1', 't1'));
    http.expectOne(`${BASE}/t1`).flush({ id: 't1' });
    expect(await result).toEqual({ id: 't1' });
  });

  it('findLogs() reads the task logs and refetches on log events of that task only', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: TaskLog[][] = [];
    const subscription = service.findLogs('space-1', 't1').subscribe(it => results.push(it));
    http.expectOne(`${BASE}/t1/logs`).flush([]);

    events.next({ spaceId: 'space-1', entity: 'task_logs', id: 't2', op: 'created' });
    events.next({ spaceId: 'space-1', entity: 'tasks', id: 't1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(`${BASE}/t1/logs`);

    events.next({ spaceId: 'space-1', entity: 'task_logs', id: 't1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${BASE}/t1/logs`).flush([{ id: '1' } as TaskLog]);
    expect(results).toEqual([[], [{ id: '1' }]]);
    subscription.unsubscribe();
  });

  async function expectExport(call: Observable<Task>, body: object) {
    const done = firstValueFrom(call);
    const request = http.expectOne({ method: 'POST', url: BASE });
    expect(request.request.body).toEqual(body);
    request.flush({ id: 'new-task' });
    expect((await done).id).toBe('new-task');
  }

  it('export creators post the kind with optional path or locale', async () => {
    const service = setup();
    await expectExport(service.createAssetExportTask('space-1'), { kind: 'ASSET_EXPORT' });
    await expectExport(service.createAssetExportTask('space-1', '/a'), { kind: 'ASSET_EXPORT', path: '/a' });
    await expectExport(service.createContentExportTask('space-1', '/c'), { kind: 'CONTENT_EXPORT', path: '/c' });
    await expectExport(service.createSchemaExportTask('space-1'), { kind: 'SCHEMA_EXPORT' });
    await expectExport(service.createTranslationExportTask('space-1'), { kind: 'TRANSLATION_EXPORT' });
    await expectExport(service.createTranslationExportTask('space-1', 'de'), { kind: 'TRANSLATION_EXPORT', locale: 'de' });
    await expectExport(service.createAssetRegenerateMetadataTask('space-1'), { kind: 'ASSET_REGEN_METADATA' });
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
    await expectImport(service.createAssetImportTask('space-1', file), [['kind', 'ASSET_IMPORT']]);
    await expectImport(service.createContentImportTask('space-1', file), [['kind', 'CONTENT_IMPORT']]);
    await expectImport(service.createSchemaImportTask('space-1', file), [['kind', 'SCHEMA_IMPORT']]);
    await expectImport(service.createTranslationImportTask('space-1', file), [['kind', 'TRANSLATION_IMPORT']]);
    await expectImport(service.createTranslationImportTask('space-1', file, 'de'), [
      ['kind', 'TRANSLATION_IMPORT'],
      ['locale', 'de'],
    ]);
  });

  it('downloadUrl() resolves to the same-origin download endpoint', async () => {
    const service = setup();
    expect(await firstValueFrom(service.downloadUrl('space-1', 't1'))).toBe(`${BASE}/t1/download`);
  });

  it('delete() deletes the task', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('space-1', 't1'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/t1` }).flush(null);
    await done;
  });
});
