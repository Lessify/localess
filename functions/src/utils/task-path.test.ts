import { describe, expect, it } from 'vitest';
import { isStagedImportPath } from './task-path';

describe('isStagedImportPath', () => {
  it('accepts the staging path the frontend writes', () => {
    expect(isStagedImportPath('space1', 'spaces/space1/tasks/tmp/1727170000000')).toBe(true);
  });

  it('rejects a staging path of another space', () => {
    expect(isStagedImportPath('space1', 'spaces/space2/tasks/tmp/1727170000000')).toBe(false);
  });

  it('rejects other objects of the same space', () => {
    expect(isStagedImportPath('space1', 'spaces/space1/assets/abc/original')).toBe(false);
    expect(isStagedImportPath('space1', 'spaces/space1/tasks/other/original')).toBe(false);
  });

  it('rejects traversal and suffixes', () => {
    expect(isStagedImportPath('space1', 'spaces/space1/tasks/tmp/../../assets/abc/original')).toBe(false);
    expect(isStagedImportPath('space1', 'spaces/space1/tasks/tmp/123/extra')).toBe(false);
  });

  it('rejects non-string values and unexpected space ids', () => {
    expect(isStagedImportPath('space1', undefined)).toBe(false);
    expect(isStagedImportPath('space1', 42)).toBe(false);
    expect(isStagedImportPath('.*', 'spaces/x/tasks/tmp/1')).toBe(false);
  });
});
