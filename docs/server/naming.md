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

## Entities

- **Rule:** `apps/server/src/shared/entities/<entity>.entity.ts`, one file per table, singular, holds three types:

  ```ts
  export type SpaceEntity = typeof spaces.$inferSelect;        // the row
  export type SpaceInsertEntity = typeof spaces.$inferInsert;  // the row to insert
  export type SpaceSelect = SpaceEntity & {                    // the row with its relations
    defaultLocale?: LocaleSelect | null;
    spaceLocales?: SpaceLocaleSelect[] | null;
    environments?: SpaceEnvironmentSelect[] | null;
    // …
  };
  ```

  The relations are those of `infra/database/relations.ts` (one per foreign key, camelCase; a table related to itself
  names its pair: `parent` / `children`), each optional: present when the relational query asked for it
  (`db.query.spaces.findFirst({ with: { environments: true } })`). A shape built from an entity otherwise is named
  for what it is (`StoredContentSnapshot = Pick<ContentSnapshotEntity, …>`; the query results `SpaceRow`,
  `ContentWithPath`, until relational reads replace them).
- **Why:** an entity (what the database holds, `…Entity`) is never mistaken for a model the web sees (`@localess/shared`,
  no suffix); one definition per table instead of one per repository.
- **Example:** `shared/entities/asset.entity.ts`, used by `AssetRepository`, the asset transformer and the transfers.
- **Don't:** `typeof table.$inferSelect` anywhere else (the architecture test refuses it); `Row`, `Record`, `New…` or
  `NewImported…` names for a table's type; a relation in `<X>Select` that `relations.ts` does not have.

## Models

- **Rule:** an App API request (body, query, multipart fields) is defined once, in `@localess/shared`:
  `packages/shared/src/models/<entity>.zod.ts` holds the zod schema `zX` and, next to it,
  `export type X = z.infer<typeof zX>`: `zSpaceCreate` / `SpaceCreate`, `zSpacePageable` / `SpacePageable`. The
  server validates with `zX` (`@localess/shared/zod`); the web types its body with `X` (`@localess/shared`, type only,
  so it never loads zod). The constants both sides need (`SPACE_SORT_FIELDS`, `PASSWORD_MIN_LENGTH`) live in the
  entity's `.model.ts`, and a name that is already a domain model is never reused (`TaskImport` is the import task,
  so its request is `TaskImportCreate`).
- **Rule, by what the route does** (the entity is the controller's, a sub-entity included):

  | Route | Model | Example |
  |---|---|---|
  | Create (`POST`, method `create`) | `<Entity>Create` | `SpaceCreate`, `SpaceLocaleCreate`, `TaskCreate` |
  | Update (`PATCH`, or `PUT` replacing it, method `update`) | `<Entity>Update` | `SpaceUpdate`, `SpaceEnvironmentUpdate`, `MeUpdate` |
  | An action (any other write) | `<Entity><Action>` | `SpaceLocaleOrder`, `SpaceLocaleSetDefault`, `SchemaRename`, `AssetMove`, `UserStatusUpdate`, `TaskImportCreate`, `AuthLogin` |
  | A list | `<Entity>Pageable` | `SpacePageable` |

- **Why:** one definition for the server's validation and the web's body: a field added on one side is a compile
  error on the other, not a second interface to keep in step.
- **Example:** `packages/shared/src/models/space.zod.ts`; the web's `core/services/space.service.ts`
  (`{ name } satisfies SpaceUpdate`).
- **Don't:** `createSchema`, `listSchema`, `XQuery`, `XDto` for a request; a schema in the server; an interface in
  `@localess/shared` or the web that repeats a request (a form shape derives from it: `Pick<AssetFolderCreate, 'name'>`).
