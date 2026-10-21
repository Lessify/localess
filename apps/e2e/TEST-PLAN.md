# End-to-end test plan

What in Localess can be tested end to end, how, and what is automated today. The suite itself (how a run works,
fixtures, conventions) is described in [README.md](README.md).

**Status:** ✅ automated (spec file in brackets) · ⬜ planned · ➖ out of scope for e2e (covered elsewhere or not
worth it). **Smoke:** tests tagged `@smoke` (`pnpm e2e:smoke`, ~30 s) cover the critical path; the full suite
(`pnpm e2e`, ~1–2 min) runs in CI on every push and pull request.

## How each kind of test works

| Layer | Use it for | How |
|---|---|---|
| **UI** (`ui` project, Chromium) | What a user does: forms, dialogs, lists, navigation, permissions in the shell | Page objects in `tests/pages`; locate by role and label; set up data through the App API (`api` fixture), check the result through the UI *and* the API/CDN |
| **API** (`api` project, no browser) | Contracts other systems depend on: CDN API, Management API, auth and CSRF rules, permissions | `request` / `anonymousRequest()`; tokens created through the App API |
| **Every UI test** | The app does not break silently | The `page` fixture fails a test on any uncaught error or anything reported to Angular's `ErrorHandler` (the "An error occurred." toast); all traffic except the server under test is blocked (offline install) |
| Unit (`pnpm test`, `pnpm server:test`) | Logic, edge cases, error branches | ➖ not this suite; when an e2e test finds a bug, the fix gets a unit test too |

Rules of thumb: one e2e test per user-visible flow, not per branch; every test owns its data (`space`,
`createUser` fixtures), so tests run in parallel and in any order; a change is checked after a reload or through
the API, not only by the toast.

## Catalogue

### 1. Platform and installation

| Scenario | How | Status |
|---|---|---|
| `/api/health` answers `{status: ok}` | API | ✅ `api/platform` @smoke |
| `/api/config` is public; no OAuth providers configured | API | ✅ `api/platform` |
| SPA served at `/` and on deep links (server-side fallback) | API | ✅ `api/platform` @smoke |
| App API needs a session (401) | API | ✅ `api/platform` |
| CSRF: state-changing calls need `X-Requested-With` (403) | API | ✅ `api/platform` |
| Fresh install: migrations on boot, first admin and "Hello World" seeded | UI, every run starts on an empty database | ✅ `auth/login` |
| Works without internet access (no GitHub, no fonts) | All external requests aborted in every UI test | ✅ (fixture) |
| CLI `check`, `admin:create` (password from the environment; the new admin signs in), usage | `node apps/server/dist/cli.js` next to the running server (it attaches to the same embedded Postgres) | ✅ `api/cli` |
| Docker image boots and serves the app | CI job `e2e-docker`: builds the image, runs it (embedded Postgres), then the smoke suite against it (`E2E_BASE_URL`) | ✅ CI |
| Upgrade: a database from the previous release migrates and works | Restore a dump of the last release, boot, run smoke | ⬜ |
| External Postgres (`DATABASE_URL`) instead of embedded | CI job `e2e-postgres`: a Postgres 18 service, the whole suite (`E2E_DATABASE_URL`) | ✅ CI |

### 2. Authentication

| Scenario | How | Status |
|---|---|---|
| Anonymous visit goes to the login page | UI | ✅ `auth/login` |
| Wrong password is rejected | UI | ✅ `auth/login` |
| Seeded admin signs in, session survives a reload | UI | ✅ `auth/login` |
| Deep link opens in a browser that only has the session cookie | UI | ✅ `auth/deep-link` |
| Logout ends the session | UI + API | ✅ `auth/logout` |
| Reset link from an admin sets a new password; old one stops working | UI | ✅ `auth/password-reset` |
| Invalid or used reset link is refused | UI | ✅ `auth/password-reset` |
| Without SMTP the reset page points to an administrator | Unit test (the e2e server has SMTP) | ➖ `reset.component.spec.ts` |
| Reset by email: the mail's link sets a new password, once; an unknown address gets the same answer and no mail | A mail catcher next to the server (`scripts/start-server.mjs`) | ✅ `auth/password-reset` |
| Google / Microsoft sign-in of an invited user (identity linked, shown in Admin → Users); no account, unverified email, disabled account refused with the reason | `oauth2-mock-server` as both issuers, next to the server | ✅ `auth/oauth` |
| Login rate limit: too many attempts are refused as such ("Too many sign-in attempts"), also with the right password, not as a wrong password | UI on the `limits` server (3 attempts a minute) | ✅ `limits/limits` |
| Disabled user can not sign in | API | ✅ `api/permissions`, `admin/users` |
| Disabling a signed-in user signs them out at once | UI: user's page gets sent to login after an admin disables them | ✅ `admin/users` |

### 3. Users and roles

Admin → Users tests follow **pre-check → action → post-check**: the state in the UI and the API before, the action in
the UI, then the table (also after a reload), the API, and what the user can now do with their own session.

| Scenario | How | Status |
|---|---|---|
| Invite as **Admin**: full access, admin area visible | UI + API + the user's session | ✅ `admin/users` |
| Invite as **Translator**: edits translations, no admin area | UI + API + the user's session | ✅ `admin/users` |
| The Role select offers None and the five roles, and describes the chosen one | UI | ✅ `admin/users` |
| Invite as **None**: signs in, no access, asked to contact an administrator | UI + API + the user's session | ✅ `admin/users` |
| Invite with a taken email is refused; the existing user is unchanged | UI + API | ✅ `admin/users` |
| Change role Viewer → Admin → None → Editor; access follows each change | UI + API + the user's session | ✅ `admin/users` |
| Disable (sign-in refused) / enable | UI + API + the user's session | ✅ `admin/users` |
| Disabling signs out a user who is signed in | UI + the user's open session | ✅ `admin/users` |
| The admin can not disable themself | UI | ✅ `admin/users` |
| Copy password reset link; the user sets a new password with it | UI (clipboard) + the user's browser | ✅ `admin/users` |
| Delete a user (sign-in refused); cancelling keeps them | UI + API | ✅ `admin/users` @smoke |
| Email, display name and password of another user | Not a feature: the admin sets them when inviting; later only a reset link (the user changes their own in Me) | ➖ |
| Users are for admins only: a developer has no Users link and the route sends them back; every other role gets 403 on every user route, nothing changed | UI + API | ✅ `admin/users`, `api/user-management` |
| Translator sees translations only; guards redirect elsewhere | UI | ✅ `auth/permissions` |
| User without a role is asked to contact an administrator | UI | ✅ `auth/permissions` |
| A viewer reads, and the API refuses their writes | API | ✅ `api/permissions` |
| Role matrix: every App API route × each role, no role, no session (401 / 403 / let through, never a 5xx) | API, routes and their lists read from the server's `@RequireRole` | ✅ `api/role-matrix` |

### 4. Me (profile)

Each test uses its own user and follows **pre-check → action → post-check** (the page, after a reload, the API, and
whether the account can sign in).

| Scenario | How | Status |
|---|---|---|
| Opens from the user menu; shows email, verification, the role and what it may do | UI | ✅ `me/profile` |
| An admin is shown as Admin, who may do everything | UI | ✅ `me/profile` |
| Display name: page, user menu, API, after a reload | UI + API | ✅ `me/profile` @smoke |
| Avatar URL is used; an invalid URL is refused | UI + API | ✅ `me/profile` |
| Cancelling the profile dialog keeps everything | UI + API | ✅ `me/profile` |
| Email change: sign-in with the new email only, unverified, same account | UI + API + sign-in | ✅ `me/profile` |
| Email change refused: wrong current password, email of another user | UI + API + sign-in | ✅ `me/profile` |
| Password change: old one stops working, other sessions end, this one stays | UI + a second session + sign-in | ✅ `me/profile` @smoke |
| Password change refused: wrong current password; under 6 characters can't be submitted | UI + sign-in | ✅ `me/profile` |
| Google / Microsoft account without a password: email and password can't be changed here | Such accounts come only from auto-register (off in e2e, so unknown accounts stay refused) or an import; needs a second server, or a component test of the Me template | ⬜ |

### 5. Spaces (admin) and space settings

Admin → Spaces and the space settings tests follow **pre-check → action → post-check** (UI, after a reload, and API;
the CDN where a setting changes what it serves).

| Scenario | How | Status |
|---|---|---|
| Create a space; it opens and shows in the switcher | UI + API | ✅ `admin/spaces` @smoke |
| Create: cancelling creates nothing; a name under 3 characters is refused | UI + API | ✅ `admin/spaces` |
| Rename a space (same id); cancelling keeps the name | UI + API | ✅ `admin/spaces` |
| Delete a space with its content; cancelling keeps it | UI + API | ✅ `admin/spaces` |
| Create a space from each template (Empty, E-Commerce, Blog, Marketing Site): its schemas, complete; Space Management alone is enough to choose one | UI + API | ✅ `admin/space-templates` |
| Users and Spaces page, sort and search on the server: 25 rows → 20 + 5, sort by Email descending from page 1, a case-insensitive search, an invited user found by the search at once (live) | UI + API | ✅ `admin/paging` |
| More than 100 spaces: a link to the 101st opens it (the store loads every page); past 10 the switcher has a search box (part of a name, "No spaces found") | UI + API | ✅ `admin/paging` |
| Test templates: the e2e server lists them; the production image (Docker) lists none and refuses one by id (400) | API | ✅ `api/space-templates` (the Docker check @smoke) |
| Switch spaces with the switcher | UI | ✅ `space/navigation` |
| General: rename the space | UI + API | ✅ `space/general` |
| Locales: default locale can not be deleted; add a locale (at the end) | UI + API | ✅ `space/locales` |
| Locales: remove a locale; the CDN serves the default locale's values for it | UI + API + CDN | ✅ `space/locales` |
| Locales: set another default; the old one becomes deletable, missing values fall back to the new one | UI + API + CDN | ✅ `space/locales` |
| Locales: Move Up / Move Down (first and last disabled); the order is not the default | UI + API | ✅ `space/locales` |
| Visual Editor environments: add / edit / remove; the next one becomes the default | UI + API | ✅ `space/environments` |
| Environments: reorder with Move Up / Move Down; `(default)` follows the first; search (name, URL) and sort by name on the server, the default staying the space's first | UI + API | ✅ `space/environments` |
| Access tokens: public token works on the CDN API | UI + API | ✅ `space/tokens` @smoke |
| Management token shown once, must be acknowledged | UI | ✅ `space/tokens` |
| Regenerate cuts off the old value; delete removes access | UI + API | ✅ `space/tokens` |
| Edit a token's name and Cache TTL (300 s, then No Cache); the value is kept | UI + CDN redirect `Cache-Control` | ✅ `space/tokens` |
| Token Form: a name under 3 characters is refused (Save stays disabled); a valid name saves | UI + API | ✅ `space/token-validation` |
| Danger zone: delete all translations; published ones stay until the next publish, contents stay | UI + API + CDN | ✅ `space/danger-zone` |
| Firebase import | Needs a Firebase fixture project | ➖ |

### 6. Translations

Every test uses a space with **English (default), German and Romanian** and follows **pre-check → action → post-check**
(list, detail panel, after a reload, API, and the CDN where publishing matters). Machine translation uses the server's
stub provider, so translated values are exact (`Hello : en -> de`). Specs in `tests/translations/`.

| Scenario | How | Status |
|---|---|---|
| **Add** a key with value, description, labels | UI + API | ✅ `translations/add` @smoke |
| Add with "Translate other locales": German and Romanian machine-translated | UI + API | ✅ `translations/add` |
| Add refuses an existing key, also in other letter case | UI + API | ✅ `translations/add` |
| Add refuses invalid keys (1 character, leading digit, trailing dot, space, non-ASCII); cancel creates nothing | UI + API | ✅ `translations/add` |
| **Edit** the value in English, German and Romanian; the list shows the filter's language | UI + API | ✅ `translations/edit` |
| Save disabled until the value changes | UI | ✅ `translations/edit` |
| Rename a key (same id, all values kept); renaming to an existing key (any case) refused | UI + API | ✅ `translations/edit` |
| Edit description and labels | UI + API | ✅ `translations/edit` |
| An edit reaches the CDN only after Publish (de, ro, en) | UI + CDN | ✅ `translations/edit` @smoke |
| **Delete** one key in all locales, the others stay, gone from the CDN after Publish; cancel keeps it | UI + API + CDN | ✅ `translations/delete` @smoke |
| **Labels**: a single label; add and remove in Edit; duplicates, spaces and 1-character labels refused | UI + API | ✅ `translations/labels` |
| Filter by label, by two labels (any of them), Reset | UI | ✅ `translations/labels` |
| **Language**: the list shows the chosen language's values | UI | ✅ `translations/search` |
| Search keys; search values in the chosen language only (German, Romanian words) | UI | ✅ `translations/search` |
| Status filter: translated / partially over all locales; untranslated in Romanian, in German | UI | ✅ `translations/search` |
| Search + label + status combined | UI | ✅ `translations/search` |
| **Translate** one value into German and Romanian (saved only with Save); from another source; not into itself | UI + API | ✅ `translations/translate` |
| "Translate Locale" fills only missing values; nothing left; with overwrite replaces all | UI + API | ✅ `translations/translate` |
| **List view**: key and value per row, opening a key, 120 keys in the virtual list, live updates | UI + API | ✅ `translations/views` |
| **Tree view**: groups by dots, expand / collapse, selection shown, search filters the tree, layout kept after reload | UI | ✅ `translations/views` |
| Import / export | Hidden behind `FEATURE_FLAGS.importExport` | ➖ until enabled |

**At scale** (`translations/large-space`): a prepared space from the test template "Translations (large)": English,
German, French, 10,000 generated keys, nothing published (`support/large-translations.ts`).

| Scenario | How | Status |
|---|---|---|
| A new space: published refused in every locale (404), the draft (Auto Generated Preview Token) has the generated values | CDN + API | ✅ `translations/large-space` |
| Search a German value in German finds its page's 10 keys; in English, none | UI | ✅ `translations/large-space` |
| Filter by label (`cta`), by status (Untranslated, Partially Translated, Translated) over the template's gaps | UI | ✅ `translations/large-space` |
| Tree of 10,000 keys: 20 sections at the top; a search opens section → page → its 10 keys; collapse | UI | ✅ `translations/large-space` |
| Add, edit (German) and remove one key among 10,000: UI, after a reload, API | UI + API | ✅ `translations/large-space` |
| One English change: the draft has it, the published version not until Publish | UI + CDN | ✅ `translations/large-space` |

### 7. Schemas

Pre-check → action → post-check (the list, the editor after a reload, the App API, and the **content editor**, where a
schema's effect shows). Specs in `tests/schemas/`.

| Scenario | How | Status |
|---|---|---|
| **Create** a Root, a Node and an Enum schema; each opens its editor | UI + API | ✅ `schemas/create` @smoke |
| The ID follows the display name until edited; Normalize ID | UI + API | ✅ `schemas/create` |
| An existing ID refused | UI + API | ✅ `schemas/create` |
| Reserved (`Content`, `Translations`) and invalid IDs refused; cancel creates nothing | UI + API | ✅ `schemas/create` |
| **Fields**: added as Text, in order, stored only on Save | UI + API | ✅ `schemas/fields` @smoke |
| Edit a field (kind, display name, required, translatable, description): the content editor shows the label, a number input, the required rule, German only for the translatable field | UI + API + content editor | ✅ `schemas/fields` |
| Invalid field names refused (uppercase start, 1 character, `_id`, a duplicate, `_i18n_`, leading digit) | UI | ✅ `schemas/fields` |
| Delete a field; the content editor no longer shows it | UI + API + content editor | ✅ `schemas/fields` |
| Reorder fields by drag and drop; the content editor follows | UI + API + content editor | ✅ `schemas/fields` |
| Leaving with unsaved changes asks first; Save keeps them | UI + API | ✅ `schemas/fields` |
| Unsaved changes survive a colleague saving another schema | UI + API | ✅ `schemas/fields` |
| **Settings**: display name, description, preview field; the list shows them | UI + API | ✅ `schemas/settings` @smoke |
| Labels added and removed; duplicates, spaces, 1 character refused | UI + API | ✅ `schemas/settings` |
| **References**: an Option field from an Enum; the content editor offers its values and stores the choice | UI + API + content editor | ✅ `schemas/references` |
| A Schemas field allowing a Node; the content editor adds that block | UI + API + content editor | ✅ `schemas/references` |
| A Root as a block or as an option source refused by the server | API | ✅ `schemas/references` |
| Only Enum schemas offered as an option source | UI | ✅ `schemas/references` |
| **Enum values**: add, edit, delete, reorder | UI + API | ✅ `schemas/enum` @smoke |
| An existing value name refused; a value with spaces blocks Save until fixed | UI + API | ✅ `schemas/enum` |
| **Edit ID** of an unused schema (same id); an existing ID refused | UI + API | ✅ `schemas/rename-delete` |
| A schema another schema uses: Edit ID and Delete disabled, the server refuses (409, says where) | UI + API | ✅ `schemas/rename-delete` |
| A schema only contents use: Delete and Edit ID explain why not | UI | ✅ `schemas/rename-delete` |
| **Delete** an unused schema; cancel keeps it | UI + API | ✅ `schemas/rename-delete` @smoke |
| **List**: search by name, filter by one or another label, Reset | UI | ✅ `schemas/list` |
| Field kind settings (min/max length and value, min/max values) and their content validation | UI + content editor | ✅ `contents/validation` |
| Schema (One) field, Reference / Link / Asset fields in the content editor | UI + content editor | ✅ `contents/blocks`, `contents/fields-relations` |

### 8. Contents

Pre-check → action → post-check (the list or the form, after a reload, the App API, and the **CDN API**, what a site
receives). Specs in `tests/contents/`.

| Scenario | How | Status |
|---|---|---|
| **Folders** three levels deep; the breadcrumb back to each level | UI + API | ✅ `contents/tree` |
| A document in the open folder; only Root schemas offered; slug from the name | UI + API | ✅ `contents/tree` @smoke |
| Slugs: taken in the folder refused (dialog and 409), fine in another; invalid refused, Normalize | UI + API | ✅ `contents/tree` |
| Rename a folder's and a document's slug: the new CDN paths, the old ones 404 | UI + API + CDN | ✅ `contents/tree` |
| Move a document, and a folder with its contents; a folder into itself refused | UI + API | ✅ `contents/tree` |
| Clone: a suffixed copy with the data, never published | UI + API + CDN | ✅ `contents/tree` |
| Delete a document, a folder with everything in it (CDN 404); cancel | UI + API + CDN | ✅ `contents/tree` |
| Delete a folder three levels deep with a document at every level: gone from the list, the API, the CDN (published and draft) and both `/links` lists; the sibling tree stays | UI + API + CDN | ✅ `contents/tree` |
| Nothing left behind after a nested delete: no child rows, snapshots or `/links` entries of gone contents; the cascades exist | Server test (database) | ➖ `apps/server/test/nested-delete.test.ts` |
| Copy Slug / Copy Full Slug (clipboard) | UI | ✅ `contents/tree` |
| Publish / unpublish a folder: its documents on and off the CDN | UI + CDN | ✅ `contents/tree` |
| **Lifecycle**: Not published → Published → Draft; public sees the published version, preview the draft | UI + CDN | ✅ `contents/documents` @smoke |
| Unpublish: CDN 404, the draft kept | UI + API + CDN | ✅ `contents/documents` |
| Ctrl+S; leaving with unsaved changes asks; a reload shows what was saved | UI + API | ✅ `contents/documents` |
| **Form**: Text, Text Area, Number, Color, Date, Date and Time, Boolean (input types, stored types, CDN) | UI + API + CDN | ✅ `contents/fields-basic` @smoke |
| Rich Text (bold, a list: TipTap JSON) and Markdown (source) | UI + API + CDN | ✅ `contents/fields-basic` |
| Option (one value) and Options (a list) from an Enum | UI + API + CDN | ✅ `contents/fields-relations` |
| Link to a URL (new tab) and to a document; `resolveLink` | UI + API + CDN | ✅ `contents/fields-relations` |
| Reference and References in the picker; `resolveReference`; removing one | UI + API + CDN | ✅ `contents/fields-relations` |
| Asset and Assets in the picker; `resolveAsset`; the asset's usage | UI + API + CDN | ✅ `contents/fields-relations` |
| Schema field: one block, edited in its own view, back by the breadcrumb | UI + API | ✅ `contents/blocks` |
| Schemas field: add at the end and above, clone, delete, drag to reorder; order stored and on the CDN | UI + API + CDN | ✅ `contents/blocks` @smoke |
| **Validation**: required fields of several kinds block Save, listed under Errors | UI + API | ✅ `contents/validation` @smoke |
| Min/max length, min/max value (0 included), min/max number of options | UI + API | ✅ `contents/validation` |
| An error in another locale found on Save | UI | ✅ `contents/validation` |
| **Locales** (en / de / ro): translatable per locale, shared read-only elsewhere; CDN per locale with fallback | UI + API + CDN | ✅ `contents/locales` @smoke |
| Translate one field from its menu (stub) | UI + API | ✅ `contents/locales` |
| Translate Locale for the whole document, block fields included | UI + API | ✅ `contents/locales` |
| **Delivery**: CDN `/links` (published, draft, per folder and kind) | API | ✅ `contents/delivery` |
| `content.published` webhook with id and full slug | UI + webhook receiver | ✅ `contents/delivery` |
| Live updates in the list | UI + API | ✅ `contents/delivery` |
| Draft / Published JSON open the CDN with a preview / public token | UI (popup) | ✅ `contents/delivery` |
| **Visual Editor**: the environment URL per document and locale | UI + a local site | ✅ `contents/visual-editor` |
| A synced page follows typing live; a click on it focuses the field | UI + a local site with `sync-v1.js` | ✅ `contents/visual-editor` @smoke |
| Visual Editor: block toolbar on the page (move, duplicate, delete with a second click), hover highlight both ways | UI + a local site rendering the blocks | ✅ `contents/visual-editor` |
| Asset / Assets file type: set in the schema editor, the picker offers only those files; a schema carrying `fileTypes` (templates) keeps its filter when edited | UI (schema editor → content editor picker), API | ✅ `contents/fields-relations` |
| Reference / References Path filter | UI | ⬜ (no effect today: roadmap to-do [reference-path-filter.md](../../docs/roadmap/reference-path-filter.md)) |

**At scale** (`contents/template-large`): the test template "Contents (large)", 2,000 documents and 67 folders —
`Archive` (1,000), `Blog/<year>/<month>` (16 posts each), 40 pages at the root; English only, nothing published
(`support/contents-large.ts`). Timings recorded on the development machine (5 runs, in parallel with other tests).

| Scenario | How | Status |
|---|---|---|
| Paging a folder of 1,000 documents: 50 pages, next, last; 100 per page keeps the last page open (`Page 10 of 10`) | UI | ✅ `contents/template-large` |
| Sorting a folder of 1,000 documents by name, both ways | UI | ✅ `contents/template-large` |
| Three levels deep: a month holds its 16 posts; the breadcrumb leads back | UI | ✅ `contents/template-large` |
| Publish, then unpublish a folder of 192 documents (`Blog/2024`): the published `/links` lists them, then none, and its 12 month folders throughout; drafts stay. Publish 2.2–2.7 s, unpublish 1.2–1.5 s | UI + CDN | ✅ `contents/template-large` |
| `/links` with 2,067 entries; `kind` and `parentSlug` + `excludeChildren` filters | CDN | ✅ `contents/template-large` |
| The references picker: a document from page 50 of a 1,000-document folder; saved and delivered (draft CDN) | UI + API + CDN | ✅ `contents/template-large` |
| The Link field's document list with 2,000 documents (all rendered): opens in 1.3–1.9 s; typing finds one; saved | UI + API | ✅ `contents/template-large` |

**With the prepared space** (`contents/template-fields`): the test template "Contents (all fields)", every field kind in
English, German and French, files and reference targets, nothing published (`support/contents-fields.ts`).

| Scenario | How | Status |
|---|---|---|
| A new space: every document's draft follows the rule in each locale (plain: the same value; translated: its own); nothing published (404) | CDN + API | ✅ `contents/template-fields` |
| Not translatable: in German and French every plain field is read-only, the block title too; editable in English | UI | ✅ `contents/template-fields` |
| Translatable: a German change (text, number, option) stays in German; English and French unchanged | UI + API + CDN | ✅ `contents/template-fields` |
| Nested five levels: an edit at level 5 in German reaches the API and the German draft; other levels and locales unchanged | UI + API + CDN | ✅ `contents/template-fields` |
| Publish, then Unpublish: published equals the draft in every locale and is in `/links`; after Unpublish 404 and gone from `/links`, the draft stays | UI + CDN | ✅ `contents/template-fields` |
| Create a document with all 18 fields filled; the image-only picker hides the text file | UI + API + CDN | ✅ `contents/template-fields` |

### 9. Assets

Pre-check → action → post-check (the list, the breadcrumb, after a reload, the App API, the CDN API). Specs in
`tests/assets/`. The name rules that differ between upload, dialogs and server are a roadmap to-do:
[docs/roadmap/asset-names.md](../../docs/roadmap/asset-names.md); the tests marked "roadmap check" pin today's behaviour.

| Scenario | How | Status |
|---|---|---|
| **Upload** an image: type and size listed, name + extension stored, original bytes on the CDN | UI + API + CDN | ✅ `assets/upload` @smoke |
| Upload several files of different types (PNG, PDF, text); the PDF downloads as an attachment | UI + API + CDN | ✅ `assets/upload` |
| Upload by drag and drop | UI + API | ✅ `assets/upload` |
| Upload from a link (the browser downloads it; the link answered by the test) | UI + API + CDN | ✅ `assets/upload` |
| Upload into the open folder only | UI + API | ✅ `assets/upload` |
| Upload a name the folder has: both kept | UI + API | ✅ `assets/upload` (roadmap N2) |
| **Create folder**, a folder inside it, the breadcrumb back | UI + API | ✅ `assets/folders` @smoke |
| A name the folder has (folder or file) refused; another folder may have it | UI + API | ✅ `assets/folders` (roadmap N2) |
| Under 3 characters, spaces around refused; cancel creates nothing | UI + API | ✅ `assets/folders` |
| **Rename** a file: extension kept, same id, the download uses the new name | UI + API + CDN | ✅ `assets/rename` @smoke |
| Alt text of an image | UI + API | ✅ `assets/rename` |
| Rename a folder; its files stay inside | UI + API | ✅ `assets/rename` |
| A name another asset in the folder has refused (also another extension, or a folder); cancel keeps the name | UI + API | ✅ `assets/rename` (roadmap N2) |
| A short file name blocks Edit; Edit Folder stops at 100 characters | UI | ✅ `assets/rename` (roadmap N1, N3) |
| **Delete** a file: gone from the list, the API, the CDN (404) | UI + API + CDN | ✅ `assets/delete` @smoke |
| Delete a folder with a subfolder and files: all gone, the file outside stays | UI + API + CDN | ✅ `assets/delete` |
| Delete a folder three levels deep with a file at every level: originals and thumbnails 404, the sibling folder stays | UI + API + CDN | ✅ `assets/delete` |
| Nothing left behind after a nested delete: no child rows, no stored files (originals, renditions), no queued deletions | Server test (database, storage) | ➖ `apps/server/test/nested-delete.test.ts` |
| Delete a file a content uses: the warning names it; the content stays | UI + API | ✅ `assets/delete` |
| Cancel keeps the file | UI + CDN | ✅ `assets/delete` |
| Move a file into a folder and back (same id, URL works); move a folder with its subtree | UI + API + CDN | ✅ `assets/move` |
| Move: the dialog leaves out where the item is, the folder itself and what is under it; the API refuses a cycle (400) | UI + API | ✅ `assets/move` |
| Moving onto a name the folder has gives two | UI + API | ✅ `assets/move` (roadmap N2) |
| Grid layout: a card per item with its actions, remembered after a reload; a folder card opens it | UI | ✅ `assets/views` |
| Image preview from a row or a card (name, size, dimensions); other files open none | UI | ✅ `assets/views` |
| Too large an upload (413): the reason in a toast, nothing stored | UI on the `limits` server (`LOCALESS_UPLOAD_MAX_MB=1`), API | ✅ `limits/limits` |
| Unsplash picker | Needs an API key | ➖ |

**At scale** (`assets/template-large`): the test template "Assets (large)", 1,000 files in `Bulk` (every 10th a PNG,
text file N is N bytes), `Nested/Deep`, `Empty`, a `Gallery` document (`support/assets-large.ts`).

| Scenario | How | Status |
|---|---|---|
| Paging 1,000 files: 20 per page (50 pages), next, last, first; 100 per page (10 pages) | UI | ✅ `assets/template-large` |
| Sorting by name (both ways), size (smallest / largest first), type (images grouped) | UI | ✅ `assets/template-large` |
| Grid layout pages the same way | UI | ✅ `assets/template-large` |
| Navigation `Nested/Deep` and back by the breadcrumb; `Empty` shows the empty state | UI | ✅ `assets/template-large` |
| The picker at 1,000 files: an image-only field offers the 100 images (5 pages), an any-file field all 1,000; picking two saves them | UI + API | ✅ `assets/template-large` |
| Uploading into the big folder: 1,001 files, the new one first by name | UI + API | ✅ `assets/template-large` |

### 10. Dashboard, navigation, developers

| Scenario | How | Status |
|---|---|---|
| Dashboard counts and per-locale progress | UI | ✅ `space/dashboard` @smoke |
| Every page of a space opens without errors | UI | ✅ `space/navigation` @smoke |
| Open API page renders | UI | ✅ `space/navigation` |
| Webhooks: create in the UI; it receives its event | UI + API + receiver | ✅ `developers/webhooks` |
| Webhooks: edit name, URL and events; deliveries go to the new URL only | UI + API + receiver | ✅ `developers/webhooks` |
| Webhooks: disable (no delivery), enable again; delete (no delivery) | UI + API + receiver | ✅ `developers/webhooks` |
| Webhooks: a failed delivery is logged with status code, error type and URL | UI + receiver answering 500 | ✅ `developers/webhooks` |
| Webhooks: signed delivery on publish, logged | API + local receiver + UI | ✅ `developers/webhooks` @smoke |
| Webhooks: the list a page at a time (22 webhooks), the Status filter and the URL search on the server | UI + API | ✅ `developers/webhooks` |
| Webhooks: a webhook's logs a page at a time (25 deliveries), the Status filter and the id search on the server | UI + receiver | ✅ `developers/webhooks` |
| Webhooks: content events carry id and full slug | API + receiver | ✅ `contents/delivery` |
| Tasks page | Hidden behind `FEATURE_FLAGS.importExport` | ➖ until enabled |

### 11. CDN and Management APIs

| Scenario | How | Status |
|---|---|---|
| Translations: published only, default-locale fallback | API | ✅ `api/cdn-translations` @smoke |
| Translations: draft needs a preview token | API | ✅ `api/cdn-translations` |
| Missing, wrong, management or foreign token refused | API | ✅ `api/cdn-translations` |
| Contents by id and full slug; unpublished 404 | API | ✅ `api/cdn-contents` @smoke |
| Contents draft only for preview tokens | API | ✅ `api/cdn-contents` |
| `cv` redirect and cache headers (per-token TTL) | API (`maxRedirects: 0`) | ✅ `space/tokens` |
| A publish moves `cv` (translations, contents by id and slug); an edit alone doesn't; the old `cv` is redirected, never served; the versioned 200 is cached a week, without ETag | API (`maxRedirects: 0`) | ✅ `api/cdn-caching` @smoke |
| Drafts: an edit moves the draft `cv` only; drafts are cached like published versions; a TTL-0 token's redirects are `no-cache`, drafts too | API | ✅ `api/cdn-caching` |
| 404 caching: an unpublished document 10 minutes; translations never published: no `Cache-Control` | API | ✅ `api/cdn-caching` |
| Assets: a year with an ETag (`-orig` for the file, another for a rendition), 304 on `If-None-Match`; a bad parameter 400 (an hour); an unknown asset 404 (a week) | API | ✅ `api/cdn-caching` |
| `/links`, `resolveReference`, `resolveLink` | API | ✅ `contents/delivery`, `contents/fields-relations` |
| Management: read space, push translations | API | ✅ `api/management` @smoke |
| Management: missing, public or foreign token refused | API | ✅ `api/management` |
| Management: schema export; push dry run, upsert (created / updated / unchanged), sync (deletes, but not a schema contents use) | API + App API | ✅ `api/management-schemas` |
| Management: an invalid push is refused and stores nothing; OpenAPI document of the space's schemas | API | ✅ `api/management-schemas` |

### 12. Cross-cutting

| Scenario | How | Status |
|---|---|---|
| No uncaught or reported errors on any page under test | `page` fixture | ✅ |
| Accessibility scan of the sign-in page, a space's pages, admin and profile | `@axe-core/playwright`, WCAG 2 A / AA, fails on serious / critical | ✅ `a11y/pages` |
| Accessibility scan of dialogs (each has a name, then scanned on its own): Add Translation, Add Document / Folder, Create new Schema, asset folder and file dialogs, image preview, Token Form and the token secret, Add Locale, a confirmation, Edit Environment, Edit Webhook, User Invite / Edit, Create / Edit Space, the Me dialogs | `a11y/pages`, axe `include('[role="dialog"]')` | ✅ `a11y/pages` |
| Accessibility scan of the Visual Editor (not the customer site in it), a webhook's page, Danger Zone, Forgot password and the reset-link page | `a11y/pages` | ✅ `a11y/pages` |
| Cancelling a destructive confirmation changes nothing: Delete All Translations, Regenerate / Delete Token, Delete Locale, Change Default Locale, Delete Environment, Delete Webhook, Disable User, Delete Folder (contents, assets), Unpublish Document | UI (Cancel) → reload, API equal to the pre-check (and the CDN) | ✅ `confirmations/cancel` |
| Cancelling a form dialog saves nothing: Token Edit, Webhook Edit, Edit Environment, Add Locale, User Edit, Update Email, Edit Translation | UI → reload, API | ✅ `confirmations/cancel` |
| Firefox and WebKit | Extra Playwright projects, nightly | ⬜ |
| Visual regression of key pages | `toHaveScreenshot`, fixed data, one OS | ⬜ |
| Dark theme renders | UI: theme switch + screenshot | ⬜ |

## Findings

Bugs the suite found while it was written. Each fix has a unit test, and the e2e test that found it stays as the
regression test.

| Bug | Fix |
|---|---|
| A document with an empty Reference, Asset or Link field could not be saved (the empty value was sent as a `null` id: 400), and after a failed save, publish or unpublish the editor's button kept spinning | `extractReferences` skips empty values; the editor stops its spinners on an error too (found by `contents/template-large`; regression test in `contents/fields-relations`) |
| Text typed for a second locale was saved over the default locale, and unsaved text was discarded, whenever live data refreshed | Translation detail follows its inputs by value (locale id, stored value), not object identity |
| The open content/asset folder jumped back to the root whenever any space changed (new documents landed in the root) | The live space list keeps the folders while the same space stays selected |
| A space name being typed in Settings → General was overwritten by live updates (and Save sent the old name) | Only an untouched form follows live updates |
| A never-saved document opened by deep link showed an editor without fields | New document data takes its schema from the document, not the (maybe not yet loaded) schema list |
| Deep links in a browser with only the session cookie landed on the welcome page | `authGuard` waits for the session check instead of a flag cached in localStorage |
| Translators got "Lost connection…" toasts and endless 403 retries for documents and schemas | `SpaceStore` only listens to what the user may read |
| An install without internet access (or a GitHub rate limit) threw an uncaught error on every page | The release check handles its error |
| The webhook detail page threw NG0951 and never paginated its logs | The paginator query is optional and wired when it appears |
| Translation labels: the label rules were applied to the list, not each label: a single label made Save disabled (no message), while duplicates, labels with spaces and 1-character labels were accepted | Each label is checked when it is entered, with the reason shown; the list only keeps the server's limit (Add and Edit dialogs) |
| Tree view of translations never showed the selected key (and never the saving spinner): it was given the translation's id, the nodes are keyed by key | The list passes the selected key |
| Schema editors: unsaved changes were wiped whenever anyone saved any other schema of the space (the live schema list reloaded the form) | The form reloads only without unsaved changes; Save reloads it once, and not over edits made since |
| Content editor: the chosen locale jumped back to the default whenever any space changed (the live space list) | The chosen locale is kept while the space has it |
| Edit Field: a Schema / Schemas field could allow no schema at all: the picker selected nothing (its value started as `undefined`) | The allowed schemas start as an empty list |
| Enum editor: an existing value name was not refused (the taken names were replaced, not emptied, on load), and deleting a value freed another value's name | Emptied in place; the deleted value's own name is freed |
| Schema labels had no rules at all: duplicates, spaces, 1 character stored; adding one didn't count as an unsaved change | The same per-label check as translation labels (shared `LabelValidator`), a new list each time, the form marked changed |
| Edit Field's Display Name and Description labels pointed at the Settings tab's inputs (duplicate ids); Option/Options labels in the content editor pointed at nothing (`for="kind"`) | Settings ids renamed; the content editor's labels point at their select |
| Visual Editor: clicking a field of the document itself (not inside a block) on the preview did nothing | The field is focused after the walk through the blocks, not only inside it |
| Number fields ignored a limit of 0 (`if (field.minValue)`): a "minimum 0" price took -5 | Limits checked with `!= null` |
| Blocks in the editor showed `#<schema UUID>` (and the add-block menu fell back to it) instead of the schema's ID | The schema's name |
| Publishing or unpublishing from the content list reported a failure as a success toast | An error toast |
| Document status was an icon with a tooltip only (no text for assistive technology) | The status as the icon's accessible name; also names for the field's translate button and the editor's root breadcrumb |
| Image preview: on a window under ~980 px high the caption and Close were below the screen (a fixed `min-h-[800px]` beat the maximum) | The minimum size is capped by the window |
| Admin → Users offered "Regenerate Metadata" as a permission: it is an admin-only task kind, and the server refused the whole invite or save with it ticked | Not offered; a unit test checks the dialog offers exactly the server's permissions |
| Google / Microsoft sign-in refused (no account, unverified email, disabled): the reason was never shown — the login page's session check (401) made the API interceptor navigate to `/auth/login`, dropping `?error=` | No redirect while on a sign-in page |
| Accessibility scan: the sidebar's collapsible menu sat between `<ul>` and `<li>`; list items without a list (item groups, the translation list); unnamed page-size select, help link, progress bars and provider icons; a focusable button hidden from assistive technology; Settings tabs pointing at no panel | Fixed (item groups are lists, as in shadcn; labels; the routed page is the tab panel) |
| Google / Microsoft sign-in of a disabled account was refused, but the provider identity was linked to the account first | Disabled is checked before linking (`oauth.service.ts`, server test in `oauth.test.ts`) |
| The space switcher, the editor's locale menu and the Link field's type menu stayed open after a pick (Spartan's radio menu items keep the menu open by default) | `[keepOpen]="false"` on those items, from the app; the e2e helpers (`switchSpace`, `editorLocale`) and `contents/fields-relations` require the menu to close by itself |
| Image preview dialog had no accessible name (its `aria-labelledby` pointed at no element; the picture was "thumbnail") | A visually hidden title and the picture's alt are the file name (unit test; `assets/views` finds the dialog by name) |
| Asset card picture (grid layout) was hidden from assistive technology yet clickable, and opened on any key press | A button "Open <file>" that opens with Enter or Space only (unit test) |
| Every Link field's "Open in a new tab" switch had the id `target`: a second Link field's label pointed at the first one's switch | The id is per field (unit test) |
| Choice cards (token type, space template): axe found the radios unlabelled (the label wraps the radio with its title and description) | Each radio is named by its title (`aria-labelledby`) and described by its description (unit test on the real template) |
| The remove button of a chip (webhook events, allowed schemas) had no name | "Remove <value>" (`llChipRemoveLabel`, an app directive on `hlm-combobox-chip`) |
| The Visual Editor's resize handle (a focusable separator) had no value (`aria-valuenow`, required for a window splitter) | The size of the panel before it, in % (`llSplitterValue`, an app directive: `packages/ui` stays as Spartan ships it) |
| Asset / Assets file type was ignored by the picker when set in the schema editor (it saves `fileType`, the picker read only `fileTypes`), and editing a template's schema dropped its filter | One rule, `assetFieldFileType` (`fileType`, else the first of `fileTypes`), in both pickers and the schema editor (unit tests) |
| Schema editors: a live refetch that started before Save and answered after it put the old schema back into the (just saved, so pristine) form; a label removed then removed every label (found as a flake of `schemas/settings` under load) | An answer older than the version just saved, or than the form's, is ignored (unit tests, Root/Node and Enum editors) |
| A rate-limited sign-in (429) said "User or password is wrong", also to someone typing the right password | "Too many sign-in attempts. Try again in a minute." (unit test; `limits/limits`) |
| Icon-only buttons had no accessible name (screen readers, tests) | `aria-label` from the tooltip text; labels for the translation locale selects and the space name |

The suite also caught bugs that were being fixed at the same time on `refactor/monorepo-structure`; their tests now
guard those fixes: new tokens locked to Public and "Add Webhook" titled "Edit Webhook" (`b7dfc4ec`), inviting a Custom
user failing on the Lock switch (`1258e5d3`), a generic "An error occurred." toast next to every handled API error,
including for a user without a role (`b2e0382d`), and "NaN characters left" in the schema editors (`3d3d2cef`).

### Open findings

| Finding | Where |
|---|---|
| After a failed request some buttons keep spinning (their loading flag is reset only when the request completes, which an error never does): the schema editors' Save (`edit-comp`, `edit-enum`), Translations' Publish and value save (`translations.component.ts`), the detail panel's Translate (`translation-detail`). Fixed in the document editor | To fix like the editor (reset on error too); not asserted |
| Lists that update live re-render their rows and close an open row menu | Page objects retry opening (`rowMenu`, `expectRowMenu`) |
| Machine translation of a single value (and "Translate other locales" on add) needs TRANSLATION_UPDATE **and** CONTENT_UPDATE (kept from the Firebase callable, pinned by a server test), while "Translate Locale" needs only TRANSLATION_UPDATE; a translator without CONTENT_UPDATE sees the Translate button and gets "Could not be translated." | Product decision; not asserted |
| Tree view: a key that is also the prefix of other keys (`home` next to `home.title`) is a group node and can't be selected, so that translation can't be opened in the tree | Product decision; not asserted |
| Key uniqueness: the UI refuses a key in any letter case, the server only the exact key (via the API `Home.Title` and `home.title` can both exist) | Not asserted |
| A field's Default Value is stored on the schema but nothing in the content editor uses it | `contents/fields-basic` pins today's behaviour |
| Content rules (required, lengths, limits) are checked in the browser only: the API stores content that breaks them | `contents/validation` pins today's behaviour |
| The Errors list on Save doesn't jump to the field; Rich Text min/max length has no effect (the value is JSON); a Schemas field's blocks aren't validated | Not asserted |
| Enum values are sorted by name in the content editor, whatever their order in the enum (which the enum editor lets you change by drag); the sort also mutates the shared schema objects | Product decision; `schemas/references` asserts today's order |
| Color contrast: keyboard hints (`kbd`: the theme's muted text on muted, 4.34:1), the inactive Danger Zone tab (destructive at 60 %, 3.06:1), a choice card's description on the selected card (token type, space template: 4.27:1) and destructive buttons (a confirmation's OK) are under WCAG AA's 4.5:1 | Theme decision; `a11y/pages` skips only these two |
| The Content Security Policy (report-only) allows one script hash, but the build's inline critical-CSS loader (`data-beasties-media`) has another: enforced, the policy would block it | `apps/server/src/infra/static/static-site.ts`; not asserted |
| Admin → Users: an admin's own row offers Delete, and the server allows it (only disabling oneself is refused): the last admin can delete their account and leave the install without one | `apps/server/src/modules/users/services/users.service.ts` `delete`; `admin/users` asserts only that Disable is not offered |
| Deleting a locale keeps its stored values (translations, content): the CDN no longer serves them, but adding the locale again brings the old values back | Product decision; `space/locales` pins today's behaviour |
| Reference / References: the field's Path ("Path to be filtered by") is stored but never used: the picker offers every document | Roadmap to-do [reference-path-filter.md](../../docs/roadmap/reference-path-filter.md) |
| Asset names: a short file name blocks Edit; duplicates allowed on upload and move but refused (more broadly) in the dialogs; Edit Folder stops at 100 characters | Roadmap to-do [asset-names.md](../../docs/roadmap/asset-names.md); "roadmap check" tests pin today's behaviour |
