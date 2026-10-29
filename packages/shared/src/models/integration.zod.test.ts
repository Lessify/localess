import { describe, expect, it } from 'vitest';

import { integrationDefinition, INTEGRATIONS } from './integration.model.js';
import { zIntegrationSave, zTranslatePrimaryUpdate } from './integration.zod.js';

describe('zIntegrationSave', () => {
  it('accepts values, with or without skipTest', () => {
    expect(zIntegrationSave.parse({ values: { apiKey: 'k' } })).toEqual({ values: { apiKey: 'k' } });
    expect(zIntegrationSave.parse({ values: { apiKey: 'k' }, skipTest: true })).toEqual({ values: { apiKey: 'k' }, skipTest: true });
  });

  it('refuses missing values and values that are not strings', () => {
    expect(zIntegrationSave.safeParse({}).success).toBe(false);
    expect(zIntegrationSave.safeParse({ values: { apiKey: 1 } }).success).toBe(false);
  });
});

describe('zTranslatePrimaryUpdate', () => {
  it('only takes a translation integration', () => {
    expect(zTranslatePrimaryUpdate.parse({ value: 'google-translate' })).toEqual({ value: 'google-translate' });
    expect(zTranslatePrimaryUpdate.safeParse({ value: 'unsplash' }).success).toBe(false);
  });
});

describe('INTEGRATIONS', () => {
  it('has unique ids, each found by integrationDefinition', () => {
    const ids = INTEGRATIONS.map(it => it.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(integrationDefinition(id).id).toBe(id);
  });

  it('locks every integration by at least one env var, each one a field env or a lock-only variable', () => {
    const lockOnly = new Set(['GOOGLE_CLOUD_PROJECT']);
    for (const definition of INTEGRATIONS) {
      expect(definition.lockEnv.length, definition.id).toBeGreaterThan(0);
      const fieldEnvs = new Set(definition.fields.map(it => it.env));
      for (const env of definition.lockEnv) expect(fieldEnvs.has(env) || lockOnly.has(env), `${definition.id} ${env}`).toBe(true);
    }
  });

  it('never makes a secret or file field optional', () => {
    for (const field of INTEGRATIONS.flatMap(it => it.fields)) {
      if (field.type !== 'text') expect(field.optional, field.key).toBeFalsy();
    }
  });
});
