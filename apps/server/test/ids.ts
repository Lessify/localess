/** Fixed space UUIDs for tests (version 7, so they look like what `newUuid()` makes). */
export const S1 = '00000000-0000-7000-8000-000000000001';
export const S2 = '00000000-0000-7000-8000-000000000002';
export const SPACE_A = '00000000-0000-7000-8000-00000000000a';
export const SPACE_B = '00000000-0000-7000-8000-00000000000b';
export const SPACE_S = '00000000-0000-7000-8000-00000000000c';
export const EMPTY_SPACE = '00000000-0000-7000-8000-0000000000e0';

/** A UUID of version 7 (time-ordered), as `newUuid()` makes. */
export const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** The content tree `seedContent` creates, by the names the tests use. */
export const C = {
  home: '00000000-0000-7000-8000-00000000c001',
  blog: '00000000-0000-7000-8000-00000000c002',
  post1: '00000000-0000-7000-8000-00000000c003',
  post2: '00000000-0000-7000-8000-00000000c004',
  archive: '00000000-0000-7000-8000-00000000c005',
  old: '00000000-0000-7000-8000-00000000c006',
} as const;

/** The seed name of a content id, for asserting on maps keyed by id. */
export const contentName = (id: string): string => Object.entries(C).find(([, value]) => value === id)?.[0] ?? id;
