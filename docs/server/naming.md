# Naming

> Part of the [server rules](README.md). Checked by `apps/server/test/architecture.test.ts`.

## Files and classes

- **Rule:** singular, the entity first, the layer as the suffix: `space.controller.ts` / `SpaceController`,
  `space-locale.service.ts` / `SpaceLocaleService`, `webhook-log.repository.ts` / `WebhookLogRepository`,
  `space.module.ts` / `SpaceModule`. The class name is the file name in PascalCase plus the layer. A CDN or Management
  (v1) controller adds its API: `content.cdn.controller.ts` / `ContentCdnController`,
  `schema.management.controller.ts` / `SchemaManagementController`.
- **Why:** one name per thing, found by its file name; a sub-entity reads as what it is (`space-locale`).
- **Example:** `modules/spaces/` (`space`, `space-locale`, `space-environment`).
- **Don't:** plural names (`spaces.controller.ts`, `SpacesService`), or a name that hides the entity
  (`locales.controller.ts` for a space's locales).

Module folders stay plural (`modules/spaces/`): a folder is the feature area, not one entity.

Other files: `<name>.transformer.ts` with `to<Model>(entity)` functions (`toSpace`); utils by what they do
(`translation.utils.ts`, `chunk-by-size.ts`, `permutation.ts`); workers `<name>.service.ts` or `<name>.runner.ts` in
`workers/`.

## Controller and service methods

- **Rule:** NestJS's convention (the `nest g resource` scaffold), the same name in a controller and the service method
  it calls.

  | Action | Name | Example |
  |---|---|---|
  | A list (paged or not) | `findAll` | `GET /spaces` → `SpaceController.findAll` → `SpaceService.findAll` (answers `Page<Space>`) |
  | One item | `findOne` | `GET /spaces/:spaceId` → `findOne` |
  | Another read | `find<What>` | `findFolders`, `findUsage`, `findTemplates`, `findOverview`, `findSourceSpaces` |
  | Create | `create` | `SpaceLocaleController.create` (`POST /spaces/:spaceId/locales`) |
  | Change | `update`, `update<What>` | `updateData`, `updateAccess` |
  | Delete | `remove`, `remove<What>` | `removeAll` |
  | A domain action | its verb | `publish`, `rename`, `reorder`, `setDefault`, `cancel`, `regenerate`, `invite` |
  | A count | `count` | `GET /contents/count` |

- **Why:** the scaffold every NestJS developer knows; one name across the two layers, so a route is followed by name.
- **Example:** `modules/tasks/controllers/task.controller.ts` and `services/task.service.ts`.
- **Don't:** `list`, `get`, `delete`, `page`, `getById`, or a bare noun (`logs`, `folders`). A sub-entity's methods
  are the plain ones on its own controller (`SpaceEnvironmentController.remove`), not `removeEnvironment` on the
  parent's.

**Exceptions**, named after what they serve, not CRUD: the CDN and Management (v1) controllers (`contentBySlug`,
`translationValues`, `pushSchemas`), auth (`login`, `logout`, `me`, `callback`), infra (`check`, `stream`), and plugins
(`search`, `random`). A service method used only by other services (not a route) is named by what it does
(`createFromTemplate`, `findPublic`, `findOneRow`).

## Repository methods

- **Rule:** data-access names: reads `findPage`, `findAll`, `findById`, `find<What>`, `count`, `exists`; writes
  `create` / `insert<What>`, `update<What>`, `delete<What>`; a database action with its own meaning keeps its verb
  (`claim`, `lock`, `reorder`, `setDefault`, `publish`).
- **Why:** a repository speaks database (rows, `delete`), a service speaks the API (`remove`); `find*` answers
  `undefined` or `[]`, never throws a 404 (the service does).
- **Example:** `modules/spaces/repositories/space-locale.repository.ts`.
- **Don't:** `get*`, `list*`, `remove*`, or HTTP errors in a repository.

## Models

- **Rule:** in `models/<entity>.models.ts`, each zod schema `zX` with its type `X`: `zSpaceCreate` / `SpaceCreate`,
  `zSpaceUpdate` / `SpaceUpdate`, a paged list's query `zSpacePageable` / `SpacePageable` and its
  `SPACE_SORT_FIELDS`. `X` is the `@localess/shared` type when it exists (`zX … satisfies z.ZodType<X>`), otherwise
  `export type X = z.infer<typeof zX>`; a server shape that differs from the shared one gets its own name
  (`ContentPatch`, `UserAccessUpdate`), never the shared name redeclared.
- **Why:** the schema and its type side by side cannot drift; one definition of a shared model.
- **Example:** `modules/spaces/models/space.models.ts`.
- **Don't:** `createSchema`, `listSchema`, `XQuery`, `XDto` for a request; a schema in a controller.
