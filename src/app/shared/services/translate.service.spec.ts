import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

vi.mock('@angular/fire/functions', async () => {
  const actual = await vi.importActual<typeof import('@angular/fire/functions')>('@angular/fire/functions');
  return { ...actual, httpsCallableData: vi.fn() };
});

import { Functions, httpsCallableData } from '@angular/fire/functions';
import { firstValueFrom, of } from 'rxjs';
import { TranslateData } from '@shared/models/translate.model';

import { TranslateService } from './translate.service';

describe('TranslateService', () => {
  it('calls the translate callable with the given data and returns its result', async () => {
    const callable = vi.fn().mockReturnValue(of('translated text'));
    (httpsCallableData as unknown as ReturnType<typeof vi.fn>).mockReturnValue(callable);
    TestBed.configureTestingModule({ providers: [{ provide: Functions, useValue: {} }] });
    const service = TestBed.inject(TranslateService);
    const data: TranslateData = { content: 'Hello', sourceLocale: 'en', targetLocale: 'de' };

    const result = await firstValueFrom(service.translate(data));

    expect(result).toBe('translated text');
    expect(callable).toHaveBeenCalledWith(data);
  });
});
