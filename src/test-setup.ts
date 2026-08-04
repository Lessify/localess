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
