import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@shared/services/notification.service';
import { vi } from 'vitest';

vi.mock('@spartan-ng/brain/sonner', () => {
  const toast: any = vi.fn();
  toast.success = vi.fn();
  toast.info = vi.fn();
  toast.warning = vi.fn();
  toast.error = vi.fn();
  return { toast };
});

import { toast } from '@spartan-ng/brain/sonner';

import { environment } from '../../../environments/environment';
import { AppErrorHandler } from './app-error-handler.service';

describe('AppErrorHandler', () => {
  const originalProduction = environment.production;

  afterEach(() => {
    vi.clearAllMocks();
    environment.production = originalProduction;
  });

  function setup() {
    const error = vi.fn();
    TestBed.configureTestingModule({ providers: [AppErrorHandler, { provide: NotificationService, useValue: { error } }] });
    return { handler: TestBed.inject(AppErrorHandler), error };
  }

  it('shows a persistent reload toast for a chunk load error and does not notify or rethrow', () => {
    const { handler, error } = setup();
    const superHandleError = vi.spyOn(ErrorHandler.prototype, 'handleError').mockImplementation(() => undefined);
    const chunkError = new Error('Failed to fetch dynamically imported module: /chunk.js');

    handler.handleError(chunkError);

    expect(toast.warning).toHaveBeenCalledWith(
      'A new version is available',
      expect.objectContaining({ position: 'bottom-left', duration: 300000 }),
    );
    expect(error).not.toHaveBeenCalled();
    expect(superHandleError).not.toHaveBeenCalled();
    superHandleError.mockRestore();
  });

  it('the reload toast action reloads the page', () => {
    const { handler } = setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const chunkError = new Error('error loading dynamically imported module foo');

    handler.handleError(chunkError);

    const [, options] = vi.mocked(toast.warning).mock.calls[0] as unknown as [string, { action: { onClick: () => void } }];
    options.action.onClick();

    expect(reload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('notifies with a plain message in production and forwards to the base handler', () => {
    environment.production = true;
    const { handler, error } = setup();
    const superHandleError = vi.spyOn(ErrorHandler.prototype, 'handleError').mockImplementation(() => undefined);
    const genericError = new Error('boom');

    handler.handleError(genericError);

    expect(error).toHaveBeenCalledWith('An error occurred.');
    expect(superHandleError).toHaveBeenCalledWith(genericError);
    superHandleError.mockRestore();
  });

  it('appends a console hint to the message outside production', () => {
    environment.production = false;
    const { handler, error } = setup();
    vi.spyOn(ErrorHandler.prototype, 'handleError').mockImplementation(() => undefined);

    handler.handleError(new Error('boom'));

    expect(error).toHaveBeenCalledWith('An error occurred. See console for details.');
  });
});
