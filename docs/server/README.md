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
- **Names:** singular file names whose class matches the file; controller, service and repository method names
  (with the listed exceptions).
- **Request models:** no `zX` declared in the server; every schema an App API controller validates with comes from
  `@localess/shared/zod`, with its type `X` next to it.

A rule that changes changes here, in the check, and in the code, together.
