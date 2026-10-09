import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Task, TaskKind, TaskLog } from '@localess/shared';
import { Observable, of } from 'rxjs';

/** Export/import tasks of a space (`/api/app/spaces/:spaceId/tasks`); reads are live. */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/tasks`;
  }

  findAll(spaceId: string): Observable<Task[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['tasks'] }, () => this.http.get<Task[]>(this.base(spaceId)));
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

  private createExport(spaceId: string, body: { kind: TaskKind; path?: string; locale?: string }): Observable<Task> {
    return this.http.post<Task>(this.base(spaceId), body);
  }

  private createImport(spaceId: string, kind: TaskKind, file: File, locale?: string): Observable<Task> {
    // The server reads the fields from the parts preceding the file, so they must come first.
    const form = new FormData();
    form.append('kind', kind);
    if (locale) {
      form.append('locale', locale);
    }
    form.append('file', file, file.name);
    return this.http.post<Task>(`${this.base(spaceId)}/import`, form);
  }
}
