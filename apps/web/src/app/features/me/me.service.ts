import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserStore } from '@core/stores/user.store';
import type { MeEmailUpdate, MePasswordUpdate, MeUpdate } from '@localess/shared';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

const BASE = '/api/app/me';

/** The signed-in user's own profile (`/api/app/me`). The server asks for the current password when the account has one. */
@Injectable({ providedIn: 'root' })
export class MeService {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);

  updateProfile(model: MeUpdate): Observable<void> {
    return this.http.patch(BASE, { displayName: model.displayName, photoUrl: model.photoUrl } satisfies MeUpdate).pipe(
      tap(() => this.userStore.load()),
      map(() => undefined),
    );
  }

  updateEmail(model: MeEmailUpdate): Observable<void> {
    return this.http.put(`${BASE}/email`, { email: model.email, currentPassword: model.currentPassword } satisfies MeEmailUpdate).pipe(
      tap(() => this.userStore.load()),
      map(() => undefined),
    );
  }

  /** Signs out every other session. */
  updatePassword(model: MePasswordUpdate): Observable<void> {
    return this.http
      .put<void>(`${BASE}/password`, { currentPassword: model.currentPassword, newPassword: model.newPassword } satisfies MePasswordUpdate)
      .pipe(tap(() => this.userStore.load()));
  }
}
