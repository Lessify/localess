import { DEEPL_TARGET_SUPPORT_LOCALES, GCP_TARGET_SUPPORT_LOCALES, type IntegrationId, type TranslatePrimary } from '@localess/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../../infra/config/config.js';
import { integrationProviders } from '../integrations/integration-providers.js';
import type { IntegrationOutcome, IntegrationService, ResolvedIntegration } from './integration.service.js';
import { TranslateService } from './translate.service.js';

const deeplTranslate = vi.fn();
const deeplKeys: string[] = [];
vi.mock('deepl-node', async importOriginal => ({
  ...(await importOriginal<typeof import('deepl-node')>()),
  Translator: class {
    constructor(key: string) {
      deeplKeys.push(key);
    }
    translateText = deeplTranslate;
  },
}));
const googleTranslate = vi.fn();
vi.mock('@google-cloud/translate', () => ({
  TranslationServiceClient: class {
    translateText = googleTranslate;
  },
}));

const SERVICE_ACCOUNT = JSON.stringify({ project_id: 'p', client_email: 'a@p.iam', private_key: 'k' });

/** IntegrationService as TranslateService sees it: what is connected, the primary, and the outcomes it records. */
function integrations(connected: Partial<Record<IntegrationId, Record<string, string>>>, primary: TranslatePrimary = 'deepl') {
  const outcomes: [IntegrationId, IntegrationOutcome][] = [];
  const fake = {
    resolve: (id: IntegrationId): Promise<ResolvedIntegration | undefined> =>
      Promise.resolve(connected[id] ? { id, source: 'ui', values: connected[id] } : undefined),
    translatePrimary: () => Promise.resolve({ value: primary, source: 'ui' as const }),
    recordOutcome: (id: IntegrationId, outcome: IntegrationOutcome) => {
      outcomes.push([id, outcome]);
      return Promise.resolve();
    },
  };
  return { fake: fake as unknown as IntegrationService, outcomes, connected };
}

function service(fake: IntegrationService, env: Record<string, string> = {}): TranslateService {
  const config = loadConfig(env);
  return new TranslateService(config, fake, integrationProviders(config));
}

const deeplText = (text: string) => [{ text }];
const googleText = (text: string) => [{ translations: [{ translatedText: text }] }];
const deeplQuota = () => Object.assign(new (class QuotaExceededError extends Error {})('quota'), {});

describe('TranslateService', () => {
  beforeEach(() => {
    deeplTranslate.mockReset();
    googleTranslate.mockReset();
    deeplKeys.length = 0;
  });

  const both = () => integrations({ deepl: { apiKey: 'd' }, 'google-translate': { serviceAccount: SERVICE_ACCOUNT, location: 'global' } });

  it('sends a pair the primary supports to the primary, and the others to the other provider', async () => {
    const { fake } = both();
    deeplTranslate.mockResolvedValue(deeplText('Hallo'));
    googleTranslate.mockResolvedValue(googleText('გამარჯობა'));
    expect(await service(fake).translate('Hello', 'en', 'de')).toBe('Hallo');
    expect(googleTranslate).not.toHaveBeenCalled();
    expect(await service(fake).translate('Hello', 'en', 'ka')).toBe('გამარჯობა');
    expect(deeplTranslate).toHaveBeenCalledTimes(1);
  });

  it('follows the primary the admin chose', async () => {
    const { fake } = integrations({ deepl: { apiKey: 'd' }, 'google-translate': { serviceAccount: SERVICE_ACCOUNT } }, 'google-translate');
    googleTranslate.mockResolvedValue(googleText('Hallo'));
    expect(await service(fake).translate('Hello', 'en', 'de')).toBe('Hallo');
    expect(deeplTranslate).not.toHaveBeenCalled();
  });

  it('falls back when the primary is out of quota, recording it once for a whole batch', async () => {
    const { fake, outcomes } = both();
    deeplTranslate.mockRejectedValue(deeplQuota());
    googleTranslate.mockResolvedValue(googleText('Hallo'));
    const items = [
      { id: 'a', content: 'x'.repeat(20_000) },
      { id: 'b', content: 'y'.repeat(20_000) },
      { id: 'c', content: 'z'.repeat(20_000) },
    ];
    const result = await service(fake).translateItems(items, 'en', 'de');
    expect(result.failed).toEqual([]);
    expect(result.items).toHaveLength(3);
    expect(deeplTranslate).toHaveBeenCalledTimes(1);
    expect(outcomes.filter(([id]) => id === 'deepl')).toEqual([['deepl', { ok: false, reason: 'quota', message: expect.any(String) }]]);
    expect(outcomes).toContainEqual(['google-translate', { ok: true }]);
  });

  it('refuses a pair no connected provider supports', async () => {
    const { fake } = integrations({ deepl: { apiKey: 'd' } });
    await expect(service(fake).translate('Hello', 'en', 'ka')).rejects.toMatchObject({
      status: 400,
      message: "Unsupported target locale : 'ka'",
    });
  });

  it('explains when nothing is connected, and when every provider failed', async () => {
    await expect(service(integrations({}).fake).translate('Hello', 'en', 'de')).rejects.toMatchObject({
      status: 412,
      message: 'Machine translation is not set up. Ask an admin to connect DeepL or Google in Admin → Settings → Integrations.',
    });
    const { fake } = both();
    deeplTranslate.mockRejectedValue(deeplQuota());
    googleTranslate.mockRejectedValue(Object.assign(new Error('quota'), { code: 8 }));
    await expect(service(fake).translate('Hello', 'en', 'de')).rejects.toMatchObject({
      status: 424,
      message: 'Machine translation is unavailable. Ask an admin to check Admin → Settings → Integrations.',
    });
  });

  it('records a success', async () => {
    const { fake, outcomes } = integrations({ deepl: { apiKey: 'd' } });
    deeplTranslate.mockResolvedValue(deeplText('Hallo'));
    await service(fake).translate('Hello', 'en', 'de');
    expect(outcomes).toEqual([['deepl', { ok: true }]]);
  });

  it('lists the locales of the connected providers together', async () => {
    expect(await service(integrations({}).fake).translatableLocales()).toEqual({ sourceLocales: [], targetLocales: [] });
    const deeplOnly = await service(integrations({ deepl: { apiKey: 'd' } }).fake).translatableLocales();
    expect(new Set(deeplOnly.targetLocales)).toEqual(DEEPL_TARGET_SUPPORT_LOCALES);
    const union = await service(both().fake).translatableLocales();
    expect(new Set(union.targetLocales)).toEqual(new Set([...DEEPL_TARGET_SUPPORT_LOCALES, ...GCP_TARGET_SUPPORT_LOCALES]));
    const stub = await service(integrations({}).fake, { LOCALESS_TRANSLATE_PROVIDER: 'stub' }).translatableLocales();
    expect(new Set(stub.targetLocales)).toEqual(GCP_TARGET_SUPPORT_LOCALES);
  });

  it('builds a new client when the key changes', async () => {
    const setup = integrations({ deepl: { apiKey: 'first' } });
    const translate = service(setup.fake);
    deeplTranslate.mockResolvedValue(deeplText('Hallo'));
    await translate.translate('Hello', 'en', 'de');
    await translate.translate('Hello', 'en', 'de');
    setup.connected.deepl = { apiKey: 'second' };
    await translate.translate('Hello', 'en', 'de');
    expect(deeplKeys).toEqual(['first', 'second']);
  });
});
