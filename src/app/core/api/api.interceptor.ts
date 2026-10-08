import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { UserStore } from '@shared/stores/user.store';
import { catchError, throwError } from 'rxjs';

/**
 * For calls to our own API: marks them as XHR (the server's CSRF rule for cookie-authenticated
 * writes) and treats a 401 from the app API as "signed out".
 */
export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  // Resolved lazily: UserStore itself depends on HttpClient, which depends on this interceptor.
  const injector = inject(Injector);
  return next(request.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' } })).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        (request.url.startsWith('/api/app/') || request.url === '/api/auth/me')
      ) {
        injector.get(UserStore).signedOut();
        void injector.get(Router).navigate(['/auth/login']);
      }
      return throwError(() => error);
    }),
  );
};
