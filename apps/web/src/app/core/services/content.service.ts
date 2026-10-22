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
  ContentFolder,
  ContentFolderCreate,
  ContentFolderSummary,
  ContentKind,
  ContentUpdate,
  Page,
  PAGE_SIZE_MAX,
} from '@localess/shared';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/** Contents of a space (`/api/app/spaces/:spaceId/contents`); reads are live. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/contents`;
  }

  /**
   * Every page of the list (`GET …/contents` is paged, without the documents' data), live. For now: the table and the
   * pickers page in the browser, and the Link field and the References fields read every document; they move to the
   * paged list and to a light list in `SpaceStore`.
   */
  private list<T extends Content>(spaceId: string, params: HttpParams): Observable<T[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () => this.everyPage<T>(spaceId, params));
  }

  private everyPage<T extends Content>(spaceId: string, params: HttpParams, page = 0): Observable<T[]> {
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

  /** The first `max` contents whose name or slug contains `search`, anywhere in the space. */
  private search<T extends Content>(spaceId: string, search: string, max: number, kind?: ContentKind): Observable<T[]> {
    let params = new HttpParams().set('search', search).set('deep', true).set('size', max);
    if (kind) params = params.set('kind', kind);
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () =>
      this.http.get<Page<T>>(this.base(spaceId), { params }).pipe(map(it => it.items)),
    );
  }

  /** Children of folder `parentId` (the root when absent), folders first then by name. */
  findAll(spaceId: string, parentId?: string): Observable<Content[]> {
    return this.list(spaceId, parentId ? new HttpParams().set('parentId', parentId) : new HttpParams());
  }

  /** Every folder of the space, live: the editor's folder map (breadcrumbs, paths, move targets). */
  findAllFolders(spaceId: string): Observable<ContentFolderSummary[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () =>
      this.http.get<ContentFolderSummary[]>(`${this.base(spaceId)}/folders`),
    );
  }

  countAll(spaceId: string, kind?: ContentKind): Observable<number> {
    const params = kind ? new HttpParams().set('kind', kind) : undefined;
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () =>
      this.http.get<{ count: number }>(`${this.base(spaceId)}/count`, { params }),
    ).pipe(map(it => it.count));
  }

  /** Every document of the space, without its data. */
  findAllDocuments(spaceId: string): Observable<ContentDocument[]> {
    return this.list(spaceId, new HttpParams().set('kind', ContentKind.DOCUMENT).set('deep', true));
  }

  findAllByName(spaceId: string, name: string, max = 20): Observable<Content[]> {
    return this.search(spaceId, name, max);
  }

  findAllDocumentsByName(spaceId: string, name: string, max = 20): Observable<ContentDocument[]> {
    return this.search(spaceId, name, max, ContentKind.DOCUMENT);
  }

  findById(spaceId: string, id: string): Observable<Content> {
    return liveQueryWith(this.events, { spaceId, entities: ['contents'], id }, () => this.http.get<Content>(`${this.base(spaceId)}/${id}`));
  }

  findDocumentById(spaceId: string, id: string): Observable<ContentDocument> {
    return liveQueryWith(this.events, { spaceId, entities: ['contents'], id }, () =>
      this.http.get<ContentDocument>(`${this.base(spaceId)}/${id}`),
    );
  }

  findByIds(spaceId: string, ids: string[]): Observable<Content[]> {
    if (ids.length === 0) return of([]);
    return this.list(spaceId, new HttpParams().set('ids', ids.join(',')));
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

  update(spaceId: string, id: string, entity: ContentUpdate): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { name: entity.name, slug: entity.slug } satisfies ContentUpdate);
  }

  /** Into folder `parentId`; `null`: the root. */
  move(spaceId: string, id: string, parentId: string | null): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { parentId } satisfies ContentUpdate);
  }

  /**
   * Update Document Data
   * @param refs Tuple of Sets: [assets, links, references]
   */
  /** Saves the document's data; the server works out what it points to (assets, links, references). */
  updateDocumentData(spaceId: string, id: string, data: ContentData): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}/data`, { data: normalizeContent(data) } satisfies ContentDataUpdate);
  }

  cloneDocument(spaceId: string, entity: ContentDocument): Observable<ContentDocument> {
    return this.http.post<ContentDocument>(`${this.base(spaceId)}/${entity.id}/clone`, {});
  }

  delete(spaceId: string, element: Content): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${element.id}`);
  }

  publish(spaceId: string, id: string): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/${id}/publish`, {});
  }

  unpublish(spaceId: string, id: string): Observable<void> {
    return this.http.post<void>(`${this.base(spaceId)}/${id}/unpublish`, {});
  }
}
