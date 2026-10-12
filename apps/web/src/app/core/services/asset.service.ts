import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Asset, AssetFile, AssetFileType, AssetFolder, AssetFolderSummary, AssetKind } from '@localess/shared';
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

  /** Children of folder `parentId` (the root when absent), folders first then by name; files narrowed by `fileType`. */
  findAll(spaceId: string, parentId?: string, fileType?: AssetFileType): Observable<Asset[]> {
    let params = new HttpParams().set('parentId', parentId ?? '');
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

  /** Every folder of the space, live: the editor's folder map (breadcrumbs, move targets). */
  findAllFolders(spaceId: string): Observable<AssetFolderSummary[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () =>
      this.http.get<AssetFolderSummary[]>(`${this.base(spaceId)}/folders`),
    );
  }

  /** Downloads `entity.url` in the browser and uploads it as a new file. */
  /** `parentId` absent: the root. */
  importFile(spaceId: string, parentId: string | undefined, entity: AssetFileImport): Observable<AssetFile> {
    return this.http.get(entity.url, { responseType: 'blob' }).pipe(
      switchMap(blob => {
        const form = new FormData();
        form.append('parentId', parentId ?? '');
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
  createFile(spaceId: string, parentId: string | undefined, entity: File): Observable<AssetFile> {
    const form = new FormData();
    // Fields must precede the file part.
    form.append('parentId', parentId ?? '');
    form.append('file', entity, entity.name);
    return this.upload(spaceId, form);
  }

  private upload(spaceId: string, form: FormData): Observable<AssetFile> {
    return this.http.post<AssetFile>(`${this.base(spaceId)}/files`, form);
  }

  /** `parentId` absent: the root. */
  createFolder(spaceId: string, parentId: string | undefined, entity: AssetFolderCreate): Observable<AssetFolder> {
    return this.http.post<AssetFolder>(`${this.base(spaceId)}/folders`, { parentId, name: entity.name });
  }

  updateFolder(spaceId: string, id: string, entity: AssetFolderUpdateForm): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { name: entity.name });
  }

  updateFile(spaceId: string, id: string, entity: AssetFileUpdateForm): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { name: entity.name, alt: entity.alt || '' });
  }

  /** Into folder `parentId`; `null`: the root. */
  move(spaceId: string, id: string, parentId: string | null): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}/parent`, { parentId });
  }

  /** How many contents use the asset (a folder: any file under it). */
  usage(spaceId: string, id: string): Observable<{ contents: number }> {
    return this.http.get<{ contents: number }>(`${this.base(spaceId)}/${id}/usage`);
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }
}
