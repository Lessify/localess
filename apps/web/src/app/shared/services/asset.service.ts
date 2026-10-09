import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Asset, AssetFile, AssetFileType, AssetFolder, AssetKind } from '@localess/shared';
import { AssetFileImport, AssetFileUpdateForm, AssetFolderCreate, AssetFolderUpdateForm } from '@shared/models/asset.model';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/** MIME type prefixes the server filters files by (folders are always kept). */
const MIME_PREFIX: Partial<Record<AssetFileType, string>> = {
  [AssetFileType.AUDIO]: 'audio/',
  [AssetFileType.TEXT]: 'text/',
  [AssetFileType.IMAGE]: 'image/',
  [AssetFileType.VIDEO]: 'video/',
  [AssetFileType.APPLICATION]: 'application/',
};

/** Asset library of a space (`/api/app/spaces/:spaceId/assets`); reads are live. */
@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/assets`;
  }

  private list<T extends Asset>(spaceId: string, params: HttpParams): Observable<T[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () => this.http.get<T[]>(this.base(spaceId), { params }));
  }

  private byName(name: string, max: number, kind?: AssetKind): HttpParams {
    let params = new HttpParams().set('name', name);
    if (kind) params = params.set('kind', kind);
    return params.set('limit', max);
  }

  /** Children of `parentPath` (root when empty), folders first then by name; files narrowed by `fileType`. */
  findAll(spaceId: string, parentPath?: string, fileType?: AssetFileType): Observable<Asset[]> {
    let params = new HttpParams().set('parentPath', parentPath ?? '');
    const prefix = fileType && MIME_PREFIX[fileType];
    if (prefix) params = params.set('fileType', prefix);
    return this.list(spaceId, params);
  }

  countAll(spaceId: string, kind?: AssetKind): Observable<number> {
    const params = kind ? new HttpParams().set('kind', kind) : undefined;
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () =>
      this.http.get<{ count: number }>(`${this.base(spaceId)}/count`, { params }),
    ).pipe(map(it => it.count));
  }

  findAllByName(spaceId: string, name: string, max = 20): Observable<Asset[]> {
    return this.list(spaceId, this.byName(name, max));
  }

  findById(spaceId: string, id: string): Observable<Asset> {
    return liveQueryWith(this.events, { spaceId, entities: ['assets'], id }, () => this.http.get<Asset>(`${this.base(spaceId)}/${id}`));
  }

  findByIds(spaceId: string, ids: string[]): Observable<Asset[]> {
    if (ids.length === 0) return of([]);
    return this.list(spaceId, new HttpParams().set('ids', ids.join(',')));
  }

  findAllFilesByName(spaceId: string, name: string, max = 20): Observable<AssetFile[]> {
    return this.list(spaceId, this.byName(name, max, AssetKind.FILE));
  }

  findAllFoldersByName(spaceId: string, name: string, max = 20): Observable<AssetFolder[]> {
    return this.list(spaceId, this.byName(name, max, AssetKind.FOLDER));
  }

  /** Downloads `entity.url` in the browser and uploads it as a new file. */
  importFile(spaceId: string, parentPath: string, entity: AssetFileImport): Observable<AssetFile> {
    return this.http.get(entity.url, { responseType: 'blob' }).pipe(
      switchMap(blob => {
        const form = new FormData();
        form.append('parentPath', parentPath);
        form.append('name', entity.name);
        form.append('extension', entity.extension);
        if (entity.alt) form.append('alt', entity.alt);
        if (entity.source) form.append('source', entity.source);
        // A File (not a Blob plus filename): some FormData implementations drop the filename argument.
        form.append('file', new File([blob], `${entity.name}${entity.extension}`, { type: blob.type }));
        return this.upload(spaceId, form);
      }),
    );
  }

  /** Name and extension are taken from the file name server-side. */
  createFile(spaceId: string, parentPath: string, entity: File): Observable<AssetFile> {
    const form = new FormData();
    // Fields must precede the file part.
    form.append('parentPath', parentPath);
    form.append('file', entity, entity.name);
    return this.upload(spaceId, form);
  }

  private upload(spaceId: string, form: FormData): Observable<AssetFile> {
    return this.http.post<AssetFile>(`${this.base(spaceId)}/files`, form);
  }

  createFolder(spaceId: string, parentPath: string, entity: AssetFolderCreate): Observable<AssetFolder> {
    return this.http.post<AssetFolder>(`${this.base(spaceId)}/folders`, { parentPath, name: entity.name });
  }

  updateFolder(spaceId: string, id: string, entity: AssetFolderUpdateForm): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { name: entity.name });
  }

  updateFile(spaceId: string, id: string, entity: AssetFileUpdateForm): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { name: entity.name, alt: entity.alt || '' });
  }

  /** `parentPath` '~' is the root. */
  move(spaceId: string, id: string, parentPath: string): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}/parent`, { parentPath: parentPath === '~' ? '' : parentPath });
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }
}
