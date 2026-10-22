import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { normalizeContent } from '@core/utils/content-data';
import {
  Content,
  ContentCreate,
  ContentData,
  ContentDataUpdate,
  ContentDocument,
  ContentDocumentCreate,
  ContentDocumentSummary,
  ContentFolder,
  ContentFolderCreate,
  ContentFolderSummary,
  ContentKind,
  ContentUpdate,
  Page,
} from '@localess/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Contents of a space (`/api/app/spaces/:spaceId/contents`); reads are live. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/contents`;
  }

  /**
   * One page of a folder (the root without `parentId`), or with `deep` of everything under it; folders first, without
   * the documents' data. Live: a change in the space reads the page again.
   */
  findPage(spaceId: string, params: HttpParams): Observable<Page<Content>> {
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () =>
      this.http.get<Page<Content>>(this.base(spaceId), { params }),
    );
  }

  /** Every folder of the space, light (no paths), live: `SpaceStore` holds it for the breadcrumbs, the Move dialog, the paths. */
  findAllFolders(spaceId: string): Observable<ContentFolderSummary[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () =>
      this.http.get<ContentFolderSummary[]>(`${this.base(spaceId)}/folders`),
    );
  }

  /** Every document of the space, light (no data, no paths), live: `SpaceStore` holds it for the Link and References fields. */
  findAllDocuments(spaceId: string): Observable<ContentDocumentSummary[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () =>
      this.http.get<ContentDocumentSummary[]>(`${this.base(spaceId)}/documents`),
    );
  }

  /** The first `max` contents whose name or slug contains `search`, anywhere in the space. */
  search<T extends Content>(spaceId: string, search: string, max = 20, kind?: ContentKind): Observable<T[]> {
    let params = new HttpParams().set('search', search).set('deep', true).set('size', max);
    if (kind) params = params.set('kind', kind);
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () =>
      this.http.get<Page<T>>(this.base(spaceId), { params }).pipe(map(it => it.items)),
    );
  }

  /** One document with its data (the editor), live. */
  findOne(spaceId: string, contentId: string): Observable<ContentDocument> {
    return liveQueryWith(this.events, { spaceId, entities: ['contents'], id: contentId }, () =>
      this.http.get<ContentDocument>(`${this.base(spaceId)}/${contentId}`),
    );
  }

  /** `parentId` absent: the root. */
  createDocument(spaceId: string, parentId: string | undefined, entity: ContentDocumentCreate): Observable<ContentDocument> {
    return this.http.post<ContentDocument>(this.base(spaceId), {
      kind: 'DOCUMENT',
      parentId,
      name: entity.name,
      slug: entity.slug,
      schema: entity.schema,
    } satisfies ContentCreate);
  }

  /** `parentId` absent: the root. */
  createFolder(spaceId: string, parentId: string | undefined, entity: ContentFolderCreate): Observable<ContentFolder> {
    return this.http.post<ContentFolder>(this.base(spaceId), {
      kind: 'FOLDER',
      parentId,
      name: entity.name,
      slug: entity.slug,
    } satisfies ContentCreate);
  }

  /** Renames: the name and the slug (`PATCH`, as `move`). */
  update(spaceId: string, contentId: string, entity: ContentUpdate): Observable<Content> {
    return this.http.patch<Content>(`${this.base(spaceId)}/${contentId}`, { name: entity.name, slug: entity.slug } satisfies ContentUpdate);
  }

  /** Into folder `parentId`; `null`: the root. */
  move(spaceId: string, contentId: string, parentId: string | null): Observable<Content> {
    return this.http.patch<Content>(`${this.base(spaceId)}/${contentId}`, { parentId } satisfies ContentUpdate);
  }

  /** Saves the document's data; the server works out what it points to (assets, links, references). */
  updateData(spaceId: string, contentId: string, data: ContentData): Observable<ContentDocument> {
    return this.http.put<ContentDocument>(`${this.base(spaceId)}/${contentId}/data`, {
      data: normalizeContent(data),
    } satisfies ContentDataUpdate);
  }

  /** A copy next to the document, with a random suffix, never published. */
  clone(spaceId: string, contentId: string): Observable<ContentDocument> {
    return this.http.post<ContentDocument>(`${this.base(spaceId)}/${contentId}/clone`, {});
  }

  /** A folder goes with everything under it. */
  remove(spaceId: string, contentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${contentId}`);
  }

  publish(spaceId: string, contentId: string): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/${contentId}/publish`, {});
  }

  unpublish(spaceId: string, contentId: string): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/${contentId}/unpublish`, {});
  }
}
