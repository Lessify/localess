import { HttpErrorResponse, HttpHandler, HttpRequest } from '@angular/common/http';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HttpErrorInterceptor } from './http-error.interceptor';

describe('HttpErrorInterceptor', () => {
  function setup() {
    const handleError = vi.fn();
    TestBed.configureTestingModule({ providers: [HttpErrorInterceptor, { provide: ErrorHandler, useValue: { handleError } }] });
    return { interceptor: TestBed.inject(HttpErrorInterceptor), handleError };
  }

  it('forwards HttpErrorResponse failures to the app-wide ErrorHandler', async () => {
    const { interceptor, handleError } = setup();
    const request = new HttpRequest('GET', '/api/x');
    const httpError = new HttpErrorResponse({ status: 500 });
    const next: HttpHandler = { handle: () => throwError(() => httpError) };

    await expect(firstValueFrom(interceptor.intercept(request, next))).rejects.toBe(httpError);

    expect(handleError).toHaveBeenCalledWith(httpError);
  });

  it('does not forward non-HttpErrorResponse failures', async () => {
    const { interceptor, handleError } = setup();
    const request = new HttpRequest('GET', '/api/x');
    const otherError = new Error('boom');
    const next: HttpHandler = { handle: () => throwError(() => otherError) };

    await expect(firstValueFrom(interceptor.intercept(request, next))).rejects.toBe(otherError);

    expect(handleError).not.toHaveBeenCalled();
  });

  it('passes through successful responses untouched', async () => {
    const { interceptor, handleError } = setup();
    const request = new HttpRequest('GET', '/api/x');
    const next: HttpHandler = { handle: () => of('ok' as any) };

    const result = await firstValueFrom(interceptor.intercept(request, next));

    expect(result).toBe('ok');
    expect(handleError).not.toHaveBeenCalled();
  });
});
