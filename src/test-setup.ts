import { vi } from 'vitest';

// Registered once via the test builder's `setupFiles` option (angular.json) instead of being
// declared per-spec-file with `vi.mock`. The Angular vitest builder runs all spec files with
// `test.isolate: false` (shared module registry across the whole run, to mirror the old
// Karma/Jasmine model), so multiple spec files each declaring their own `vi.mock` for this same
// module compete over one shared registration — which one "wins" isn't deterministic run-to-run,
// causing intermittent `NG0201: No provider for Functions` failures in unrelated spec files.
// A single global mock removes the ambiguity.
vi.mock('@angular/fire/functions', () => ({
  Functions: class MockFunctions {},
  httpsCallableData: vi.fn(),
}));

// Same reasoning as above, generalized to Firestore: enough spec files now stub Firestore's
// write/read functions that per-file `vi.mock('@angular/fire/firestore', ...)` factories started
// colliding under `test.isolate: false`, surfacing as nondeterministic
// `ReferenceError: Cannot access '...' before initialization` failures depending on which spec
// files land in the same worker. Individual specs still customize behavior per test via
// `vi.mocked(fn).mockReturnValue(...)` / `mockImplementation(...)` — only the mock *registration*
// is centralized here.
vi.mock('@angular/fire/firestore', async () => {
  const actual = await vi.importActual<typeof import('@angular/fire/firestore')>('@angular/fire/firestore');
  return {
    ...actual,
    collection: vi.fn().mockReturnValue({ path: 'mock-collection-ref' }),
    doc: vi.fn().mockReturnValue({ path: 'mock-doc-ref' }),
    query: vi.fn((ref: unknown, ...constraints: unknown[]) => ({ ref, constraints })),
    orderBy: vi.fn((field: string, direction?: string) => ({ type: 'orderBy', field, direction })),
    where: vi.fn((field: string, op: string, value: unknown) => ({ type: 'where', field, op, value })),
    limit: vi.fn((n: number) => ({ type: 'limit', n })),
    documentId: vi.fn(() => '__name__'),
    collectionData: vi.fn(),
    collectionCount: vi.fn(),
    docData: vi.fn(),
    addDoc: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
  };
});

// Same reasoning, for Storage.
vi.mock('@angular/fire/storage', async () => {
  const actual = await vi.importActual<typeof import('@angular/fire/storage')>('@angular/fire/storage');
  return {
    ...actual,
    ref: vi.fn().mockReturnValue({ path: 'mock-storage-ref' }),
    uploadBytes: vi.fn().mockResolvedValue(undefined),
    uploadBytesResumable: vi.fn().mockResolvedValue(undefined),
    getDownloadURL: vi.fn(),
  };
});

// Same reasoning, for Remote Config.
vi.mock('@angular/fire/remote-config', async () => {
  const actual = await vi.importActual<typeof import('@angular/fire/remote-config')>('@angular/fire/remote-config');
  return {
    ...actual,
    getAllChanges: vi.fn(),
  };
});
