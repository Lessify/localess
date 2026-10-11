# Server architecture: modules and layers

> Related: [apps/server/README.md](../apps/server/README.md) · [Database structure](roadmap/database-structure.md)

How code is organised inside `apps/server/src/modules/<feature>/`: one folder per layer, one job per layer. Every new
or changed module follows it; modules not yet moved are listed under [Status](#status).

## Layers

| Layer | Folder | Does | Never does |
|---|---|---|---|
| **Controller** | `controllers/` | Handles the request and sends the response: validates the body and params (zod pipes), authorises (guards, token checks), calls the service, sets HTTP details (status, headers, `Cache-Control`, redirects, v1 error bodies) | Touches the database, holds business rules |
| **Service** | `services/` | All business logic: rules and validation against the domain (a value only for a space locale), orchestration of repositories, external providers, webhooks after commit; returns domain models through a transformer | Writes queries, knows the request or the reply |
| **Transformer** | `transformers/` | Pure mapping from one model to another, mostly a database entity to the API DTO / shared model | I/O, decisions |
| **Repository** | `repositories/` | Every database action: queries, writes, transactions, locks, change events (`pg_notify`); turns constraint violations into errors | Business rules, HTTP, calling services |

Two folders for what is none of the four:

| Folder | What goes there |
|---|---|
| `utils/` | Pure functions without I/O: parsing, hashing, formatting, algorithms (`buildTranslationMap`, `image-transform`, `asset-etag`) |
| `workers/` | Background work outside a request (the task worker, the Firebase import runner) |

A module creates only the folders it needs. The `<feature>.module.ts` stays at the module root. Unit tests sit next
to the file they test (`utils/stable-json.test.ts`); integration tests stay in `apps/server/test/`.

```
modules/translations/
  translations.module.ts
  controllers/   translations.controller.ts  translate.controller.ts  translations.public.controller.ts
  services/      translations.service.ts  translation-delivery.service.ts  translate.service.ts
  repositories/  translations.repository.ts  translation-snapshots.repository.ts
  transformers/  translation.transformer.ts
  utils/         translation.utils.ts  translate-batch.ts  chunk-by-size.ts  translate-format.utils.ts
```

## Models

- **Entities** are the Drizzle rows. The schema stays in one file, `infra/database/schema.ts` (drizzle-kit generates
  the migrations from it); each repository exports its entity type (`TranslationEntity = typeof translations.$inferSelect`).
- **Domain models and API DTOs** are the types in `@localess/shared` (one definition for server and web). A transformer
  maps an entity to them; controllers send what the service returns.

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
  savepoint inside it, so an action across repositories commits or rolls back as a whole (a space locale change drops
  the translation drafts in the same transaction).
- **Repository → repository** is allowed, passing the transaction, to keep data consistent. A repository never calls a
  service.
- **Webhooks and other side effects outside the database** run in the service, after the repository returned, so they
  only fire for committed data.
- **Checks:** business validation (a value only for a space locale) is the service's. Integrity is the database's and
  the repository's: unique keys and foreign keys are constraints, and the repository turns a violation into an error
  (`ConflictException`), or answers `undefined` for a row that is not there, which the service turns into a 404.

## Ownership

- **Each table belongs to one module**, and only that module's repositories query it (translations owns
  `translations` and `translation_snapshots`). Other modules use those repositories, never the table. Exception: the Firebase import writes a whole space in one transaction
  (`modules/firebase-import`), documented there.
- **Repositories are registered once, globally** (`infra/database/repositories.module.ts`): they depend only on the
  database and on each other, so any service can inject any repository without module imports, and cross-module
  dependencies (spaces ↔ translations) can't form Nest module cycles.

## Naming

`<name>.controller.ts`, `<name>.service.ts`, `<name>.repository.ts`, `<name>.transformer.ts`; utils by what they do
(`translation.utils.ts`, `chunk-by-size.ts`). Classes `TranslationsController`, `TranslationsService`,
`TranslationsRepository`; transformer functions `toTranslation(entity)`.

## Status

| Module | Layered |
|---|---|
| translations | ✅ (pilot) |
| assets, contents, firebase-import, plugins, schemas, settings, spaces, tasks, tokens, webhooks, users (in `auth/`) | not yet |

Until a module is moved, it may still query tables directly; when it touches a table owned by a moved module, it goes
through that module's repository.
