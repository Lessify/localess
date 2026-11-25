# Server rules

How server code is written (`apps/server/src`): the rules every module follows and every new one must. These pages
are the reference; the dated specs in `docs/superpowers/` are the decision records behind them (why, when, what was
weighed), not the rules.

| Page | Read when |
|---|---|
| [Architecture](architecture.md) | Modules and layers, auth, transactions, the `shared/` module: the big picture |
| [Controllers, services and repositories](controllers-services-repositories.md) | Adding or splitting a controller, service or repository; validation; request models (in `@localess/shared`) |
| [Naming](naming.md) | Naming any file, class, method, model or util |
| [Pagination](pagination.md) | Any list endpoint or table that may grow; the step-by-step for a new paged list |

## How a rule is written

Each rule says, in this order:

- **Rule**: what to do, in one or two sentences.
- **Why**: the reason, so an exception can be judged.
- **Example**: a real file in the repo that follows it.
- **Don't**: the mistake it prevents.

## What checks them

Docs drift; checks do not. `apps/server/test/architecture.test.ts` (part of `pnpm server:test`) scans
`apps/server/src` and fails when a rule is broken:

- **Imports:** a controller imports neither `zod` nor a repository; a repository imports no service.
- **Access:** every route declares who may call it: `@Public`, a token (`@CdnToken`, `@ManagementToken`), `@RequireRole` or
  `@SignedIn` (on the method or its controller); the guard refuses a session route that declares none.
- **Return types:** every public method and exported function of a module (`modules/`) declares one.
- **Queries:** a count or an existence check is `$count` (no `count()` imported from `drizzle-orm`), in every
  module. Relational reads over `select` are reviewed, not checked.
- **Names:** singular file names whose class matches the file; injected services and repositories named after their
  class (`spaceRepository`); controller, service and repository method names
  (with the listed exceptions).
- **Entities:** a table's type (`$inferSelect`, `$inferInsert`) only in `shared/entities/<entity>.entity.ts`, as
  `<Entity>Entity`, `<Entity>InsertEntity` and `<Entity>Select`.
- **Request models:** no `zX` declared in the server; every schema an App API controller validates with comes from
  `@localess/shared/zod`, with its type `X` next to it.

`eslint.config.js` in `apps/server`, `packages/shared` and `apps/e2e` (part of `pnpm lint`, run in CI; the web has its
own, with angular-eslint) checks what a compile does not: `eslint:recommended`
and typescript-eslint's type-aware `recommendedTypeChecked` (a promise not awaited or passed where a callback is
expected, `any` spreading from untyped values, an `unknown` printed in a template: use `errorMessage(error)` from
`shared/utils/error-message.ts`, an assertion the compiler does not need, an enum compared with an unrelated value), and
the order of imports and exports (`simple-import-sort`, as the web; `pnpm lint:fix` sorts them). In e2e a floating
promise is an `expect` or an action without `await`: a step that never ran.
In tests (and in all of apps/e2e) the `no-unsafe-*` rules are off (a response's `json()` is `any`). Off everywhere: `require-await`
(`async () => value` is how a promise-returning callback is written). Not used: `consistent-type-imports`, whose fix
would turn the classes Nest injects by their runtime type into type imports. A disable says why
(`// eslint-disable-next-line <rule> -- <reason>`); an unused one is an error. `lint` in the server and e2e builds
`packages/shared` first: they read its types from `dist`.

A rule that changes changes here, in the check, and in the code, together.
