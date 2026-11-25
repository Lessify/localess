# Spaces module: repositories that query, services that shape (design)

> Status: design, 2026-10-19; reviewed by a builder check, the user's answers in. Related: [Server rules](../../server/README.md) ·
> [Controllers, services and repositories](../../server/controllers-services-repositories.md) ·
> [Naming](../../server/naming.md) · [Pagination](../../server/pagination.md) · [Frontend state](../../frontend-state.md)

## Why

The Spaces module reads like spaghetti (the user's words): one `SpaceRow`, assembled in `shared/queries/space.query.ts`
by hand-written SQL subqueries, mixes the database query and the shape the Frontend sees (locales flattened to
`Locale`, the default locale, environments, `legacyId`, `importStatus` computed in SQL). Every repository returns it,
writes included; the transformer only renames fields; six other modules read spaces the same way. The user wants the
layering they are used to: each piece of logic in one obvious place.

## Decided by the user

**Layers**

- **Repository: queries the database, nothing else.** Three read shapes:
  - `findAll(…)`: always an array of entities;
  - `findAllCount(…)`: the count only;
  - `findOne(…)`: the entity or `undefined`.
- **Drizzle relational queries by default** (`db.query.spaces.findMany({ with: … })`); a `select` only where a real
  calculation needs it (counts, aggregates, the overview).
- **Service: every transformation** into the models the Frontend uses.
- **From now on the UI works with the data the endpoint provides**: no reshaping on the server for the UI's convenience;
  the web adapts to the response.
- **Every function declares what it returns** (a new rule): an explicit return type, **in the Spaces module only for
  now** (what this round works on); it widens to each module as that module is reworked.

**Three ways spaces are read**

1. **Admin → Spaces, paged:** every column of the `spaces` table (`id`, `name`, `defaultLocaleId`, `createdAt`,
   `updatedAt`); `findAll(query)` + `findAllCount(query)` in the repository, `Page<…>` built in the service. The
   Firebase import information lives here only: each item also carries its `firebaseImport` (status, Firestore id),
   and the table shows them after the name (the "Importing" / "Import failed" badge is there today; the Firestore id joins
   it). Space Settings → General drops its "Imported from Firebase: <id>" line.
2. **The sidebar list, not paged, minimal:** a new unified type `IdName` (`{ id, name }`) in `@localess/shared`, for
   other lists to reuse later; a new endpoint answers `IdName[]` of every space. `SpaceStore` keeps only that list
   (minimalistic); after a selection it fetches what the space's screens need.
3. **The selected space:** `SpaceStore` fetches
   - `GET /api/app/spaces/:spaceId`: the space with its default locale and its locales (relational query:
     `with: { defaultLocale, spaceLocales: { with: { locale } } }`), no environments;
   - `GET /api/app/spaces/:spaceId/environments`: the environments, requested separately (new `findAll` of the
     space-environment controller, service, repository).
   The schemas and documents keep their own endpoints.

**A shared space repository** (the server's `shared/` module) for the other modules: whether a space exists, and a
space with all its locales and its default one for their business rules (a value only for a space locale, the
fallback to the default). It replaces `shared/queries/space.query.ts` and `SpaceRow`.

## Goals

1. The Spaces module's repositories hold only queries in the three shapes; its services hold every transformation.
2. `SpaceRow`, `selectSpaces`, `findSpace`, `requireSpace` and the SQL-computed columns are gone; the other modules
   read a space through the shared space repository.
3. The web's `SpaceStore` holds `IdName[]` and the selected space; the screens read the shapes the endpoints answer.
4. Every function of the Spaces module declares its return type, and a check keeps it so.

## Non-goals

- The other modules' own repositories (contents, assets, translations, …) beyond how they read a space: the same rules
  apply to them in later rounds, one module at a time.
- The web's code beyond `SpaceStore` and what reads the selected space and the space list.
- Return types in the other server modules (each in its own round) and in the web app (a separate decision).

## Anti-goals

- **The v1 APIs change shape.** The CDN (`/api/v1`) and Management (`/api/manage/v1`) responses of a space
  (`toPublicSpace`: id, name, locales, default locale, …) and the legacy (Firestore) space id resolution
  (`shared/http/space-id.ts`, 503 while importing) stay exactly as they are; only how the server reads the space behind
  them changes.
- A repository that transforms, throws an HTTP error, or calls a service; a service that writes SQL.
- A repository method that returns the assembled Frontend model.

## Models the Frontend sees (the user's decision)

A model of `@localess/shared` mirrors its entity: the table's columns, plus one optional field per relation of
`infra/database/relations.ts`, with the same name. A relation the query did not load (`with`) is absent; one it loaded
is there. No computed fields: the web derives what it shows from the relations (the import badge from
`firebaseImport.status`). The user's example:

```ts
export interface IProject {
  id: string;
  title: string;
  // … the columns
  members?: IProjectMember[];   // a relation: present when joined
  projectTopic?: IProjectTopic; // a relation: present when joined
}
```

For spaces (names my call, following the entities; the `I` prefix is not used in this codebase):

```ts
export interface Space {
  id: string;
  name: string;
  defaultLocaleId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  defaultLocale?: Locale;
  spaceLocales?: SpaceLocale[];
  environments?: SpaceEnvironment[];
  firebaseImport?: FirebaseImport;
  // … every other relation of `spaces`, optional (contents, assets, …), typed when a query first loads it
}
export interface SpaceLocale { spaceId: string; localeId: string; position: number; locale?: Locale; space?: Space }
export interface SpaceEnvironment { id: string; spaceId: string; name: string; url: string; position: number; space?: Space }
```

What each endpoint loads:

| Endpoint | Query | `Space` fields present |
|---|---|---|
| Admin → Spaces, paged | `findAll` + `findAllCount`, `with: { firebaseImport }` | the columns, `firebaseImport` (the table shows the badge and the Firestore id after the name) |
| The sidebar list | the columns `id`, `name` | none: it answers `IdName[]` |
| The selected space | `findOne`, `with: { defaultLocale, spaceLocales: { with: { locale } } }` | the columns, `defaultLocale`, `spaceLocales` (each with `locale`), in position order |
| Its environments | `SpaceEnvironmentRepository.findAll(spaceId)` | answers `SpaceEnvironment[]`, in position order |

- The service maps an entity to its model (dates, leaving out a column the web must never see; none on these
  tables); it adds no fields.
- `legacyId`, `importStatus`, the flattened `locales` and the computed `defaultLocale` leave the `Space` model; every
  web reader of them (about 16 places, and the admin table's badge) moves to the relations; the compiler lists them.
- The other shared models (contents, assets, …) follow the same rule when their module is reworked.

## Other calls (mine, to check)

- **Writes** (create, rename, a locale added, removed or reordered, the default locale, environments): the repository
  writes and returns nothing (or the written entity where the caller needs its id); the service re-reads with
  `findOne` and transforms. What each write endpoint answers (today the whole `Space`) is left to the builder, within
  "the web adapts": the web refetches through the live query anyway.
- **The shared space repository** (`shared/repositories/space.repository.ts`, `SharedSpaceRepository` or the like):
  `exists(spaceId): Promise<boolean>`, `findOne(spaceId): Promise<SpaceSelect | undefined>` with
  `defaultLocale` and `spaceLocales.locale`. The modules' own `space.repository.ts` copies (assets, contents, schemas,
  tasks) and `requireSpace` calls inside transactions move to it; a module's service turns "not found" into its 404.
  A write inside a transaction that needs the space reads it through the shared repository with the transaction.
- **The rule's check:** the architecture test fails on a public method, or an exported function or arrow function,
  without a declared return type, in `modules/spaces/` (the user's scope; the next module's round adds its folder).
  Private helpers and inline callbacks are not checked (my call).
- **The sidebar's `IdName[]`** leaves out spaces that are importing or whose import failed, as today (they can not be
  opened, and the space guard trusts the list), sorted by name (my call).

## Left to the builder

- The sidebar endpoint's path (`GET /api/app/spaces/names` or `?view=` on the list): a path that cannot be taken for a
  space id.
- How `SpaceStore` fetches and keeps the selected space and its environments (live queries, as today), and the space
  guard (an id in the `IdName[]` list).
- Order of the work (shared repository first, then the Spaces module, then the web), and how the other modules move to
  the shared repository.
- Tests: the repositories (each shape), the services (each transformation, the 404s), the new endpoints, the
  architecture check; the web store and its readers; the e2e suites that read spaces (`AppApi` helpers, the switcher,
  settings → locales and environments).
- Docs: `docs/server/controllers-services-repositories.md` (the three read shapes, relational first, writes return
  nothing), `naming.md` (return types; `findAll` / `findAllCount` / `findOne`), `architecture.md` (the shared space
  repository; "tables are shared, queries are not" now allows `shared/repositories/` for a table every module reads),
  `docs/frontend-state.md` (`SpaceStore`).
