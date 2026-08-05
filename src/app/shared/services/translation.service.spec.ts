import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore and @angular/fire/functions are mocked globally in src/test-setup.ts.
import { collectionCount, collectionData, deleteDoc, deleteField, docData, Firestore, setDoc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { firstValueFrom, of } from 'rxjs';

import { Translation, TranslationCreate, TranslationType, TranslationUpdate } from '../models/translation.model';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup(currentUser: unknown = null) {
    const publishDraftCallable = vi.fn().mockReturnValue(of(undefined));
    vi.mocked(httpsCallableData).mockImplementation((_functions, name: string) => {
      if (name === 'translation-publishdraft') return publishDraftCallable;
      return vi.fn().mockReturnValue(of(undefined));
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
        { provide: Auth, useValue: { currentUser } },
      ],
    });
    return { service: TestBed.inject(TranslationService), publishDraftCallable };
  }

  it('findAll() reads the space translations collection', async () => {
    const { service } = setup();
    const translations: Translation[] = [{ id: 't1' } as unknown as Translation];
    vi.mocked(collectionData).mockReturnValue(of(translations));

    const result = await firstValueFrom(service.findAll('space-1'));

    expect(result).toEqual(translations);
  });

  it('countAll() counts the space translations collection', async () => {
    const { service } = setup();
    vi.mocked(collectionCount).mockReturnValue(of(5) as never);

    const result = await firstValueFrom(service.countAll('space-1'));

    expect(result).toBe(5);
  });

  it('findById() reads the translation doc', async () => {
    const { service } = setup();
    const translation: Translation = { id: 't1' } as unknown as Translation;
    vi.mocked(docData).mockReturnValue(of(translation));

    const result = await firstValueFrom(service.findById('space-1', 't1'));

    expect(result).toEqual(translation);
  });

  it('create() wraps array/plural locale values and publishes the draft', async () => {
    const { service, publishDraftCallable } = setup();
    const entity: TranslationCreate = {
      id: 't1',
      type: TranslationType.ARRAY,
      locales: { en: 'Hello' },
    };

    await firstValueFrom(service.create('space-1', entity));

    const [, addedEntity] = vi.mocked(setDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ type: TranslationType.ARRAY, locales: { en: '["Hello"]' } });
    expect(publishDraftCallable).toHaveBeenCalledWith({ spaceId: 'space-1' });
  });

  it('create() wraps plural locale values as an indexed object', async () => {
    const { service } = setup();
    const entity: TranslationCreate = {
      id: 't1',
      type: TranslationType.PLURAL,
      locales: { en: 'apple' },
    };

    await firstValueFrom(service.create('space-1', entity));

    const [, addedEntity] = vi.mocked(setDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ locales: { en: '{"0":"apple"}' } });
  });

  it('create() leaves string locale values untouched and omits labels/description when empty', async () => {
    const { service } = setup();
    const entity: TranslationCreate = {
      id: 't1',
      type: TranslationType.STRING,
      locales: { en: 'Hello' },
      labels: [],
      description: '',
    };

    await firstValueFrom(service.create('space-1', entity));

    const [, addedEntity] = vi.mocked(setDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ locales: { en: 'Hello' } });
    expect(addedEntity).not.toHaveProperty('labels');
    expect(addedEntity).not.toHaveProperty('description');
  });

  it('create() sets updatedBy when the current user has an email and display name', async () => {
    const { service } = setup({ email: 'a@b.com', displayName: 'Alex' });
    const entity: TranslationCreate = { id: 't1', type: TranslationType.STRING, locales: {} };

    await firstValueFrom(service.create('space-1', entity));

    const [, addedEntity] = vi.mocked(setDoc).mock.calls[0];
    expect(addedEntity).toMatchObject({ updatedBy: { name: 'Alex', email: 'a@b.com' } });
  });

  it('update() deletes labels/description fields when empty and publishes the draft', async () => {
    const { service, publishDraftCallable } = setup();
    const entity: TranslationUpdate = { labels: [], description: '' };

    await firstValueFrom(service.update('space-1', 't1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ labels: deleteField(), description: deleteField() });
    expect(publishDraftCallable).toHaveBeenCalledWith({ spaceId: 'space-1' });
  });

  it('update() sets labels/description when provided', async () => {
    const { service } = setup();
    const entity: TranslationUpdate = { labels: ['a'], description: 'desc' };

    await firstValueFrom(service.update('space-1', 't1', entity));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ labels: ['a'], description: 'desc' });
  });

  it('updateId() creates the doc under the new id, deletes the old one, and publishes the draft', async () => {
    const { service, publishDraftCallable } = setup();
    const entity: Translation = { id: 't1', type: TranslationType.STRING, locales: {}, createdAt: {} } as unknown as Translation;

    await firstValueFrom(service.updateId('space-1', entity, 't2'));

    expect(setDoc).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();
    expect(publishDraftCallable).toHaveBeenCalledWith({ spaceId: 'space-1' });
  });

  it('updateLocale() sets the given locale field and publishes the draft', async () => {
    const { service, publishDraftCallable } = setup();

    await firstValueFrom(service.updateLocale('space-1', 't1', 'en', 'Hello'));

    const [, updatedFields] = vi.mocked(updateDoc).mock.calls[0];
    expect(updatedFields).toMatchObject({ 'locales.en': 'Hello' });
    expect(publishDraftCallable).toHaveBeenCalledWith({ spaceId: 'space-1' });
  });

  it('delete() deletes the doc and publishes the draft', async () => {
    const { service, publishDraftCallable } = setup();

    await firstValueFrom(service.delete('space-1', 't1'));

    expect(deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc-ref' });
    expect(publishDraftCallable).toHaveBeenCalledWith({ spaceId: 'space-1' });
  });

  it('publish() calls the translation-publish callable', async () => {
    const { service } = setup();

    await firstValueFrom(service.publish('space-1'));

    expect(httpsCallableData).toHaveBeenCalledWith(expect.anything(), 'translation-publish');
  });

  it('deleteAll() calls the translation-deleteall callable', async () => {
    const { service } = setup();

    await firstValueFrom(service.deleteAll('space-1'));

    expect(httpsCallableData).toHaveBeenCalledWith(expect.anything(), 'translation-deleteall');
  });

  it('translateLocale() calls the translate callable then publishes the draft', async () => {
    const { service, publishDraftCallable } = setup();

    await firstValueFrom(service.translateLocale('space-1', 'en', 'de'));

    expect(httpsCallableData).toHaveBeenCalledWith(expect.anything(), 'translation-translatelocale');
    expect(publishDraftCallable).toHaveBeenCalledWith({ spaceId: 'space-1' });
  });
});
