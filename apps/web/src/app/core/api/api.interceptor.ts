import { Location } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { UserStore } from '@core/stores/user.store';
import { catchError, throwError } from 'rxjs';

import { SaveActivityService } from './save-activity.service';

/**
 * For calls to our own API: marks them as XHR (the server's CSRF rule for cookie-authenticated
 * writes), counts writes as saves (SaveActivityService: the sidebar logo swaps while one runs) and treats a 401 from
 * the app API as "signed out".
 */
export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  // Resolved lazily: UserStore itself depends on HttpClient, which depends on this interceptor.
  const injector = inject(Injector);
  const sent = next(request.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' } }));
  const isWrite = request.method !== 'GET' && request.method !== 'HEAD';
  return (isWrite ? inject(SaveActivityService).track(sent) : sent).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        (request.url.startsWith('/api/app/') || request.url === '/api/auth/me')
      ) {
        injector.get(UserStore).signedOut();
        // Not from a sign-in page: the login page's own session check answers 401, and navigating would drop the
        // `?error=` an OAuth sign-in came back with (the reason was never shown).
        if (!injector.get(Location).path().startsWith('/auth/')) void injector.get(Router).navigate(['/auth/login']);
      }
      return throwError(() => error);
    }),
  );
};
