import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

vi.mock('@angular/fire/functions', async () => {
  const actual = await vi.importActual<typeof import('@angular/fire/functions')>('@angular/fire/functions');
  return { ...actual, httpsCallableData: vi.fn() };
});

import { Functions, httpsCallableData } from '@angular/fire/functions';
import { firstValueFrom, of } from 'rxjs';

import { OpenApiService } from './open-api.service';

describe('OpenApiService', () => {
  function setup(callableReturn: unknown) {
    const callable = vi.fn().mockReturnValue(of(callableReturn));
    (httpsCallableData as unknown as ReturnType<typeof vi.fn>).mockReturnValue(callable);
    TestBed.configureTestingModule({ providers: [{ provide: Functions, useValue: {} }] });
    return { service: TestBed.inject(OpenApiService), callable };
  }

  it('calls the openapi-generate callable with the given spaceId and returns its data', async () => {
    const { service, callable } = setup('openapi-json-string');

    const result = await firstValueFrom(service.generate('space-1'));

    expect(result).toBe('openapi-json-string');
    expect(callable).toHaveBeenCalledWith({ spaceId: 'space-1' });
  });
});
