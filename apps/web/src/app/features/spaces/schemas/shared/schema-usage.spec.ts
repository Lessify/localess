import { SchemaUsage } from '@localess/shared';

import { describeSchemaUsage } from './schema-usage';

describe('describeSchemaUsage', () => {
  const usage = (fields: SchemaUsage['fields'], count: number, first: SchemaUsage['contents']['first'] = []): SchemaUsage => ({
    fields,
    contents: { count, first },
  });

  it('is undefined when nothing uses the schema', () => {
    expect(describeSchemaUsage(usage([], 0))).toBeUndefined();
  });

  it('lists the referring fields and the first contents, saying how many more there are', () => {
    const first = ['a', 'b', 'c', 'd', 'e'].map(name => ({ name, fullSlug: `docs/${name}` }));

    expect(describeSchemaUsage(usage([{ schema: 'page', field: 'items' }, { schema: 'article', field: 'blocks' }], 7, first))).toBe(
      [
        'Referenced by the fields:',
        '• page › items',
        '• article › blocks',
        'Used by 7 contents:',
        '• a (docs/a)',
        '• b (docs/b)',
        '• c (docs/c)',
        '• d (docs/d)',
        '• e (docs/e)',
        '• and 2 more',
      ].join('\n'),
    );
  });

  it('names one content in the singular', () => {
    expect(describeSchemaUsage(usage([], 1, [{ name: 'Home', fullSlug: 'home' }]))).toBe('Used by 1 content:\n• Home (home)');
  });
});
