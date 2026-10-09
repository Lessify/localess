import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserStore } from '@shared/stores/user.store';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { MeUpdate } from '../models/me.model';

const BASE = '/api/app/me';

/** The signed-in user's own profile (`/api/app/me`). The server asks for the current password when the account has one. */
@Injectable({ providedIn: 'root' })
export class MeService {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);

  updateProfile(model: MeUpdate): Observable<void> {
    return this.http.patch(BASE, { displayName: model.displayName, photoURL: model.photoURL }).pipe(
      tap(() => this.userStore.load()),
      map(() => undefined),
    );
  }

  updateEmail(email: string, currentPassword?: string): Observable<void> {
    return this.http.put(`${BASE}/email`, { email, currentPassword }).pipe(
      tap(() => this.userStore.load()),
      map(() => undefined),
    );
  }

  /** Signs out every other session. */
  updatePassword(newPassword: string, currentPassword?: string): Observable<void> {
    return this.http.put<void>(`${BASE}/password`, { currentPassword, newPassword }).pipe(tap(() => this.userStore.load()));
  }
}
