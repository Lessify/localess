import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// @angular/fire/firestore, @angular/fire/functions, and @angular/fire/remote-config are mocked
// globally in src/test-setup.ts.
import { doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { getAllChanges, RemoteConfig } from '@angular/fire/remote-config';
import { firstValueFrom, of } from 'rxjs';

import { AppSettings, AppSettingsUiUpdate } from '../models/settings.model';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
        { provide: RemoteConfig, useValue: {} },
      ],
    });
    return TestBed.inject(SettingsService);
  }

  it('find() reads the settings doc at the expected path', async () => {
    const service = setup();
    const settings: AppSettings = { updatedAt: {} } as unknown as AppSettings;
    vi.mocked(docData).mockReturnValue(of(settings));

    const result = await firstValueFrom(service.find());

    expect(doc).toHaveBeenCalledWith({}, 'configs/settings');
    expect(result).toEqual(settings);
  });

  it('config() streams remote-config changes', async () => {
    const service = setup();
    vi.mocked(getAllChanges).mockReturnValue(of({ key: 'value' }) as never);

    const result = await firstValueFrom(service.config());

    expect(result).toEqual({ key: 'value' });
  });

  it('updateUi() merges a clone of the ui update onto the settings doc', async () => {
    const service = setup();
    const update: AppSettingsUiUpdate = { text: 'Welcome', color: 'primary' };

    await firstValueFrom(service.updateUi(update));

    expect(doc).toHaveBeenCalledWith({}, 'configs/settings');
    const [, setEntity, options] = vi.mocked(setDoc).mock.calls[0];
    expect(setEntity).toMatchObject({ ui: update });
    expect(options).toEqual({ merge: true });
  });
});
