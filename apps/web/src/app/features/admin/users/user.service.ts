import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { User, UserInvite, UserUpdate } from '@localess/shared';
import { Observable } from 'rxjs';

const BASE = '/api/app/users';

export interface PasswordResetLink {
  url: string;
  expiresAt: string;
}

/** Admin → Users (`/api/app/users`); reads are live. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  findAll(): Observable<User[]> {
    return liveQueryWith(this.events, { entities: ['users'] }, () => this.http.get<User[]>(BASE));
  }

  findById(id: string): Observable<User> {
    return liveQueryWith(this.events, { entities: ['users'], id }, () => this.http.get<User>(`${BASE}/${id}`));
  }

  /** `role` null clears the access; the server drops permissions/lock for non-custom roles. */
  update(id: string, model: UserUpdate): Observable<void> {
    return this.http.patch<void>(`${BASE}/${id}`, { role: model.role ?? null, permissions: model.permissions, lock: model.lock });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  /** Disabling ends the user's sessions and blocks sign-in; nobody can change their own status. */
  setDisabled(id: string, disabled: boolean): Observable<void> {
    return this.http.patch<void>(`${BASE}/${id}/status`, { disabled });
  }

  invite(model: UserInvite): Observable<void> {
    return this.http.post<void>(BASE, model);
  }

  /** A one-hour reset link an admin can hand over (works without SMTP). */
  passwordResetLink(id: string): Observable<PasswordResetLink> {
    return this.http.post<PasswordResetLink>(`${BASE}/${id}/password-reset-link`, {});
  }
}
