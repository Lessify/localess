You are working on the Localess Angular frontend.

Read these docs before making changes:
- [Frontend Architecture](../../docs/frontend-architecture.md) — routing, modules, packages/ui, server integration (HttpClient, SSE, liveQuery)
- [Frontend State](../../docs/frontend-state.md) — NgRx Signal stores, how to read/update state
- [User Permissions](../../docs/frontend-permissions.md) — roles, guards, UI conditionals

Key locations:
- Feature routes: `apps/web/src/app/features/`
- Stores: `apps/web/src/app/core/stores/`
- App-wide API services: `apps/web/src/app/core/services/` (single-feature services live in their feature)
- Reusable UI (components, pipes, directives, validators): `apps/web/src/app/shared/`
- UI components: `packages/ui/`
- Models: `apps/web/src/app/shared/models/`
