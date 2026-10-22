import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { multipartForm } from '@core/utils/multipart';
import {
  Asset,
  AssetFile,
  AssetFileSummary,
  AssetFolder,
  AssetFolderCreate,
  AssetFolderSummary,
  AssetUpdate,
  AssetUpload,
  Page,
} from '@localess/shared';
import { AssetFileImport, AssetFolderCreateForm } from '@shared/models/asset.model';
import { Observable } from 'rxjs';
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
   * One page of the list (`GET …/assets`, folders first), live: the folder (`parentId`, absent: the root), `deep`,
   * `fileType`, `search`, the sort and the page come from a `FolderList`.
   */
  findPage(spaceId: string, params: HttpParams): Observable<Page<Asset>> {
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () => this.http.get<Page<Asset>>(this.base(spaceId), { params }));
  }

  /** Every folder of the space, live: `SpaceStore` holds it (breadcrumbs, paths, move targets). */
  findAllFolders(spaceId: string): Observable<AssetFolderSummary[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () =>
      this.http.get<AssetFolderSummary[]>(`${this.base(spaceId)}/folders`),
    );
  }

  /** Every file of the space, light, live: `SpaceStore` holds it for the Asset and Assets fields. */
  findAllFiles(spaceId: string): Observable<AssetFileSummary[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () =>
      this.http.get<AssetFileSummary[]>(`${this.base(spaceId)}/files`),
    );
  }

  /** The first `max` assets whose name contains `search`, anywhere in the space, live. */
  search(spaceId: string, search: string, max = 20): Observable<Asset[]> {
    const params = new HttpParams().set('search', search).set('deep', true).set('size', max);
    return liveQueryWith(this.events, { spaceId, entities: ['assets'] }, () =>
      this.http.get<Page<Asset>>(this.base(spaceId), { params }).pipe(map(it => it.items)),
    );
  }

  /** How many contents use the asset (a folder: any file under it). */
  findUsage(spaceId: string, assetId: string): Observable<{ contents: number }> {
    return this.http.get<{ contents: number }>(`${this.base(spaceId)}/${assetId}/usage`);
  }

  /** `parentId` absent: the root. */
  createFolder(spaceId: string, parentId: string | undefined, entity: AssetFolderCreateForm): Observable<AssetFolder> {
    return this.http.post<AssetFolder>(`${this.base(spaceId)}/folders`, { parentId, name: entity.name } satisfies AssetFolderCreate);
  }

  /** Name and extension are taken from the file name server-side. */
  createFile(spaceId: string, parentId: string | undefined, entity: File): Observable<AssetFile> {
    const fields: AssetUpload = { parentId: parentId ?? '' };
    return this.upload(spaceId, multipartForm(fields, entity));
  }

  /** Downloads `entity.url` in the browser and uploads it as a new file; `parentId` absent: the root. */
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

  private upload(spaceId: string, form: FormData): Observable<AssetFile> {
    return this.http.post<AssetFile>(`${this.base(spaceId)}/files`, form);
  }

  /** Name (and alt for a file: empty removes it) and/or the folder (`parentId`); answers the asset as stored. */
  update(spaceId: string, assetId: string, entity: AssetUpdate): Observable<Asset> {
    return this.http.patch<Asset>(`${this.base(spaceId)}/${assetId}`, entity);
  }

  /** Into folder `parentId`; `null`: the root. A folder moves with everything under it. */
  move(spaceId: string, assetId: string, parentId: string | null): Observable<Asset> {
    return this.update(spaceId, assetId, { parentId });
  }

  remove(spaceId: string, assetId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${assetId}`);
  }
}
