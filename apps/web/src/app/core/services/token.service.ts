import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Token, TokenType } from '@localess/shared';
import { TokenForm } from '@shared/models/token.model';
import { Observable } from 'rxjs';

/** API tokens of a space (`/api/app/spaces/:spaceId/tokens`); reads are live, newest first. */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  private base(spaceId: string): string {
    return `/api/app/spaces/${spaceId}/tokens`;
  }

  findAll(spaceId: string): Observable<Token[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['tokens'] }, () => this.http.get<Token[]>(this.base(spaceId)));
  }

  findFirst(spaceId: string): Observable<Token[]> {
    const params = new HttpParams().set('limit', 1);
    return liveQueryWith(this.events, { spaceId, entities: ['tokens'] }, () => this.http.get<Token[]>(this.base(spaceId), { params }));
  }

  /** The newest token of `type` (a list of at most one). */
  findFirstByType(spaceId: string, type: TokenType): Observable<Token[]> {
    const params = new HttpParams().set('type', type).set('limit', 1);
    return liveQueryWith(this.events, { spaceId, entities: ['tokens'] }, () => this.http.get<Token[]>(this.base(spaceId), { params }));
  }

  findById(spaceId: string, id: string): Observable<Token> {
    return liveQueryWith(this.events, { spaceId, entities: ['tokens'], id }, () => this.http.get<Token>(`${this.base(spaceId)}/${id}`));
  }

  /** Resolves to the new token, value included (the only time a management token's value is returned). */
  create(spaceId: string, model: TokenForm): Observable<Token> {
    return this.http.post<Token>(this.base(spaceId), { name: model.name, type: model.type, cacheTtl: model.cacheTtl ?? null });
  }

  /** The name and cache TTL; the type never changes. */
  update(spaceId: string, id: string, model: Omit<TokenForm, 'type'>): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}`, { name: model.name, cacheTtl: model.cacheTtl ?? null });
  }

  /** Same token under a new value; resolves to the new token, value included. */
  regenerate(spaceId: string, token: Token): Observable<Token> {
    return this.http.post<Token>(`${this.base(spaceId)}/${token.id}/regenerate`, {});
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }
}
