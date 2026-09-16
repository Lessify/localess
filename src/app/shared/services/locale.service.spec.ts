import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore is mocked globally in src/test-setup.ts.
import { arrayRemove, arrayUnion, doc, Firestore, updateDoc } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

import { Locale } from '../models/locale.model';
import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Firestore, useValue: {} }] });
    return TestBed.inject(LocaleService);
  }

  it('markAsFallback() sets localeFallback on the space doc', async () => {
    const service = setup();
    const entity: Locale = { id: 'de', name: 'German' };

    await firstValueFrom(service.markAsFallback('space-1', entity));

    expect(doc).toHaveBeenCalledWith({}, 'spaces/space-1');
    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ localeFallback: entity });
  });

  it('create() array-unions the locale onto the space doc', async () => {
    const service = setup();
    const entity: Locale = { id: 'de', name: 'German' };

    await firstValueFrom(service.create('space-1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ locales: arrayUnion(entity) });
  });

  it('delete() array-removes the locale from the space doc', async () => {
    const service = setup();
    const entity: Locale = { id: 'de', name: 'German' };

    await firstValueFrom(service.delete('space-1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ locales: arrayRemove(entity) });
  });

  it('findAllLocales() returns the static locale list without touching Firestore', async () => {
    const service = setup();

    const result = await firstValueFrom(service.findAllLocales());

    expect(result.length).toBeGreaterThan(0);
    expect(result).toContainEqual({ id: 'en', name: 'English' });
    expect(doc).not.toHaveBeenCalled();
  });

  it('isLocaleTranslatableFrom() reflects the source-support set', () => {
    const service = setup();
    expect(service.isLocaleTranslatableFrom('de')).toBe(true);
    expect(service.isLocaleTranslatableFrom('not-a-real-locale')).toBe(false);
  });

  it('isLocaleTranslatableTo() reflects the target-support set', () => {
    const service = setup();
    expect(service.isLocaleTranslatableTo('de')).toBe(true);
    expect(service.isLocaleTranslatableTo('not-a-real-locale')).toBe(false);
  });
});
