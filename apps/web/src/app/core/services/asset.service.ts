import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { multipartForm } from '@core/utils/multipart';
import {
  Asset,
  AssetFile,
  AssetFileType,
  AssetFolder,
  AssetFolderCreate,
  AssetFolderSummary,
  AssetKind,
  AssetMove,
  AssetUpdate,
  AssetUpload,
  Page,
  PAGE_SIZE_MAX,
} from '@localess/shared';
import { AssetFileImport, AssetFileUpdateForm, AssetFolderCreateForm, AssetFolderUpdateForm } from '@shared/models/asset.model';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/** Asset library of a space (`/api/app/spaces/:spaceId/assets`); reads are live. */
@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/assets`;
  }

  /**
   * Every page of the list (`GET …/assets` is paged), live. For now: the Assets page and the picker page in the browser,
   * and the Asset fields read their files by id; they move to the paged list and to a light list in `SpaceStore`.
   */
  private list<T extends Asset>(spaceId: string, params: HttpParams): Observable<T[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () => this.everyPage<T>(spaceId, params));
  }

  private everyPage<T extends Asset>(spaceId: string, params: HttpParams, page = 0): Observable<T[]> {
    return this.http
      .get<Page<T>>(this.base(spaceId), { params: params.set('page', page).set('size', PAGE_SIZE_MAX) })
      .pipe(
        switchMap(answer =>
          (page + 1) * answer.size >= answer.total
            ? of(answer.items)
            : this.everyPage<T>(spaceId, params, page + 1).pipe(map(rest => [...answer.items, ...rest])),
        ),
      );
  }

  /** The first `max` assets whose name contains `search`, anywhere in the space, live. */
  private search<T extends Asset>(spaceId: string, search: string, max: number, kind?: AssetKind): Observable<T[]> {
    let params = new HttpParams().set('search', search).set('deep', true).set('size', max);
    if (kind) params = params.set('kind', kind);
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () =>
      this.http.get<Page<T>>(this.base(spaceId), { params }).pipe(map(it => it.items)),
    );
  }

  /** Children of folder `parentId` (the root when absent), folders first then by name; files narrowed by `fileType`. */
  findAll(spaceId: string, parentId?: string, fileType?: AssetFileType): Observable<Asset[]> {
    let params = new HttpParams();
    if (parentId) params = params.set('parentId', parentId);
    if (fileType && fileType !== AssetFileType.ANY) params = params.set('fileType', fileType);
    return this.list(spaceId, params);
  }

  countAll(spaceId: string, kind?: AssetKind): Observable<number> {
    const params = kind ? new HttpParams().set('kind', kind) : undefined;
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () =>
      this.http.get<{ count: number }>(`${this.base(spaceId)}/count`, { params }),
    ).pipe(map(it => it.count));
  }

  findAllByName(spaceId: string, name: string, max = 20): Observable<Asset[]> {
    return this.search(spaceId, name, max);
  }

  findById(spaceId: string, id: string): Observable<Asset> {
    return liveQueryWith(this.events, { spaceId, entities: ['assets'], id }, () => this.http.get<Asset>(`${this.base(spaceId)}/${id}`));
  }

  findByIds(spaceId: string, ids: string[]): Observable<Asset[]> {
    if (ids.length === 0) return of([]);
    return this.list(spaceId, new HttpParams().set('ids', ids.join(',')));
  }

  findAllFilesByName(spaceId: string, name: string, max = 20): Observable<AssetFile[]> {
    return this.search(spaceId, name, max, AssetKind.FILE);
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
        const fields: AssetUpload = {
          parentId: parentId ?? '',
          name: entity.name,
          extension: entity.extension,
          alt: entity.alt || undefined,
          source: entity.source || undefined,
        };
        // A File (not a Blob plus filename): some FormData implementations drop the filename argument.
        return this.upload(spaceId, multipartForm(fields, new File([blob], `${entity.name}${entity.extension}`, { type: blob.type })));
      }),
    );
  }

  /** Name and extension are taken from the file name server-side. */
  createFile(spaceId: string, parentId: string | undefined, entity: File): Observable<AssetFile> {
    const fields: AssetUpload = { parentId: parentId ?? '' };
    return this.upload(spaceId, multipartForm(fields, entity));
  }

  private upload(spaceId: string, form: FormData): Observable<AssetFile> {
    return this.http.post<AssetFile>(`${this.base(spaceId)}/files`, form);
  }

  /** `parentId` absent: the root. */
  createFolder(spaceId: string, parentId: string | undefined, entity: AssetFolderCreateForm): Observable<AssetFolder> {
    return this.http.post<AssetFolder>(`${this.base(spaceId)}/folders`, { parentId, name: entity.name } satisfies AssetFolderCreate);
  }

  updateFolder(spaceId: string, id: string, entity: AssetFolderUpdateForm): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { name: entity.name } satisfies AssetUpdate);
  }

  updateFile(spaceId: string, id: string, entity: AssetFileUpdateForm): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { name: entity.name, alt: entity.alt || '' } satisfies AssetUpdate);
  }

  /** Into folder `parentId`; `null`: the root. */
  move(spaceId: string, id: string, parentId: string | null): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}/parent`, { parentId } satisfies AssetMove);
  }

  /** How many contents use the asset (a folder: any file under it). */
  usage(spaceId: string, id: string): Observable<{ contents: number }> {
    return this.http.get<{ contents: number }>(`${this.base(spaceId)}/${id}/usage`);
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }
}
