import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  let originalUserAgent: string;

  beforeEach(() => {
    originalUserAgent = window.navigator.userAgent;
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', { value: originalUserAgent, configurable: true });
  });

  function createService(userAgent: string, platformId: string = 'browser'): PlatformService {
    Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true });
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platformId }] });
    return TestBed.inject(PlatformService);
  }

  it('detects an Apple platform from the user agent and uses the command-key label', () => {
    const service = createService('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)');
    expect(service.isApple).toBe(true);
    expect(service.funKeyLabel).toBe('⌘');
    expect(service.actionSaveLabel).toBe('⌘ + S');
    expect(service.actionAddLabel).toBe('⌘ + N');
  });

  it('falls back to the Ctrl label on a non-Apple user agent', () => {
    const service = createService('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(service.isApple).toBe(false);
    expect(service.funKeyLabel).toBe('Ctrl');
    expect(service.actionSaveLabel).toBe('Ctrl + S');
  });

  it('is never Apple on a non-browser platform, regardless of user agent', () => {
    const service = createService('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'server');
    expect(service.isApple).toBe(false);
  });

  it('isActionSave checks metaKey and the "s" key on Apple', () => {
    const service = createService('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)');
    expect(service.isActionSave({ metaKey: true, ctrlKey: false, key: 's' } as KeyboardEvent)).toBe(true);
    expect(service.isActionSave({ metaKey: false, ctrlKey: true, key: 's' } as KeyboardEvent)).toBe(false);
    expect(service.isActionSave({ metaKey: true, ctrlKey: false, key: 'a' } as KeyboardEvent)).toBe(false);
  });

  it('isActionSave checks ctrlKey and the "s" key on non-Apple', () => {
    const service = createService('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(service.isActionSave({ metaKey: false, ctrlKey: true, key: 's' } as KeyboardEvent)).toBe(true);
    expect(service.isActionSave({ metaKey: true, ctrlKey: false, key: 's' } as KeyboardEvent)).toBe(false);
  });

  it('isActionAdd checks the platform-appropriate modifier and the "n" key', () => {
    const service = createService('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(service.isActionAdd({ metaKey: false, ctrlKey: true, key: 'n' } as KeyboardEvent)).toBe(true);
    expect(service.isActionAdd({ metaKey: false, ctrlKey: true, key: 'x' } as KeyboardEvent)).toBe(false);
  });
});
