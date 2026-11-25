import type { FirebaseImport } from '@localess/shared';

import { durationText, originHost, warningCount } from './firebase-import.utils';

describe('firebase import utils', () => {
  const run = (patch: Partial<FirebaseImport>) => ({ startedAt: '2026-10-26T10:00:00.000Z', stages: [], ...patch }) as FirebaseImport;

  it('names the host of an origin, or the origin as given', () => {
    expect(originHost('https://localess-prod.web.app/')).toBe('localess-prod.web.app');
    expect(originHost('not a url')).toBe('not a url');
  });

  it('counts every warning of a run, the ones not kept included', () => {
    expect(
      warningCount(
        run({
          stages: [
            { stage: 'schemas', status: 'DONE', count: 1, warningCount: 2 },
            { stage: 'assets', status: 'DONE', count: 1, warningCount: 60, warnings: ['a'] },
          ],
        }),
      ),
    ).toBe(62);
  });

  it('says how long an ended run took, nothing while it runs', () => {
    expect(durationText(run({}))).toBeUndefined();
    expect(durationText(run({ finishedAt: '2026-10-26T10:00:31.000Z' }))).toBe('31 s');
    expect(durationText(run({ finishedAt: '2026-10-26T10:02:05.000Z' }))).toBe('2 min 5 s');
    expect(durationText(run({ finishedAt: '2026-10-26T10:03:00.000Z' }))).toBe('3 min');
  });
});
