import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
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

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    const navigateByUrl = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigateByUrl } }] });
    return { service: TestBed.inject(NotificationService), navigateByUrl };
  }

  it('default() forwards the message with no options', () => {
    const { service } = setup();
    service.default('Saved');
    expect(vi.mocked(toast)).toHaveBeenCalledWith('Saved', undefined);
  });

  it('success()/info()/warning() forward the message and plain options untouched', () => {
    const { service } = setup();
    service.success('Done', { duration: 2000 });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Done', { duration: 2000, action: undefined });

    service.info('FYI');
    expect(vi.mocked(toast.info)).toHaveBeenCalledWith('FYI', undefined);

    service.warning('Careful');
    expect(vi.mocked(toast.warning)).toHaveBeenCalledWith('Careful', undefined);
  });

  it('error() defaults duration to 6000 when no options are given', () => {
    const { service } = setup();
    service.error('Failed');
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed', { duration: 6000 });
  });

  it('error() lets an explicit duration override the 6000 default', () => {
    const { service } = setup();
    service.error('Failed again', { duration: 1000 });
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed again', { duration: 1000, action: undefined });
  });

  it('a "route" action navigates via the Router on click', () => {
    const { service, navigateByUrl } = setup();
    service.default('Go', { action: { type: 'route', label: 'View', link: '/spaces/1' } });

    const [, options] = vi.mocked(toast).mock.calls[0] as unknown as [string, { action: { label: string; onClick: () => void } }];
    options.action.onClick();

    expect(navigateByUrl).toHaveBeenCalledWith('/spaces/1');
    expect(options.action.label).toBe('View');
  });

  it('a "link" action opens a new window on click', () => {
    const { service } = setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    service.default('Go', { action: { type: 'link', label: 'Docs', link: 'https://example.com' } });

    const [, options] = vi.mocked(toast).mock.calls[0] as unknown as [string, { action: { onClick: () => void } }];
    options.action.onClick();

    expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank');
    openSpy.mockRestore();
  });

  it('an "action" action calls the caller-supplied onClick', () => {
    const { service } = setup();
    const onClick = vi.fn();
    service.default('Go', { action: { type: 'action', label: 'Undo', onClick } });

    const [, options] = vi.mocked(toast).mock.calls[0] as unknown as [string, { action: { onClick: () => void } }];
    options.action.onClick();

    expect(onClick).toHaveBeenCalled();
  });
});
