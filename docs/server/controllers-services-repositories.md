# Controllers, services and repositories

> Part of the [server rules](README.md). The layers in short: [Architecture](architecture.md#layers). Names:
> [Naming](naming.md).

## One set per entity and sub-entity

- **Rule:** a module holds one controller, one service and one repository per entity it serves, and one set per
  sub-entity: what is addressed under another entity's id and has rows of its own (`/spaces/:spaceId/locales`,
  `/webhooks/:id/logs`, `/tasks/:id/logs`). A service may use any repository of its module; a sub-entity's service
  reads the parent through the parent's repository (404 when it is not there).
- **Why:** each file is about one thing, small enough to read; a sub-entity's methods are the plain ones (`create`,
  `remove`, `reorder`) instead of `addLocale`, `removeEnvironment` on the parent.
- **Example:** spaces: `space`, `space-locale`, `space-environment`; webhooks: `webhook`, `webhook-log`; tasks: `task`,
  `task-log`.
- **Don't:** one controller for the entity and everything under it.

**Not a sub-entity:**

- Another kind of the same row: an asset or content folder is the asset or content with `kind = FOLDER`, one tree,
  served by the asset and content sets.
- An action on the entity: `publish`, `clone`, `rename`, `status`, `password-reset-link` stay on its controller.

**A rule several sets follow** lives once, as a helper in the module (or in `shared/data-rules/` when other modules
write the same table): `modules/spaces/repositories/space-change.ts` (`changeSpace`) is the rule that a change of a
space, its locales or its environments touches the space's `updated_at` and sends one `spaces` event, in one
transaction; the three repositories call it.

## Controllers

- **Rule:** a controller handles the request and the reply only: it declares each parameter's schema, its permission,
  calls one service method and returns its result.
  - Validation: `@Body({ schema: zX }) body: X`, `@Query({ schema: zXPageable }) query: XPageable`,
    `@Query('type', { schema: zSchemaTypeFilter })`; the global `StandardSchemaValidationPipe` (`app.factory.ts`)
    hands the handler the parsed value (coerced, defaulted, trimmed). A refused one is a 400 with the NestJS body:
    `{ statusCode, error, message: ["path: issue", …] }` (the web shows `message[0]`).
  - An id in the path: `@Param('id', UuidParamPipe)`, which answers 404 (not 400) for a malformed one.
  - Permissions: `@RequirePermission(...)` (or `@RequireAnyRole()`, `@RequireAllPermissions(...)`) on each method,
    the same the UI checks.
  - Multipart fields and the v1 Management API's own error bodies are parsed with `zX.safeParse` in the handler.
- **Why:** the HTTP details stay in one layer; everything else is testable without a request.
- **Example:** `modules/spaces/controllers/space-locale.controller.ts`.
- **Don't:** import `zod` or a repository (the architecture test refuses both), define a schema inline, put a rule in a controller.

## Services

- **Rule:** a service holds every business rule: checks against the domain (a locale must be one of the space's),
  orchestration of the module's repositories, external providers, side effects after the commit (webhooks), the 404
  for a missing row (`NotFoundException` when a repository answers `undefined`), and the mapping to the API model
  through a transformer (`toSpace`, `toPage(rows, total, query, toTask)`).
- **Why:** one place for the rules, whichever route or worker calls them.
- **Example:** `modules/spaces/services/space-locale.service.ts`.
- **Don't:** write a query, know the request or the reply, return a database entity to a controller.

## Repositories

- **Rule:** a repository is every database action of its entity: queries, writes, locks, change events (`pg_notify`),
  in its own transaction or the caller's (`tx?: Transaction`, see [Transactions](architecture.md#transactions)).
  Reads answer `undefined` or `[]` when there is nothing; constraint violations become errors (`ConflictException`).
  A paged read is `findPage(query)`: see [Pagination](pagination.md#server).
- **Why:** the data stays consistent whoever writes it; services stay free of SQL.
- **Example:** `modules/spaces/repositories/space-environment.repository.ts`.
- **Don't:** call a service, throw a 404, hold a business rule.

## Models (request shapes)

- **Rule:** what a client sends (bodies, queries, multipart fields) is a zod schema in `models/<entity>.models.ts`,
  next to its type ([names](naming.md#models)). The shared type is reused with `satisfies z.ZodType<X>` when
  `@localess/shared` has it. Generic validators stay shared: `infra/http/zod.ts` (`zLabels`, `zPreviewUrl`),
  `@localess/shared/zod` (`zPageable`, `zMultiValue`, `zContentData`). A paged list's sort fields live here, so a
  repository imports its query type from `models/` and a controller never imports a repository.
- **Why:** the schema and its type cannot drift; one definition of a model shared with the web.
- **Example:** `modules/tasks/models/task.models.ts`.
- **Don't:** import NestJS in a model file; redeclare a shared type.
