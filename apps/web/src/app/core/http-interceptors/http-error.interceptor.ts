import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { ErrorHandler, inject, Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Passes HttpErrorResponse to application-wide error handler. A 401 from our API is left to the auth
 * flow (the session check on load, the sign-out redirect, the login form) instead of being reported.
 */
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  private injector = inject(Injector);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap({
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && !(err.status === 401 && request.url.startsWith('/api/'))) {
            const appErrorHandler = this.injector.get(ErrorHandler);
            appErrorHandler.handleError(err);
          }
        },
      }),
    );
  }
}
