import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Page, SpaceTokenCreate, SpaceTokenUpdate, Token, TokenType } from '@localess/shared';
import { TokenForm } from '@shared/models/token.model';
import { Observable, of, switchMap } from 'rxjs';

/** API tokens of a space (`/api/app/spaces/:spaceId/tokens`); the page is live, newest first unless sorted otherwise. */
@Injectable({ providedIn: 'root' })
export class SpaceTokenService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/tokens`;
  }

  /** One page: `page`, `size`, `sort`, `direction` (a `PagedList`'s params), `type`, `search` (the name or the hint). */
  findAll(spaceId: string, params: HttpParams): Observable<Page<Token>> {
    return liveQueryWith(this.events, { spaceId, entities: ['tokens'] }, () => this.http.get<Page<Token>>(this.base(spaceId), { params }));
  }

  /**
   * The value of the newest token of the first of `types` the space has (`undefined`: none). Asked every time, never cached,
   * so a regenerated or deleted token is never reused. For the "open in API" links: published `[PUBLIC, PREVIEW]` (a preview
   * token reads published content too), drafts `[PREVIEW]`.
   */
  firstValue(spaceId: string, types: TokenType[]): Observable<string | undefined> {
    const [type, ...rest] = types;
    if (!type) return of(undefined);
    const params = new HttpParams().set('type', type).set('size', 1);
    return this.http
      .get<Page<Token>>(this.base(spaceId), { params })
      .pipe(switchMap(page => (page.items[0]?.token ? of(page.items[0].token) : this.firstValue(spaceId, rest))));
  }

  /** Resolves to the new token, value included (the only time a management token's value is returned). */
  create(spaceId: string, model: TokenForm): Observable<Token> {
    return this.http.post<Token>(this.base(spaceId), {
      name: model.name,
      type: model.type,
      cacheTtl: model.cacheTtl ?? null,
    } satisfies SpaceTokenCreate);
  }

  /** The name and cache TTL; the type never changes. */
  update(spaceId: string, id: string, model: Omit<TokenForm, 'type'>): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}`, {
      name: model.name,
      cacheTtl: model.cacheTtl ?? null,
    } satisfies SpaceTokenUpdate);
  }

  /** Same token under a new value; resolves to the new token, value included. */
  regenerate(spaceId: string, token: Token): Observable<Token> {
    return this.http.post<Token>(`${this.base(spaceId)}/${token.id}/regenerate`, {});
  }

  remove(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }
}
