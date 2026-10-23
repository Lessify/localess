import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { multipartForm } from '@core/utils/multipart';
import { Page, Task, TaskCreate, TaskImportCreate, TaskKind } from '@localess/shared';
import { Observable, of } from 'rxjs';

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

  findOne(spaceId: string, id: string): Observable<Task> {
    return liveQueryWith(this.events, { spaceId, entities: ['tasks'], id }, () => this.http.get<Task>(`${this.base(spaceId)}/${id}`));
  }

  /** An export (or the asset metadata regeneration); the `create<Kind>Task` methods below fill the body. */
  create(spaceId: string, body: TaskCreate): Observable<Task> {
    return this.http.post<Task>(this.base(spaceId), body);
  }

  /** An import: the fields and the file, multipart; the `create<Kind>ImportTask` methods below fill the fields. */
  createImport(spaceId: string, fields: TaskImportCreate, file: File): Observable<Task> {
    return this.http.post<Task>(`${this.base(spaceId)}/import`, multipartForm(fields, file));
  }

  createAssetExportTask(spaceId: string, path?: string): Observable<Task> {
    return this.create(spaceId, path ? { kind: TaskKind.ASSET_EXPORT, path } : { kind: TaskKind.ASSET_EXPORT });
  }

  createAssetImportTask(spaceId: string, file: File): Observable<Task> {
    return this.createImport(spaceId, { kind: TaskKind.ASSET_IMPORT }, file);
  }

  createAssetRegenerateMetadataTask(spaceId: string): Observable<Task> {
    return this.create(spaceId, { kind: TaskKind.ASSET_REGEN_METADATA });
  }

  createContentExportTask(spaceId: string, path?: string): Observable<Task> {
    return this.create(spaceId, path ? { kind: TaskKind.CONTENT_EXPORT, path } : { kind: TaskKind.CONTENT_EXPORT });
  }

  createContentImportTask(spaceId: string, file: File): Observable<Task> {
    return this.createImport(spaceId, { kind: TaskKind.CONTENT_IMPORT }, file);
  }

  createSchemaExportTask(spaceId: string): Observable<Task> {
    return this.create(spaceId, { kind: TaskKind.SCHEMA_EXPORT });
  }

  createSchemaImportTask(spaceId: string, file: File): Observable<Task> {
    return this.createImport(spaceId, { kind: TaskKind.SCHEMA_IMPORT }, file);
  }

  createTranslationExportTask(spaceId: string, locale?: string): Observable<Task> {
    return this.create(spaceId, locale ? { kind: TaskKind.TRANSLATION_EXPORT, locale } : { kind: TaskKind.TRANSLATION_EXPORT });
  }

  /** With a locale the file is a flat JSON of that locale; otherwise a full export. */
  createTranslationImportTask(spaceId: string, file: File, locale?: string): Observable<Task> {
    return this.createImport(spaceId, { kind: TaskKind.TRANSLATION_IMPORT, locale: locale || undefined }, file);
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
