import { describe, expect, it } from 'vitest';

import type { TranslationEntity } from '../entities/translation.entity.js';
import { toTranslation } from './translation.transformer.js';

const at = new Date('2026-10-21T08:00:00.000Z');

const entity: TranslationEntity = {
  id: 't1',
  spaceId: 's1',
  key: 'hello',
  locales: { en: 'Hello', de: 'Hallo' },
  labels: null,
  description: null,
  createdAt: at,
  updatedAt: at,
};

describe('toTranslation', () => {
  it('answers the translation with ISO dates, without its space or null columns', () => {
    expect(toTranslation(entity)).toEqual({
      id: 't1',
      key: 'hello',
      locales: { en: 'Hello', de: 'Hallo' },
      createdAt: '2026-10-21T08:00:00.000Z',
      updatedAt: '2026-10-21T08:00:00.000Z',
    });
  });

  it('carries labels and a description only when set', () => {
    expect(toTranslation({ ...entity, labels: ['ui'], description: 'The greeting' })).toMatchObject({
      labels: ['ui'],
      description: 'The greeting',
    });
    expect(toTranslation({ ...entity, labels: [], description: '' })).not.toHaveProperty('labels');
  });
});
