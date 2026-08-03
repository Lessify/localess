import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({ httpsCallableData: vi.fn() }));

vi.mock('@angular/fire/functions', () => ({
  Functions: class MockFunctions {},
  httpsCallableData: mocks.httpsCallableData,
}));

import { Functions } from '@angular/fire/functions';
import { firstValueFrom, of } from 'rxjs';

import { Setup } from './setup.model';
import { SetupService } from './setup.service';

describe('SetupService', () => {
  it('calls the setup callable with the given setup data', async () => {
    const callable = vi.fn().mockReturnValue(of(undefined));
    mocks.httpsCallableData.mockReturnValue(callable);
    TestBed.configureTestingModule({ providers: [SetupService, { provide: Functions, useValue: {} }] });
    const service = TestBed.inject(SetupService);
    const setup: Setup = { admin: { email: 'admin@example.com', password: 'secret123', displayName: 'Admin' } };

    await firstValueFrom(service.init(setup));

    expect(callable).toHaveBeenCalledWith(setup);
  });
});
