# Frontend Testing

> Related: [Frontend Architecture](frontend-architecture.md) · [Frontend State](frontend-state.md)

## Overview

Tests run with **Vitest** + `happy-dom`, via Angular's `@angular/build:unit-test` builder (`npm test`). Specs use Jasmine-style `describe`/`it` (globals enabled), but mocking is Vitest's (`vi.fn()`, `vi.mock()`, `vi.mocked()`), not Jasmine spies.

```bash
npm test                                              # full suite
npx ng test --watch=false --include="path/to/*.spec.ts"  # a subset
```

The builder runs the whole suite with **`test.isolate: false`** (one shared module registry per worker, to mirror the old Karma/Jasmine model) — this has real consequences for how Firebase mocking must be structured, covered below.

---

## Global Firebase mocks (`src/test-setup.ts`)

`src/test-setup.ts` is registered once via `angular.json`'s `test.options.setupFiles`. It globally mocks four `@angular/fire/*` modules: `functions`, `firestore`, `storage`, `remote-config`. Every spec that touches one of these gets the mocked version automatically — **do not** add a per-spec-file `vi.mock('@angular/fire/firestore', ...)` (or `functions`/`storage`/`remote-config`) for the same module.

### Why this must stay centralized

Under `test.isolate: false`, the module registry is shared across every spec file in a worker. When multiple spec files each declared their own `vi.mock('@angular/fire/firestore', factory)`, the mocks collided:

- **Symptom 1:** `NG0201: No provider for Functions` in unrelated spec files (which is why `functions` was centralized first).
- **Symptom 2:** `ReferenceError: Cannot access '...' before initialization`, thrown from inside the mock factory, in a handful of spec files that happened to land in the same worker as another file locally mocking the same module (whether that other file mocked `firestore`, `storage`, or `remote-config` — any per-file `vi.mock` of an already-globally-mocked module can trigger it).

Both symptoms are non-deterministic with respect to *which* files fail — it depends on how Vitest distributes spec files across workers, not on anything wrong with an individual test. The fix is the same in both cases: one global mock registration per module, in `setupFiles`, and nowhere else.

**If you add a new spec file that needs Firestore/Storage/Remote Config/Functions:** just import the (already-mocked) functions from `@angular/fire/*` — do not add your own `vi.mock` block for those specifiers. If you hit `Cannot access '...' before initialization` in a full-suite run that passes in isolation, this is almost certainly the cause — search for a stray local `vi.mock` of an `@angular/fire/*` module and remove it.

### What's mocked vs. real

Each global mock spreads `await vi.importActual(...)` first, then overrides only the functions that perform I/O or need call-assertion support (`doc`, `collection`, `addDoc`, `updateDoc`, `deleteDoc`, `setDoc`, `docData`, `collectionData`, `collectionCount`, `query`, `orderBy`, `where`, `limit`, `documentId`, storage's `ref`/`uploadBytes*`/`getDownloadURL`, remote-config's `getAllChanges`). Pure value/sentinel helpers — `serverTimestamp`, `arrayUnion`, `arrayRemove`, `deleteField`, `Firestore`, `WithFieldValue`, etc. — are left real, since tests compare against their actual output (e.g. `expect(updatedFields).toMatchObject({ locales: arrayRemove(entity) })`).

### Per-test customization

The global mocks are shared `vi.fn()` instances with sane defaults (writes resolve to `undefined`; `doc`/`collection` return a fixed `{ path: 'mock-doc-ref' }` / `{ path: 'mock-collection-ref' }`). Configure return values per test, not per file:

```typescript
import { collectionData, doc, Firestore, updateDoc } from '@angular/fire/firestore';
import { vi } from 'vitest';

describe('SomeService', () => {
  afterEach(() => {
    vi.clearAllMocks(); // clears call history; does NOT remove the default mockResolvedValue/mockReturnValue
  });

  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Firestore, useValue: {} }] });
    return TestBed.inject(SomeService);
  }

  it('reads a collection', async () => {
    const service = setup();
    vi.mocked(collectionData).mockReturnValue(of([{ id: '1' }]));

    const result = await firstValueFrom(service.findAll('space-1'));

    expect(result).toEqual([{ id: '1' }]);
  });
});
```

Use `vi.clearAllMocks()` (not `resetAllMocks()`) in `afterEach` — `reset` would also wipe the global defaults (like `updateDoc`'s `mockResolvedValue(undefined)`), forcing every test to re-supply them.

`Firestore`/`Storage`/`Functions`/`RemoteConfig` are provided as empty objects (`{ provide: Firestore, useValue: {} }`) purely as DI tokens — the mocked functions from `@angular/fire/firestore` etc. don't actually use the injected instance, so an empty object is enough. Assertions on `doc`/`collection` calls check against this same `{}`: `expect(doc).toHaveBeenCalledWith({}, 'spaces/space-1/schemas/s1')`.

---

## Other Firebase / DI mocking patterns

Not everything needs module-level mocking — prefer the narrowest option:

| Dependency | Pattern | Example |
|---|---|---|
| `Firestore`, `Storage`, `Functions`, `RemoteConfig` | `{ provide: X, useValue: {} }` (empty stub token) | see above |
| `Auth` | `{ provide: Auth, useValue: { currentUser } }` — set `currentUser` per test to exercise both branches | `translation.service.spec.ts`, `me.service.spec.ts` |
| `Auth`'s free functions (`updateProfile`, `updateEmail`, `updatePassword`) | Local `vi.mock('@angular/fire/auth', ...)` — these aren't in the global setup since only `me.service.spec.ts` needs them | `me.service.spec.ts` |
| `HttpClient` | `{ provide: HttpClient, useValue: { get: vi.fn() } }` | `asset.service.spec.ts` (`importFile()`) |
| A real service used only as a DI token in another spec (e.g. a store test stubbing `SpaceService`) | `{ provide: SpaceService, useValue: { findAll: () => of(spaces) } }` — do **not** add a `vi.mock` for the service's own module just to stub it | `space.store.spec.ts` |

`@angular/fire/auth`'s free functions are the one Firebase-adjacent module still mocked locally (only one spec file needs it) — if a second spec file starts needing it, promote it to `test-setup.ts` following the same pattern as `firestore`/`storage`/`remote-config`, rather than adding a second local `vi.mock`.

---

## Adding a new service spec

Follow the shape already used across `src/app/shared/services/*.spec.ts` (e.g. `webhook.service.spec.ts`, `token.service.spec.ts`):

1. No local `vi.mock` for `@angular/fire/{firestore,functions,storage,remote-config}` — import directly, they're already mocked.
2. A `setup()` helper that calls `TestBed.configureTestingModule({ providers: [...] })` with empty-object stubs for injected Firebase tokens, then `TestBed.inject(YourService)`.
3. `afterEach(() => vi.clearAllMocks())`.
4. Per test: `vi.mocked(fn).mockReturnValue(...)` / `.mockResolvedValue(...)`, call the service method, assert on both the emitted value and the call args passed to the mocked Firestore function (e.g. the second arg to `updateDoc`/`addDoc`/`setDoc` via `toMatchObject`).
5. Run the new spec in isolation first (`--include="path/to/new.spec.ts"`), then run the full suite — a spec that passes alone but not in the full run is the signature of the isolation issue described above, not a bug in the new test.
