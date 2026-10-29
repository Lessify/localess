import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserStore } from '@core/stores/user.store';
import type { MeEmailUpdate, MePasswordUpdate, MeUpdate, User } from '@localess/shared';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

const BASE = '/api/app/me';

/**
 * The signed-in user's own profile (`/api/app/me`; who is signed in is `GET /api/auth/me`, `UserStore`). The server asks
 * for the current password when the account has one. The profile and email changes answer the updated user, which the
 * store takes as it is.
 */
@Injectable({ providedIn: 'root' })
export class MeService {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);

  updateProfile(model: MeUpdate): Observable<void> {
    return this.http.patch<User>(BASE, { displayName: model.displayName, photoUrl: model.photoUrl } satisfies MeUpdate).pipe(
      tap(user => this.userStore.signedIn(user)),
      map(() => undefined),
    );
  }

  updateEmail(model: MeEmailUpdate): Observable<void> {
    return this.http
      .put<User>(`${BASE}/email`, { email: model.email, currentPassword: model.currentPassword } satisfies MeEmailUpdate)
      .pipe(
        tap(user => this.userStore.signedIn(user)),
        map(() => undefined),
      );
  }

  /** Signs out every other session; nothing the store shows changes. */
  updatePassword(model: MePasswordUpdate): Observable<void> {
    return this.http.put<void>(`${BASE}/password`, {
      currentPassword: model.currentPassword,
      newPassword: model.newPassword,
    } satisfies MePasswordUpdate);
  }
}
