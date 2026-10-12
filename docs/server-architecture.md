# Server architecture: modules and layers

> Related: [apps/server/README.md](../apps/server/README.md) · [Database structure](roadmap/database-structure.md)

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
  own job needs (translations reads a space's locales with its `SpaceLocalesRepository`; spaces has its own).
- A module may use `infra/`, `shared/` and `auth/`.

## Auth

`auth/` is not a feature but what every feature relies on: the global `AuthGuard`, the `@Public` / `@Require*`
decorators (`decorators.ts`), `CurrentUser` / `CurrentSessionId` (`request-context.ts`), and `ApiTokensModule`
(`TokenAuthService`, the `/api/v1` token check every module with a public controller imports). Inside it is layered
like a module, and it imports no feature module:

```
auth/
  auth.module.ts  api-tokens.module.ts  auth.guard.ts  decorators.ts  request-context.ts
  controllers/   auth.controller.ts  oauth.controller.ts  app-config.controller.ts
  services/      auth.service.ts  session.service.ts  password-reset.service.ts  oauth.service.ts  token-auth.service.ts
  repositories/  sessions.repository.ts  password-reset-tokens.repository.ts  auth-users.repository.ts  api-tokens.repository.ts
  utils/         password.ts  session-cookie.ts  token-hash.ts  public-url.ts  oauth-providers.ts  api-token.ts
```

`AuthModule` exports `AuthService` (re-checking a password), `SessionService` (signing a user out) and
`PasswordResetService` (reset links) for the users module. Auth reads and writes `users`, `user_credentials` and
`user_identities` with its own `AuthUsersRepository` (sign-in, OAuth, reset); Admin → Users and the own profile are the
users module's, with their own `UsersRepository`.

## Layers

| Layer | Folder | Does | Never does |
|---|---|---|---|
| **Controller** | `controllers/` | Handles the request and sends the response: validates the body and params (zod pipes), authorises (guards, token checks), calls the service, sets HTTP details (status, headers, `Cache-Control`, redirects, v1 error bodies) | Touches the database, holds business rules |
| **Service** | `services/` | All business logic: rules and validation against the domain (a value only for a space locale), orchestration of repositories, external providers, webhooks after commit; returns domain models through a transformer | Writes queries, knows the request or the reply |
| **Transformer** | `shared/transformers/` | Pure mapping from one model to another, mostly a database entity to the API DTO / shared model | I/O, decisions |
| **Repository** | `repositories/` | Every database action: queries, writes, transactions, locks, change events (`pg_notify`); turns constraint violations into errors | Business rules, HTTP, calling services |

Two folders for what is none of the four:

| Folder | What goes there |
|---|---|
| `utils/` | Pure functions without I/O: parsing, hashing, formatting, algorithms (`buildTranslationMap`, `image-transform`, `asset-etag`) |
| `workers/` | Background work outside a request (the task worker, the Firebase import runner) |

A module creates only the folders it needs. The `<feature>.module.ts` stays at the module root. Unit tests sit next
to the file they test (`utils/chunk-by-size.test.ts`); integration tests stay in `apps/server/test/`.

```
modules/translations/
  translations.module.ts
  controllers/   translations.controller.ts  translate.controller.ts  translations.public.controller.ts
  services/      translations.service.ts  translation-delivery.service.ts  translate.service.ts
  repositories/  translations.repository.ts  translation-snapshots.repository.ts  space-locales.repository.ts
  utils/         translation.utils.ts  translate-batch.ts  chunk-by-size.ts  translate-format.utils.ts
```

## Models

- **Entities** are the Drizzle rows. The schema stays in one file, `infra/database/schema.ts` (drizzle-kit generates
  the migrations from it); a repository exports the entity types it returns (`TranslationEntity = typeof translations.$inferSelect`).
- **Domain models and API DTOs** are the types in `@localess/shared` (one definition for server and web). Transformers
  map an entity to them; they all live in `shared/transformers/`, one place for every module (contents and translations
  both write `updated_by` with `updatedByOf`). Controllers send what the service returns.

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
| `shared/repositories/` | What those services read and write | `WebhookDeliveryRepository`, `StorageDeletionsRepository` |
| `shared/models/` | Entity types that auth and every module name, without importing a module | `user.ts`: `UserRow` (the signed-in user, `CurrentUser`) |
| `shared/transformers/` | Every transformer | `toUser`, `toPrincipal`, `UserDto` (user.transformer.ts: auth and users), `toTranslation`, `translationsByKey`, `toSchema`, `schemasByName`, `updatedByOf`, `toContent`, `toContentMetadata`, `toAssetMetadata` (content.transformer.ts), `toAsset` (asset.transformer.ts), `toTask`, `toTaskLog` (task.transformer.ts), `assetToExport`, `contentToExport`, `translationToExport` (transfer.transformer.ts: export file entries, the export tasks), `toFirebaseImport` (firebase-import.transformer.ts) |
| `shared/data-rules/` | Rules every module that writes a table follows, inside its own transaction | `translation-drafts.ts`: `lockTranslations`, `dropTranslationDrafts`, `dropTranslationLocale`: whoever changes translations, a space's locales or its default locale drops the draft maps under the translations lock (translations, spaces, the task import) |
| | | `content-version.ts`: `bumpContentVersion` (every write that changes what the content API serves: contents, schemas, assets, the import tasks) |
| | | `storage-deletions.ts`: `scheduleAssetFilesDeletion`, `scheduleSpaceFilesDeletion`, `guardUpload`, `releaseUploadGuards` (every module that deletes rows with stored files, or stores a file before its row) |
| `shared/queries/` | Queries several modules build on (plain functions taking the database or a transaction) | `space.query.ts`: `selectSpaces`, `findSpace`, `requireSpace`, `SpaceRow` (a space with its locales, environments and import status) |
| | | `user.query.ts`: `findUserLogins` (how each user signs in: password, OAuth providers), for `toUser` in auth and users |
| | | `schema.query.ts`: `applySchemaPushPlan`, the write of a schema push plan (the CLI push in schemas, the schema import task), inside the caller's transaction; `lockSchemaReferences`, which locks the schemas written fields refer to (schemas, the schema import task) |
| `shared/http/` | Request plumbing that knows the domain | `space-id.ts`: resolves a legacy (Firestore) space id and answers 503 while a space imports; `events.controller.ts` + `event-access.ts`: the SSE change stream, filtered by what the user may see |
| `shared/utils/` | Pure functions several modules use | `webhook-request.ts` (SSRF-checked requests: webhook delivery, the Firebase client) |
| | | `schema.utils.ts` (`planSchemaPush`, `checkSchemaFields`, `fieldRefersTo`, `isSchemaChanged`, `docSchemaToExport`), `stable-json.ts`, `labels.utils.ts` (`isLabelsEqual`): schemas and the schema import/export tasks |
| | | `asset-path.utils.ts` (`folderPath`): assets and the asset import task; `embedded-alt.ts`, `media-duration.ts`, `media-orientation.ts`, `media-pages.ts` (`isAnimatedPages`, also asset delivery): `AssetMetadataService` |

A new shared service (a queue, a message broker) goes in `shared/services/` and is added to `SharedModule`. `infra/`
stays technical (database connection, storage drivers, events, HTTP plumbing) and knows no domain.

## Naming

`<name>.controller.ts`, `<name>.service.ts`, `<name>.repository.ts`, `<name>.transformer.ts`; utils by what they do
(`translation.utils.ts`, `chunk-by-size.ts`). Classes `TranslationsController`, `TranslationsService`,
`TranslationsRepository`; transformer functions `toTranslation(entity)`.

## Status

| Module | Layered |
|---|---|
| translations, settings, tokens, webhooks, plugins, spaces, schemas, contents, assets, tasks, users, firebase-import (and `auth/`) | ✅ |

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
  repositories/  firebase-imports.repository.ts  space-import.repository.ts  token-import.repository.ts
                 webhook-import.repository.ts  translation-import.repository.ts  schema-import.repository.ts
                 asset-import.repository.ts  content-import.repository.ts
  utils/         firebase-client.ts  firebase-docs.ts  rewrite-references.ts  firebase-import.utils.ts
```
