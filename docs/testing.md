# Frontend Testing

> Related: [Frontend Architecture](frontend-architecture.md) · [Frontend State](frontend-state.md)

## Overview

Tests run with **Vitest** + `happy-dom`, via Angular's `@angular/build:unit-test` builder (`npm test`). Specs use Jasmine-style `describe`/`it` (globals enabled), but mocking is Vitest's (`vi.fn()`, `vi.mock()`, `vi.mocked()`), not Jasmine spies.

```bash
npm test                                              # full suite
npx ng test --watch=false --include="path/to/*.spec.ts"  # a subset
```

A root `vitest-base.config.ts` sets **`test.isolate: true`**. The Angular builder auto-discovers this file (`angular.json`'s unit-test `runnerConfig: true` triggers `@angular/build`'s `findVitestBaseConfig` lookup) and merges it on top of its own internal default of `isolate: false`, so the external file wins — each spec file gets its own fresh module registry today. This wasn't always the case, and it's the reason the Firebase mocking pattern below looks the way it does — see "Why this must stay centralized" for the history and why the pattern remains correct even under `isolate: true`.

## Coverage scope

**`libs/ui/**` is excluded from unit test coverage.** It's the Spartan/Helm component library (Brain headless primitives + Helm styling layer, 44+ components) — third-party-style, largely unmodified UI building blocks, not app logic. Unit-testing them has a poor cost/benefit ratio; if a `libs/ui` component needs verification, prefer exercising it indirectly through the feature component that uses it. Everything under `src/app/**` is in scope.

---

## Global Firebase mocks (`src/test-setup.ts`)

`src/test-setup.ts` is registered once via `angular.json`'s `test.options.setupFiles`. It globally mocks five `@angular/fire/*` modules: `functions`, `firestore`, `storage`, `remote-config`, `auth`. Every spec that touches one of these gets the mocked version automatically — **do not** add a per-spec-file `vi.mock('@angular/fire/firestore', ...)` (or `functions`/`storage`/`remote-config`/`auth`) for the same module.

### Why this must stay centralized

This pattern was born from a real cross-file collision, back when the builder was still running with its internal default of `test.isolate: false` (one shared module registry per worker, mirroring the old Karma/Jasmine model — see the note above about `vitest-base.config.ts` now overriding this to `true`). When multiple spec files each declared their own `vi.mock('@angular/fire/firestore', factory)`, the mocks collided:

- **Symptom 1:** `NG0201: No provider for Functions` in unrelated spec files (which is why `functions` was centralized first).
- **Symptom 2:** `ReferenceError: Cannot access '...' before initialization`, thrown from inside the mock factory, in a handful of spec files that happened to land in the same worker as another file locally mocking the same module (whether that other file mocked `firestore`, `storage`, or `remote-config` — any per-file `vi.mock` of an already-globally-mocked module could trigger it).

Both symptoms were non-deterministic with respect to *which* files failed — it depended on how Vitest distributed spec files across workers, not on anything wrong with an individual test. The fix was the same in both cases: one global mock registration per module, in `setupFiles`, and nowhere else.

**Under today's `test.isolate: true`, each spec file gets a fresh module registry, so that specific cross-file collision shouldn't reproduce anymore** — but the centralized pattern is still the right one, for reasons independent of the isolation setting:

- `setupFiles` execute for every spec file regardless of isolation mode, so centralizing is what keeps the ~20+ service specs from each re-declaring an identical `vi.mock('@angular/fire/firestore', ...)` boilerplate block.
- It keeps exactly one source of truth for default mock behavior (e.g. `updateDoc` resolving to `undefined`) instead of specs silently disagreeing on defaults.
- It's a safety net against regression — if isolation is ever turned back off (`vitest-base.config.ts` removed or edited), there's nothing left to collide because there's only one registration per module.

**If you add a new spec file that needs Firestore/Storage/Remote Config/Functions/Auth:** just import the (already-mocked) functions from `@angular/fire/*` — do not add your own `vi.mock` block for those specifiers.

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
| `Auth`'s free functions (`updateProfile`, `updateEmail`, `updatePassword`, `sendPasswordResetEmail`, `signInWithEmailAndPassword`, `signInWithPopup`, `signOut`) | Globally mocked in `test-setup.ts`, same pattern as `firestore`/`storage`/`remote-config` — import directly, do not add a local `vi.mock('@angular/fire/auth', ...)` | `me.service.spec.ts` |
| `HttpClient` | `{ provide: HttpClient, useValue: { get: vi.fn() } }` | `asset.service.spec.ts` (`importFile()`) |
| A real service used only as a DI token in another spec (e.g. a store test stubbing `SpaceService`) | `{ provide: SpaceService, useValue: { findAll: () => of(spaces) } }` — do **not** add a `vi.mock` for the service's own module just to stub it | `space.store.spec.ts` |

`@angular/fire/auth`'s free functions are now globally mocked in `test-setup.ts` too (they were originally left local to `me.service.spec.ts` since it was the only consumer, but any spec referencing `MeService` — even just as a `useValue`-stubbed DI token — loaded the real module and reintroduced the same collision risk, so it was centralized following the same pattern as `firestore`/`storage`/`remote-config`). Don't add a local `vi.mock('@angular/fire/auth', ...)` for it.

---

## Adding a new service spec

Follow the shape already used across `src/app/shared/services/*.spec.ts` (e.g. `webhook.service.spec.ts`, `token.service.spec.ts`):

1. No local `vi.mock` for `@angular/fire/{firestore,functions,storage,remote-config,auth}` — import directly, they're already mocked.
2. A `setup()` helper that calls `TestBed.configureTestingModule({ providers: [...] })` with empty-object stubs for injected Firebase tokens, then `TestBed.inject(YourService)`.
3. `afterEach(() => vi.clearAllMocks())`.
4. Per test: `vi.mocked(fn).mockReturnValue(...)` / `.mockResolvedValue(...)`, call the service method, assert on both the emitted value and the call args passed to the mocked Firestore function (e.g. the second arg to `updateDoc`/`addDoc`/`setDoc` via `toMatchObject`).
5. Run the new spec in isolation first (`--include="path/to/new.spec.ts"`), then run the full suite — a spec that passes alone but not in the full run usually means a stray local `vi.mock` of an already-globally-mocked `@angular/fire/*` module, not a bug in the new test.
