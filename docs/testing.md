# Frontend Testing

> Related: [Frontend Architecture](frontend-architecture.md) · [Frontend State](frontend-state.md)

## Overview

Tests run with **Vitest** + `happy-dom`, via Angular's `@angular/build:unit-test` builder (`pnpm test`). Specs use Jasmine-style `describe`/`it` (globals enabled), but mocking is Vitest's (`vi.fn()`, `vi.mock()`, `vi.mocked()`), not Jasmine spies.

```bash
pnpm test                                                                                     # full suite
pnpm --filter @localess/web exec ng test --watch=false --include="src/app/path/to/*.spec.ts"  # a subset
```

A root `vitest-base.config.ts` sets **`test.isolate: true`**. The Angular builder auto-discovers this file (`angular.json`'s unit-test `runnerConfig: true` triggers `@angular/build`'s `findVitestBaseConfig` lookup) and merges it on top of its own internal default of `isolate: false`, so the external file wins — each spec file gets its own fresh module registry.

The server (`apps/server/`) has its own suite: `pnpm server:test` (Vitest against a real embedded Postgres; see [apps/server/README.md](../apps/server/README.md)).

## Test scope

**No coverage configuration exists** — not in `angular.json`, `vitest-base.config.ts` or `package.json` (`@vitest/coverage-v8` is installed as a devDependency but nothing wires it up). There are no specs under `packages/ui/**`: it's the Spartan/Helm component library (Brain headless primitives + Helm styling layer, 44+ components) — largely unmodified UI building blocks, not app logic. If a `packages/ui` component needs verification, exercise it indirectly through the feature component that uses it. Specs live under `apps/web/src/app/**`.

---

## Testing services: HttpClient, not module mocks

Services talk to the NestJS API through `HttpClient` (see [frontend-architecture.md](frontend-architecture.md)).
Specs provide the real HttpClient with the testing backend and assert on requests:

```ts
TestBed.configureTestingModule({
  providers: [
    provideHttpClient(),
    provideHttpClientTesting(),
    // Live queries (liveQueryWith) subscribe to change events; drive them from a Subject.
    { provide: ChangeEventsService, useValue: { changes: () => events } },
  ],
});
const http = TestBed.inject(HttpTestingController);

const result = firstValueFrom(service.findAll('space-1'));
http.expectOne('/api/app/spaces/space-1/schemas').flush([{ id: 's1' }]);
expect(await result).toEqual([{ id: 's1' }]);
```

- Call `http.verify()` in `afterEach`, so unexpected requests fail the test.
- Assert method, URL, and `request.request.body` for writes; for multipart bodies read the
  `FormData` with `forEach` (the spec tsconfig's lib has no `FormData.entries()`).
- Test live refetching with `vi.useFakeTimers()`: emit a `ChangeEvent` on the subject, advance past
  the 100 ms debounce, and `expectOne` the refetch. `schema.service.spec.ts` is the reference.
- Component specs whose dependencies inject services just add `provideHttpClient()` +
  `provideHttpClientTesting()`; specs that need a signed-in user stub `UserStore` with signals.
- `apps/web/src/test-setup.ts` registers nothing today. There used to be global `vi.mock`s of the
  `@angular/fire/*` modules there (centralized because per-file mocks of the same module collided
  under `isolate: false`); they went with the Firebase SDK. Prefer DI stubs over `vi.mock` — if a
  module mock is ever unavoidable, register it once in `test-setup.ts`, for the same reason.

## Adding a new service spec

1. Copy the setup above (`provideHttpClient`, `provideHttpClientTesting`, `ChangeEventsService` stub).
2. One test per public method: URL, method, body, and how the response is mapped.
3. One live-refetch test if the service has live reads.
4. `pnpm --filter @localess/web exec ng test --watch=false --include="src/app/core/services/<name>.service.spec.ts"`.
