import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { normalizeContent } from '@core/utils/content-data';
import {
  Content,
  ContentData,
  ContentDocument,
  ContentDocumentCreate,
  ContentFolder,
  ContentFolderCreate,
  ContentKind,
  ContentUpdate,
} from '@localess/shared';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/** Contents of a space (`/api/app/spaces/:spaceId/contents`); reads are live. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/contents`;
  }

  private list<T extends Content>(spaceId: string, params: HttpParams): Observable<T[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () => this.http.get<T[]>(this.base(spaceId), { params }));
  }

  private byName(name: string, max: number, kind?: ContentKind): HttpParams {
    let params = new HttpParams().set('name', name);
    if (kind) params = params.set('kind', kind);
    return params.set('limit', max);
  }

  /** Children of `parentSlug` (root when empty), folders first then by name. */
  findAll(spaceId: string, parentSlug?: string): Observable<Content[]> {
    return this.list(spaceId, new HttpParams().set('parentSlug', parentSlug ?? ''));
  }

  countAll(spaceId: string, kind?: ContentKind): Observable<number> {
    const params = kind ? new HttpParams().set('kind', kind) : undefined;
    return liveQueryWith(this.events, { spaceId, entities: ['contents'] }, () =>
      this.http.get<{ count: number }>(`${this.base(spaceId)}/count`, { params }),
    ).pipe(map(it => it.count));
  }

  findAllDocuments(spaceId: string): Observable<ContentDocument[]> {
    return this.list(spaceId, new HttpParams().set('kind', ContentKind.DOCUMENT));
  }

  findAllByName(spaceId: string, name: string, max = 20): Observable<Content[]> {
    return this.list(spaceId, this.byName(name, max));
  }

  findAllDocumentsByName(spaceId: string, name: string, max = 20): Observable<ContentDocument[]> {
    return this.list(spaceId, this.byName(name, max, ContentKind.DOCUMENT));
  }

  findAllFoldersByName(spaceId: string, name: string, max = 20): Observable<ContentFolder[]> {
    return this.list(spaceId, this.byName(name, max, ContentKind.FOLDER));
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

  createDocument(spaceId: string, parentSlug: string, entity: ContentDocumentCreate): Observable<ContentDocument> {
    return this.http.post<ContentDocument>(this.base(spaceId), {
      kind: ContentKind.DOCUMENT,
      parentSlug,
      name: entity.name,
      slug: entity.slug,
      schema: entity.schema,
    });
  }

  createFolder(spaceId: string, parentSlug: string, entity: ContentFolderCreate): Observable<ContentFolder> {
    return this.http.post<ContentFolder>(this.base(spaceId), {
      kind: ContentKind.FOLDER,
      parentSlug,
      name: entity.name,
      slug: entity.slug,
    });
  }

  update(spaceId: string, id: string, parentSlug: string, entity: ContentUpdate): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { name: entity.name, slug: entity.slug, parentSlug });
  }

  /** `parentSlug` '~' is the root. */
  move(spaceId: string, id: string, parentSlug: string, slug: string): Observable<void> {
    return this.http.patch<void>(`${this.base(spaceId)}/${id}`, { parentSlug: parentSlug === '~' ? '' : parentSlug, slug });
  }

  /**
   * Update Document Data
   * @param refs Tuple of Sets: [assets, links, references]
   */
  updateDocumentData(spaceId: string, id: string, data: ContentData, refs: [Set<string>, Set<string>, Set<string>]): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}/data`, {
      data: normalizeContent(data),
      assets: [...refs[0]],
      links: [...refs[1]],
      references: [...refs[2]],
    });
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
