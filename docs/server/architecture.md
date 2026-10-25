# Server architecture: modules and layers

> Part of the [server rules](README.md): this page is the big picture; [organisation](controllers-services-repositories.md),
> [naming](naming.md) and [pagination](pagination.md) hold the detailed rules. Related:
> [apps/server/README.md](../../apps/server/README.md) · [Database structure](../roadmap/database-structure.md)

How server code is organised: independent feature modules (`apps/server/src/modules/<feature>/`), one folder per layer
inside each, and a `shared/` module for what every module uses. Every module follows it, and every new one must.

```
src/
  infra/     technical plumbing: config, database (connection, schema, migrations, transaction()), storage, events, http
  shared/    what every module may use: services (mail, webhook delivery), models, transformers, data rules, utils
  modules/   independent features, each with its own layers
  auth/      sessions, OAuth, password reset, guard, decorators, token checks: cross-cutting, layered like a module
```

## Modules are independent

- A module has its **own** controllers, services and repositories, registered in its own `<feature>.module.ts`.
- **No module imports another feature module.** What it needs from elsewhere, it reads with its own query.
- **Tables are shared, queries are not.** Several modules may read and write the same table, each with the queries its
  own job needs (translations reads a space's locales with its `SpaceLocaleRepository`; spaces has its own).
- **Except a read every module makes the same way:** it is one repository in `shared/repositories/`
  (`SpaceLookupRepository`: a space and its locales), not a copy per module.
- A module may use `infra/`, `shared/` and `auth/`.

## Auth

`auth/` is not a feature but what every feature relies on: the global `AuthGuard`, the `@Public` / `@RequireRole`
decorators (`decorators.ts`; who may do what: one role per user, the lists of `@localess/shared` `roles.ts`,
[User Roles](../frontend-permissions.md)), `CurrentUser` / `CurrentSessionId` (`request-context.ts`), and `ApiTokenModule`
(`TokenAuthService` and the token guards, which every module with a CDN or Management controller imports). Inside it is layered
like a module, and it imports no feature module:

```
auth/
  auth.module.ts  api-token.module.ts  auth.guard.ts  decorators.ts  request-context.ts
  controllers/   auth.controller.ts  oauth.controller.ts  app-config.controller.ts
  services/      auth.service.ts  session.service.ts  password-reset.service.ts  oauth.service.ts  token-auth.service.ts
  repositories/  session.repository.ts  password-reset-token.repository.ts  auth-user.repository.ts  api-token.repository.ts
  utils/         password.ts  session-cookie.ts  token-hash.ts  public-url.ts  oauth-providers.ts  api-token.ts
```

`AuthModule` exports `AuthService` (re-checking a password), `SessionService` (signing a user out) and
`PasswordResetService` (reset links) for the users module. Auth reads and writes `users`, `user_credentials` and
`user_identities` with its own `AuthUserRepository` (sign-in, OAuth, reset); Admin → Users and the own profile are the
users module's, with their own `UserRepository`.

## Layers

| Layer | Folder | Does | Never does |
|---|---|---|---|
| **Controller** | `controllers/` | Handles the request and sends the response: validates the body and params (zod pipes), authorises (guards, token checks), calls the service, sets HTTP details (status, headers, `Cache-Control`, redirects, v1 error bodies) | Touches the database, holds business rules |
| **Service** | `services/` | All business logic: rules and validation against the domain (a value only for a space locale), orchestration of repositories, external providers, webhooks after commit; returns domain models through a transformer | Writes queries, knows the request or the reply |
| **Transformer** | `shared/transformers/` | Pure mapping from one model to another, mostly a database entity to the API DTO / shared model | I/O, decisions |
| **Repository** | `repositories/` | Every database action: queries, writes, transactions, locks, change events (`pg_notify`); turns constraint violations into errors | Business rules, HTTP, calling services |

How a module splits into controllers, services and repositories (one set per entity and sub-entity), and what each
layer may do in detail: [Controllers, services and repositories](controllers-services-repositories.md). Every name:
[Naming](naming.md).

Two folders for what is none of the four (request shapes are not here: they live in `@localess/shared`,
[rules](controllers-services-repositories.md#models-request-shapes)):

| Folder | What goes there |
|---|---|
| `utils/` | Pure functions without I/O: parsing, hashing, formatting, algorithms (`buildTranslationMap`, `image-transform`, `asset-etag`) |
| `workers/` | Background work outside a request (the task worker, the Firebase import runner) |

A module creates only the folders it needs. The `<feature>.module.ts` stays at the module root. Unit tests sit next
to the file they test (`utils/chunk-by-size.test.ts`); integration tests stay in `apps/server/test/`.

```
modules/translations/
  translation.module.ts
  controllers/   translation.controller.ts  translate.controller.ts  translation.cdn.controller.ts  translation.management.controller.ts
  services/      translation.service.ts  translation-delivery.service.ts  translate.service.ts
  repositories/  translation.repository.ts  translation-snapshot.repository.ts  space-locale.repository.ts
  utils/         translation.utils.ts  translate-batch.ts  chunk-by-size.ts  translate-format.utils.ts
```

## Models

- **Entities** are the Drizzle rows. The schema stays in one file, `infra/database/schema.ts` (drizzle-kit generates
  the migrations from it). Their types are in `shared/entities/`, one file per table (`translation.entity.ts`:
  `TranslationEntity` the row, `TranslationInsertEntity` the row to insert, `TranslationSelect` the row with its
  relations from `infra/database/relations.ts`), and nowhere else: an entity is what the
  database holds, a model of `@localess/shared` is what the API exposes, and a transformer maps one to the other.
  A repository's narrower or wider shape is built from them (`Pick<ContentSnapshotEntity, …>`, `SpaceWithLocales`: a
  `SpaceEntity` with its default locale and locales).
- **Domain models and API DTOs** are the types in `@localess/shared` (one definition for server and web). Transformers
  map an entity to them; they all live in `shared/transformers/`, one place for every module. Controllers send what the service returns.
- **Request models** (what a client sends: bodies, queries) are in `@localess/shared` too: the zod schema `zX` and its
  type `X` side by side, one definition for the server's validation and the web's body
  ([rules](controllers-services-repositories.md#models-request-shapes)).

## Transactions

A repository method is one consistent database action, and it owns its transaction:

```ts
update(spaceId: string, id: string, values: TranslationUpdate, tx?: Transaction): Promise<TranslationEntity | undefined> {
  return transaction(this.db, tx, async t => {
    // lock, write, drop the draft snapshots, pg_notify: everything that must change with the row
  });
}
```

- **Its own transaction by default.** Everything that keeps the data consistent with the write happens inside it:
  locks, related rows (dropping draft snapshots), change events.
- **Or the caller's.** Every method that writes takes an optional `tx`. Given one, `transaction()` runs the work as a
  savepoint inside it, so an action across repositories of the module commits or rolls back as a whole.
- **Repository → repository** within the module is allowed, passing the transaction. A repository never calls a
  service.
- **Data rules** that every writer of a table must follow, whatever the module, are functions in `shared/data-rules/`,
  called inside the writer's transaction (see [Shared](#shared)).
- **Webhooks and other side effects outside the database** run in the service, after the repository returned, so they
  only fire for committed data.
- **Checks:** business validation (a value only for a space locale) is the service's. Integrity is the database's and
  the repository's: unique keys and foreign keys are constraints, and the repository turns a violation into an error
  (`ConflictException`), or answers `undefined` for a row that is not there, which the service turns into a 404.

## Shared

`shared/` is the `SharedModule` (global) plus plain functions; any module may use it, it uses no feature module.

| Folder | What goes there | Today |
|---|---|---|
| `shared/services/` | Services every module may inject, provided by `SharedModule` | `MailService`, `WebhookDispatcher`, `AssetMetadataService` (size, duration, orientation, embedded alt of a stored file: assets, the asset import and metadata tasks, the Firebase import), `StorageSweeperService` (deletes queued stored files, hourly and when kicked) |
| `shared/repositories/` | What those services read and write, and the reads every module shares | `WebhookDeliveryRepository`, `StorageDeletionRepository`; `SpaceLookupRepository` (`space-lookup.repository.ts`): whether a space exists, and the space with its default locale and locales (`SpaceWithLocales`), for every module that checks a locale or falls back to the default |
| `shared/entities/` | The database entity types, one file per table: `<entity>.entity.ts` with `<Entity>Entity` (`$inferSelect`), `<Entity>InsertEntity` (`$inferInsert`) and `<Entity>Select` (with its relations, for `db.query … { with }`); never sent as they are (a transformer maps them to the shared models) | `user.entity.ts`: `UserEntity` (the signed-in user, `CurrentUser`), `asset.entity.ts`, `content-snapshot.entity.ts`, … |
| `shared/transformers/` | Every transformer | `toUser` (user.transformer.ts: the shared `User`, auth and users), `toTranslation`, `translationsByKey`, `toSchema`, `schemasByName`, `toContent`, `toContentMetadata`, `toAssetMetadata` (content.transformer.ts), `toAsset` (asset.transformer.ts), `toTask`, `toTaskLog` (task.transformer.ts), `assetToExport`, `translationToExport` (transfer.transformer.ts: export file entries, the export tasks), `toFirebaseImport` (firebase-import.transformer.ts) |
| `shared/data-rules/` | Rules every module that writes a table follows, inside its own transaction | `translation-drafts.ts`: `lockTranslations`, `dropTranslationDrafts`, `dropTranslationLocale`: whoever changes translations, a space's locales or its default locale drops the draft maps under the translations lock (translations, spaces, the task import); `space-tokens.ts`: `createPreviewToken`: whoever inserts a space writes its auto-generated preview token (spaces, the first admin's starter space, the Firebase import); `content-refs.ts`: `contentRefs`: whoever writes a document's data stores the ids it points to (`assets`, `links`, `references`, for the CDN to resolve) worked out from that data, never taken from a client (the editor's save, space templates) |
| | | `content-snapshots.ts`: `lockContents`, `dropContentDrafts`, `dropContentLinks`, `dropContentLocale`: whoever writes contents, a space's locales or its default locale drops the snapshots it makes stale under the contents lock (contents, spaces, the content import task, the Firebase import) |
| | | `storage-deletions.ts`: `scheduleAssetFilesDeletion`, `scheduleSpaceFilesDeletion`, `guardUpload`, `releaseUploadGuards` (every module that deletes rows with stored files, or stores a file before its row) |
| `shared/queries/` | Queries several modules build on (plain functions taking the database or a transaction) | `content-tree.query.ts`, `asset-tree.query.ts` (the trees' paths and subtrees) |
| | | `user.query.ts`: `USER_SIGN_IN` (the `with` of every user the App API answers: `identities`, and the credential's key for `hasPassword`), `UserWithSignIn`; for `toUser` in auth and users |
| | | `schema.query.ts`: `applySchemaPushPlan`, the write of a schema push plan (the CLI push in schemas, the schema import task), inside the caller's transaction; `lockSchemaReferences`, which locks the schemas written fields refer to (schemas, the schema import task) |
| `shared/http/` | Request plumbing that knows the domain | `space-id.ts`: resolves a legacy (Firestore) space id and answers 503 while a space imports. No controllers: every endpoint lives in a module (the SSE change streams are `modules/events/`) |
| `shared/utils/` | Pure functions several modules use | `webhook-request.ts` (SSRF-checked requests: webhook delivery, the Firebase client); `paging.ts` (`offsetOf`, `toPage`, `containsPattern`, `escapeLike`: see [Pagination](pagination.md)) |
| | | `schema.utils.ts` (`planSchemaPush`, `checkSchemaFields`, `fieldRefersTo`, `isSchemaChanged`, `docSchemaToExport`), `stable-json.ts`, `labels.utils.ts` (`isLabelsEqual`): schemas and the schema import/export tasks |
| | | `asset-path.utils.ts` (`folderPath`): assets and the asset import task; `embedded-alt.ts`, `media-duration.ts`, `media-orientation.ts`, `media-pages.ts` (`isAnimatedPages`, also asset delivery): `AssetMetadataService` |

A new shared service (a queue, a message broker) goes in `shared/services/` and is added to `SharedModule`. `infra/`
stays technical (database connection, storage drivers, events, HTTP plumbing) and knows no domain.

## Naming

Files, classes, methods, models, utils: [Naming](naming.md).

## Status

| Module | Layered |
|---|---|
| translations, settings, tokens, webhooks, plugins, spaces, schemas, contents, assets, tasks, users, firebase-import, events (and `auth/`) | ✅ |

Every module is layered.

**firebase-import is deliberately self-contained.** It writes every table of a space (spaces, space locales and
environments, tokens, webhooks, translations, schemas, assets and their files, contents, its `firebase_imports` runs)
with its own repositories, written for the import (bulk inserts, the space created with its run link in one
transaction), and borrows no other module's repository or service. It still follows the shared data rules (the
content `cv` bump when the import finished) and uses the shared `AssetMetadataService` for imported files:

```
modules/firebase-import/
  firebase-import.module.ts
  controllers/   firebase-import.controller.ts
  services/      firebase-import.service.ts  space-import.service.ts  token-import.service.ts  webhook-import.service.ts
                 translation-import.service.ts  schema-import.service.ts  asset-import.service.ts
                 content-import.service.ts  reference-rewrite.service.ts
  workers/       firebase-import.runner.ts
  repositories/  firebase-import.repository.ts  space-import.repository.ts  token-import.repository.ts
                 webhook-import.repository.ts  translation-import.repository.ts  schema-import.repository.ts
                 asset-import.repository.ts  content-import.repository.ts
  utils/         firebase-client.ts  firebase-docs.ts  rewrite-references.ts  firebase-import.utils.ts
```
