# Localess web

The Angular admin UI (`@localess/web`): Angular 21, standalone components, NgRx Signals, Spartan/Helm and
Tailwind 4. The production build (`dist/browser`) is served by [`apps/server`](../server/README.md).

## Commands

From the repo root:

```bash
pnpm start        # ng serve on :4200, proxies /api to the server on :3000 (proxy.conf.cjs)
pnpm build        # development build
pnpm build:prod   # production build → apps/web/dist/browser
pnpm test         # Vitest + happy-dom via @angular/build:unit-test
pnpm lint:fix     # ESLint + prettier
```

All of them build `packages/visual-editor-sync` first: its `sync-v1.js` is copied into the app as `/scripts/sync-v1.js`.

## Layout

```
src/app/
├── core/      # app-wide singletons and state (@core/*): api/, services/, stores/, guards/, error-handler/, utils/
├── shared/    # reusable UI only (@shared/*): components/, pipes/, directives/, cross-feature validators/, UI models/
├── features/  # lazy-loaded routes; each owns the services, validators and models only it uses
└── auth/      # login and password reset
```

Code used by one feature lives in that feature; code used by several features (or by a store) goes to `core/`, or
to `shared/` when it is UI. Use `@core/…` and `@shared/…` across areas and relative imports inside a feature.

Domain types come from [`@localess/shared`](../../packages/shared/README.md) (mapped to its source in
`tsconfig.json`), UI components from [`@spartan-ng/helm/*`](../../packages/ui/README.md).

More: [frontend architecture](../../docs/frontend-architecture.md), [state](../../docs/frontend-state.md),
[permissions](../../docs/frontend-permissions.md), [testing](../../docs/testing.md).
