import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Token, TokenForm, TokenPermission } from '@shared/models/token.model';
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

  findFirstByPermission(spaceId: string, permission: TokenPermission): Observable<Token[]> {
    const params = new HttpParams().set('permission', permission).set('limit', 1);
    return liveQueryWith(this.events, { spaceId, entities: ['tokens'] }, () => this.http.get<Token[]>(this.base(spaceId), { params }));
  }

  findById(spaceId: string, id: string): Observable<Token> {
    return liveQueryWith(this.events, { spaceId, entities: ['tokens'], id }, () => this.http.get<Token>(`${this.base(spaceId)}/${id}`));
  }

  create(spaceId: string, model: TokenForm): Observable<Token> {
    return this.http.post<Token>(this.base(spaceId), this.body(model));
  }

  update(spaceId: string, id: string, model: TokenForm): Observable<void> {
    return this.http.put<void>(`${this.base(spaceId)}/${id}`, this.body(model));
  }

  /** Same token under a new secret; resolves to the new token. */
  regenerate(spaceId: string, token: Token): Observable<Token> {
    return this.http.post<Token>(`${this.base(spaceId)}/${token.id}/regenerate`, {});
  }

  delete(spaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(spaceId)}/${id}`);
  }

  private body(model: TokenForm) {
    return { name: model.name, permissions: model.permissions, cacheTtl: model.cacheTtl ?? null };
  }
}
