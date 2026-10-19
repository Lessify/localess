import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { multipartForm } from '@core/utils/multipart';
import { Page, Task, TaskCreate, TaskImportCreate, TaskKind, TaskLog } from '@localess/shared';
import { Observable, of } from 'rxjs';

/** Export/import tasks of a space (`/api/app/spaces/:spaceId/tasks`); reads are live. */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/tasks`;
  }

  /** One page of the space's tasks (`PagedList.params()`: page, size, direction, search, kind, status). */
  findPage(spaceId: string, params: HttpParams): Observable<Page<Task>> {
    return liveQueryWith(this.events, { spaceId, entities: ['tasks'] }, () => this.http.get<Page<Task>>(this.base(spaceId), { params }));
  }

  findById(spaceId: string, id: string): Observable<Task> {
    return liveQueryWith(this.events, { spaceId, entities: ['tasks'], id }, () => this.http.get<Task>(`${this.base(spaceId)}/${id}`));
  }

  findLogs(spaceId: string, taskId: string): Observable<TaskLog[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['task_logs'], id: taskId }, () =>
      this.http.get<TaskLog[]>(`${this.base(spaceId)}/${taskId}/logs`),
    );
  }

  createAssetExportTask(spaceId: string, path?: string): Observable<Task> {
    return this.createExport(spaceId, path ? { kind: TaskKind.ASSET_EXPORT, path } : { kind: TaskKind.ASSET_EXPORT });
  }

  createAssetImportTask(spaceId: string, file: File): Observable<Task> {
    return this.createImport(spaceId, TaskKind.ASSET_IMPORT, file);
  }

  createAssetRegenerateMetadataTask(spaceId: string): Observable<Task> {
    return this.createExport(spaceId, { kind: TaskKind.ASSET_REGEN_METADATA });
  }

  createContentExportTask(spaceId: string, path?: string): Observable<Task> {
    return this.createExport(spaceId, path ? { kind: TaskKind.CONTENT_EXPORT, path } : { kind: TaskKind.CONTENT_EXPORT });
  }

  createContentImportTask(spaceId: string, file: File): Observable<Task> {
    return this.createImport(spaceId, TaskKind.CONTENT_IMPORT, file);
  }

  createSchemaExportTask(spaceId: string): Observable<Task> {
    return this.createExport(spaceId, { kind: TaskKind.SCHEMA_EXPORT });
  }

  createSchemaImportTask(spaceId: string, file: File): Observable<Task> {
    return this.createImport(spaceId, TaskKind.SCHEMA_IMPORT, file);
  }

  createTranslationExportTask(spaceId: string, locale?: string): Observable<Task> {
    return this.createExport(spaceId, locale ? { kind: TaskKind.TRANSLATION_EXPORT, locale } : { kind: TaskKind.TRANSLATION_EXPORT });
  }

  /** With a locale the file is a flat JSON of that locale; otherwise a full export. */
  createTranslationImportTask(spaceId: string, file: File, locale?: string): Observable<Task> {
    return this.createImport(spaceId, TaskKind.TRANSLATION_IMPORT, file, locale);
  }

  /** Same-origin and cookie-authenticated, so the URL can be opened directly. */
  downloadUrl(spaceId: string, id: string): Observable<string> {
    return of(`${this.base(spaceId)}/${id}/download`);
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }

  private createExport(spaceId: string, body: TaskCreate): Observable<Task> {
    return this.http.post<Task>(this.base(spaceId), body);
  }

  private createImport(spaceId: string, kind: TaskImportCreate['kind'], file: File, locale?: string): Observable<Task> {
    const fields: TaskImportCreate = { kind, locale: locale || undefined };
    return this.http.post<Task>(`${this.base(spaceId)}/import`, multipartForm(fields, file));
  }
}
