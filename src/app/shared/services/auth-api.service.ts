import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from '@shared/models/user.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type OAuthProvider = 'google' | 'microsoft';

/** Session sign-in, sign-out and password reset (`/api/auth`, replacing Firebase Auth). */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(email: string, password: string): Observable<User> {
    return this.http.post<{ user: User }>('/api/auth/login', { email, password }).pipe(map(it => it.user));
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {});
  }

  /** Always succeeds, whether or not the email has an account. */
  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>('/api/auth/password-reset/request', { email });
  }

  confirmPasswordReset(token: string, password: string): Observable<void> {
    return this.http.post<void>('/api/auth/password-reset/confirm', { token, password });
  }

  /** Where the browser goes to sign in with a provider (a full-page redirect, not a popup). */
  oauthUrl(provider: OAuthProvider, returnTo = '/features'): string {
    return `/api/auth/oauth/${provider}?returnTo=${encodeURIComponent(returnTo)}`;
  }
}
