import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

vi.mock('@angular/fire/functions', async () => {
  const actual = await vi.importActual<typeof import('@angular/fire/functions')>('@angular/fire/functions');
  return { ...actual, httpsCallableData: vi.fn() };
});

import { Functions, httpsCallableData } from '@angular/fire/functions';
import { firstValueFrom, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UnsplashPluginService } from './unsplash-plugin.service';

describe('UnsplashPluginService', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Functions, useValue: {} }] });
    return TestBed.inject(UnsplashPluginService);
  }

  it('enabled() reflects the environment flag', () => {
    const service = setup();
    expect(service.enabled()).toBe(environment.plugins.unsplash);
  });

  it('search() calls the unsplash-search callable with the given params', async () => {
    const callable = vi.fn().mockReturnValue(of({ total: 0, total_pages: 0, results: [] }));
    (httpsCallableData as unknown as ReturnType<typeof vi.fn>).mockReturnValue(callable);
    const service = setup();

    const result = await firstValueFrom(service.search({ query: 'cats', page: 1 }));

    expect(result).toEqual({ total: 0, total_pages: 0, results: [] });
    expect(callable).toHaveBeenCalledWith({ query: 'cats', page: 1 });
  });

  it('random() calls the unsplash-random callable with no arguments', async () => {
    const callable = vi.fn().mockReturnValue(of({ url: 'https://example.com/photo.jpg' }));
    (httpsCallableData as unknown as ReturnType<typeof vi.fn>).mockReturnValue(callable);
    const service = setup();

    const result = await firstValueFrom(service.random());

    expect(result).toEqual({ url: 'https://example.com/photo.jpg' });
    expect(callable).toHaveBeenCalledWith();
  });
});
