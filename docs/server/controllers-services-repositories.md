# Controllers, services and repositories

> Part of the [server rules](README.md). The layers in short: [Architecture](architecture.md#layers). Names:
> [Naming](naming.md).

## One set per entity and sub-entity

- **Rule:** a module holds one controller, one service and one repository per entity it serves, and one set per
  sub-entity: what is addressed under another entity's id and has rows of its own (`/spaces/:spaceId/locales`,
  `/webhooks/:webhookId/logs`, `/tasks/:id/logs`). A service may use any repository of its module; a sub-entity's service
  reads the parent through the parent's repository (404 when it is not there): `exists` when the check is all it
  needs, `findOne` only when a rule reads the parent (`space.spaceLocales`).
- **Why:** each file is about one thing, small enough to read; a sub-entity's methods are the plain ones (`create`,
  `remove`, `move`) instead of `addLocale`, `removeEnvironment` on the parent.
- **Example:** spaces: `space`, `space-locale`, `space-environment`, `space-token`; webhooks: `webhook`, `webhook-log`; tasks: `task`,
  `task-log`.
- **Don't:** one controller for the entity and everything under it.

**Not a sub-entity:**

- Another kind of the same row: an asset or content folder is the asset or content with `kind = FOLDER`, one tree,
  served by the asset and content sets.
- An action on the entity: `publish`, `clone`, `rename`, `status`, `password-reset-link`, `default-locale` (a column of the space, set apart from `PATCH` as its own process) stay on its controller.

**A rule several sets follow** lives once, as a helper in the module (or in `shared/data-rules/` when other modules
write the same table): `modules/spaces/repositories/space-change.ts` (`changeSpace`) is the rule that a change of a
space, its locales or its environments runs under the space's row lock (changes of one space one after the other,
each re-checking under it what a service's check could have missed: the default locale stays one of the space's,
409 otherwise), touches the space's `updated_at` and sends one `spaces` event, in one transaction; the three
repositories call it.

## Controllers

- **Rule:** a controller handles the request and the reply only: it declares each parameter's schema, its roles,
  calls one service method and returns its result.
  - Validation: `@Body({ schema: zX }) body: X`, `@Query({ schema: zXPageable }) query: XPageable`,
    `@Query('type', { schema: zSchemaTypeFilter })`; the global `StandardSchemaValidationPipe` (`app.factory.ts`)
    hands the handler the parsed value (coerced, defaulted, trimmed). A refused one is a 400 with the NestJS body:
    `{ statusCode, error, message: ["path: issue", …] }` (the web shows `message[0]`).
  - An id in the path, `:spaceId` included: `@Param('spaceId', UuidParamPipe)`, which answers 404 (not 400) for a
    malformed one. The service then checks that the row exists (404); a repository does not check an id's format.
    Done in the Spaces, Users, Webhooks, Translations and Schemas modules; the others still lean on `isUuid` in their
    repositories (and in `SpaceLookupRepository`) until they are reworked. The v1 controllers answer their own error body, not the pipe's.
  - Roles: `@RequireRole(CONTENT_WRITERS)` (a list of `@localess/shared` `roles.ts`, or one role) on each method or the controller,
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

- **Rule:** a repository is every database action of its entity, and only that: queries, writes, locks, change events
  (`pg_notify`), in its own transaction or the caller's (`tx?: Transaction`, see
  [Transactions](architecture.md#transactions)). It answers entities, never a model the web sees.
  - **Three read shapes:** `findAll(…)` always an array of entities (`XEntity[]` / `XSelect[]`), `findAllCount(…)` the
    count only (the same filters as `findAll`), `findOne(…)` the entity or `undefined`. A narrower read keeps the
    shape and says what it reads (`findAllNames(): Pick<SpaceEntity, 'id' | 'name'>[]`).
  - **Counts and existence are `$count`:** `this.db.$count(table, where)` for `findAllCount` (the same `where` as
    `findAll`), `(await this.db.$count(table, where)) > 0` for `exists` / `is<What>`. One `count(*)`, no row read, no
    destructuring. Checked by the architecture test in the modules reworked so far.
  - **Reads are relational queries:** `this.db.query.spaces.findMany` / `findFirst` with `where`, `orderBy`, `columns`
    for a narrow read (`findAllNames`: `columns: { id: true, name: true }`), `with` for the relations of
    `infra/database/relations.ts` (a related row's fields through `with`, not a join), `findFirst` with
    `orderBy: desc(…)` for the last one (`create`'s next position), inside a transaction through `t.query`.
  - **A `select` only where a relational query can not:** a calculation beyond a count (the overview's sums, a count
    per locale with `group by`), a subquery inside a condition or an `orderBy` (`inArray(column, select…)`,
    `notExists(…)`), a lock (`.for('update')`: the relational API has none; `changeSpace` locks the space's row).
    Each one says why in a comment, unless it is one of those three at a glance.
  - **Writes answer nothing** (`Promise<void>`), or the new id when the caller needs it to read the row back
    (`SpaceRepository.create`); the service re-reads with `findOne` and maps.
  - Constraint violations become errors (`ConflictException`).
- **Why:** each layer has one job: the repository knows the database, the service the rules and the models.
- **Example:** `modules/spaces/repositories/space.repository.ts` (`findAll`, `findAllCount`, `findAllNames`,
  `findOne`, `exists`, `isImporting`); `space-environment.repository.ts`; `space-overview.repository.ts` (`$count`
  and the selects of its sums).
- **Don't:** call a service, throw a 404, hold a business rule, answer a transformed model, re-read inside a write to
  answer it; count with `select({ total: count() })` or check existence with `findFirst({ columns: { id: true } })`;
  read rows with `select().from()` (or a join) a relational query expresses.

Reworked so far: the Spaces, Webhooks, Users and Translations modules (`REWORKED` in `apps/server/test/architecture.test.ts`). The others still read
with `findPage` (rows and total together), count with `select({ … count() })` (assets, contents, schemas,
tasks) and some writes answer rows; each module moves to these shapes when it is reworked, and
joins `REWORKED` then.

**Reading a space from another module:** `SpaceLookupRepository` (`shared/repositories/space-lookup.repository.ts`,
injected as `spaceLookupRepository`): `exists(spaceId, tx?)` and `findOne(spaceId, tx?)` answering a
`SpaceWithLocales` (the space, its default locale, its locales in position order). The module's service turns
`undefined` into its 404.

## Models (request shapes)

- **Rule:** what a client sends (bodies, queries, multipart fields) is defined once in `@localess/shared`
  (`packages/shared/src/models/<entity>.zod.ts`): the zod schema `zX` and its type `X` ([names](naming.md#models)).
  - The server validates with it: `@Body({ schema: zX }) body: X` (`zX` from `@localess/shared/zod`, `X` from
    `@localess/shared`); services and repositories take `X` too (`SpacePageable` in `findAll` / `findAllCount`).
  - The web sends it: the body literal is checked against the type, `this.http.patch(url, { name } satisfies
    SpaceUpdate)`; multipart fields with `multipartForm(fields: AssetUpload, file)` (`core/utils/multipart.ts`).
  - Shared helpers: `common.zod.ts` (`zLabels`, `zPreviewUrl`), `page.zod.ts` (`zPageable`, `zMultiValue`),
    `content.zod.ts` (`zContentData`).
  - A hand-written type stays only where the inferred one is weaker, and the schema is then checked against it:
    `zTranslateData satisfies z.ZodType<TranslateData>` (its `?: never` members refuse `content` with `items`).
- **Why:** the server and the web cannot drift: a field added to the schema is a compile error in the web until it
  sends it.
- **Example:** `packages/shared/src/models/task.zod.ts`, used by `modules/tasks/controllers/task.controller.ts` and
  the web's `core/services/task.service.ts`.
- **Don't:** a schema in the server (the architecture test refuses one), an interface that repeats a request.
