import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { multipartForm } from '@core/utils/multipart';
import { Page, Task, TaskCreate, TaskImportCreate, TaskKind, TaskProgress, TranslationTranslateParams } from '@localess/shared';
import { filter, map, Observable, of } from 'rxjs';

/**
 * Export/import tasks of a space (`/api/app/spaces/:spaceId/tasks`, the server's `TaskController`); reads are live.
 * Their logs: `TaskLogService`.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/tasks`;
  }

  /** One page of the space's tasks (`PagedList.params()`: page, size, direction, search, kind, status). */
  findAll(spaceId: string, params: HttpParams): Observable<Page<Task>> {
    return liveQueryWith(this.events, { spaceId, entities: ['tasks'] }, () => this.http.get<Page<Task>>(this.base(spaceId), { params }));
  }

  /**
   * The space's queued and running tasks of `kinds`, oldest first, with the running one's latest progress: every role
   * reads them (no file). Live: read again when a task is created, claimed, ends or is deleted.
   */
  findActive(spaceId: string, kinds: readonly TaskKind[]): Observable<Task[]> {
    const params = new HttpParams({ fromObject: { kind: [...kinds] } });
    return liveQueryWith(this.events, { spaceId, entities: ['tasks'] }, () =>
      this.http.get<Task[]>(`${this.base(spaceId)}/active`, { params }),
    );
  }

  findOne(spaceId: string, id: string): Observable<Task> {
    return liveQueryWith(this.events, { spaceId, entities: ['tasks'], id }, () => this.http.get<Task>(`${this.base(spaceId)}/${id}`));
  }

  /** A task without an upload; the `create<Kind>` methods below fill the body. */
  create(spaceId: string, body: TaskCreate): Observable<Task> {
    return this.http.post<Task>(this.base(spaceId), body);
  }

  /** An import: the fields and the file, multipart; the `create<Kind>Import` methods below fill the fields. */
  createImport(spaceId: string, fields: TaskImportCreate, file: File): Observable<Task> {
    return this.http.post<Task>(`${this.base(spaceId)}/import`, multipartForm(fields, file));
  }

  createAssetRegenerateMetadata(spaceId: string): Observable<Task> {
    return this.create(spaceId, { kind: TaskKind.ASSET_REGEN_METADATA });
  }

  createSchemaExport(spaceId: string): Observable<Task> {
    return this.create(spaceId, { kind: TaskKind.SCHEMA_EXPORT });
  }

  /** A `.localess.zip` (or an old `.lls.zip`). */
  createSchemaImport(spaceId: string, file: File): Observable<Task> {
    return this.createImport(spaceId, { kind: TaskKind.SCHEMA_IMPORT }, file);
  }

  /** Every key as a `.localess.zip` (one locale as key-value JSON is a direct download: `TranslationService`). */
  createTranslationExport(spaceId: string): Observable<Task> {
    return this.create(spaceId, { kind: TaskKind.TRANSLATION_EXPORT });
  }

  /** With a locale the file is a key-value JSON of that locale; otherwise a `.localess.zip` (or an old `.llt.zip`). */
  createTranslationImport(spaceId: string, file: File, locale?: string): Observable<Task> {
    const fields: TaskImportCreate = locale
      ? { kind: TaskKind.TRANSLATION_IMPORT, type: 'translation-json-flat', locale }
      : { kind: TaskKind.TRANSLATION_IMPORT, type: 'translation-full' };
    return this.createImport(spaceId, fields, file);
  }

  /** Machine-translates a locale into another, as a task. */
  createTranslationTranslate(spaceId: string, params: Omit<TranslationTranslateParams, 'type'>): Observable<Task> {
    return this.create(spaceId, { kind: TaskKind.TRANSLATION_TRANSLATE, params: { type: 'translation-translate', ...params } });
  }

  /** One task's progress, live, from the space's change events (published by the worker, never stored). */
  progress(spaceId: string, id: string): Observable<TaskProgress> {
    return this.spaceProgress(spaceId).pipe(
      filter(it => it.id === id),
      map(it => it.progress),
    );
  }

  /** The progress of every running task of the space, as the worker publishes it. */
  spaceProgress(spaceId: string): Observable<{ id: string; progress: TaskProgress }> {
    return this.events.changes(spaceId).pipe(
      filter(event => event.entity === 'tasks' && event.op === 'progress' && !!event.id && !!event.progress),
      map(event => ({ id: event.id!, progress: event.progress! })),
    );
  }

  /**
   * The URL of `TaskController.download`, not a request: same-origin and cookie-authenticated, so the URL can be opened
   * directly.
   */
  downloadUrl(spaceId: string, id: string): Observable<string> {
    return of(`${this.base(spaceId)}/${id}/download`);
  }

  remove(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }
}
