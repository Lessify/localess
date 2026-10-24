import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { Page, PasswordResetLink, User, UserAdd, UserStatusUpdate, UserUpdate } from '@localess/shared';
import { Observable } from 'rxjs';

const BASE = '/api/app/users';

/** Admin → Users (`/api/app/users`); reads are live. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  /** One page (`params`: a `PagedList`'s query); read again whenever a user changes. */
  findAll(params: HttpParams): Observable<Page<User>> {
    return liveQueryWith(this.events, { entities: ['users'] }, () => this.http.get<Page<User>>(BASE, { params }));
  }

  /** The user's role; `null` takes the access away. */
  update(id: string, model: UserUpdate): Observable<void> {
    return this.http.patch<void>(`${BASE}/${id}`, { role: model.role } satisfies UserUpdate);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  /** Disabling ends the user's sessions and blocks sign-in; nobody can change their own status. */
  updateStatus(id: string, model: UserStatusUpdate): Observable<void> {
    return this.http.patch<void>(`${BASE}/${id}/status`, { disabled: model.disabled } satisfies UserStatusUpdate);
  }

  /** Adds a user (a password, and the role given or none). */
  create(model: UserAdd): Observable<void> {
    return this.http.post<void>(BASE, model satisfies UserAdd);
  }

  /** A one-hour reset link an admin can hand over (works without SMTP). */
  createPasswordResetLink(id: string): Observable<PasswordResetLink> {
    return this.http.post<PasswordResetLink>(`${BASE}/${id}/password-reset-link`, {});
  }
}
