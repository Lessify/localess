import { beforeEach, describe, expect, it, vi } from 'vitest';

const translateText = vi.fn();

vi.mock('../config', () => ({
  firebaseConfig: { projectId: 'demo', locationId: 'europe-west6' },
  isEmulatorEnabled: false,
  remoteConfigTemplate: { load: vi.fn().mockRejectedValue(new Error('no remote config')), evaluate: vi.fn() },
  getTranslationService: vi.fn(async () => ({ translateText })),
  GCP_SUPPORT_LOCALES: new Set(['en', 'de']),
  DEEPL_SOURCE_SUPPORT_LOCALES: new Set(['en']),
  DEEPL_TARGET_SUPPORT_LOCALES: new Set(['de']),
}));

import { translateCloudBatch } from './translate.service';

describe('translateCloudBatch', () => {
  beforeEach(() => {
    translateText.mockReset();
    delete process.env.DEEPL_API_KEY;
  });

  it('sends every item in one request and returns results in input order', async () => {
    translateText.mockResolvedValue([{ translations: [{ translatedText: 'eins' }, { translatedText: 'zwei' }] }]);

    const result = await translateCloudBatch(['one', 'two'], 'en', 'de');

    expect(result).toEqual(['eins', 'zwei']);
    expect(translateText).toHaveBeenCalledTimes(1);
    expect(translateText.mock.calls[0][0]).toMatchObject({ contents: ['one', 'two'], mimeType: 'text/plain' });
  });

  it('asks for html tag handling for an html batch', async () => {
    translateText.mockResolvedValue([{ translations: [{ translatedText: '<p>eins</p>' }] }]);

    await translateCloudBatch(['<p>one</p>'], 'en', 'de', 'html');

    expect(translateText.mock.calls[0][0]).toMatchObject({ mimeType: 'text/html' });
  });

  it('returns an empty array without calling the provider for no items', async () => {
    expect(await translateCloudBatch([], 'en', 'de')).toEqual([]);
    expect(translateText).not.toHaveBeenCalled();
  });
});
