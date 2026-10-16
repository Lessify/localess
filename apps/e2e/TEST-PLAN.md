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
| CLI `localess check`, `admin:create` | Run `node apps/server/dist/cli.js` against the e2e server's database | ⬜ |
| Docker image boots and serves the app | `docker compose up`, then the smoke suite against it (`E2E_BASE_URL`) | ⬜ |
| Upgrade: a database from the previous release migrates and works | Restore a dump of the last release, boot, run smoke | ⬜ |
| External Postgres (`DATABASE_URL`) instead of embedded | CI service container, same suite | ⬜ |

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
| Without SMTP the reset page points to an administrator | UI | ✅ `auth/password-reset` |
| Reset by email (SMTP configured) | A local SMTP sink (e.g. `smtp-server` in a fixture), read the link from the mail | ⬜ |
| Google / Microsoft sign-in | `oauth2-mock-server` (already a server devDependency) as the issuer; a second server config | ⬜ |
| Login rate limit | API: N+1 attempts → 429 (own server with a low limit) | ⬜ |
| Disabled user can not sign in | API | ✅ `api/permissions`, `admin/users` |
| Disabling a signed-in user signs them out at once | UI: user's page gets sent to login after an admin disables them | ⬜ |

### 3. Users and permissions

Admin → Users tests follow **pre-check → action → post-check**: the state in the UI and the API before, the action in
the UI, then the table (also after a reload), the API, and what the user can now do with their own session.

| Scenario | How | Status |
|---|---|---|
| Invite as **Admin**: full access, admin area visible | UI + API + the user's session | ✅ `admin/users` |
| Invite as **Custom**: exactly the chosen permissions | UI + API + the user's session | ✅ `admin/users` |
| Invite as **None**: signs in, no access, asked to contact an administrator | UI + API + the user's session | ✅ `admin/users` |
| Invite with a taken email is refused; the existing user is unchanged | UI + API | ✅ `admin/users` |
| Change role Custom → Admin → None → Custom; access follows each change | UI + API + the user's session | ✅ `admin/users` |
| Add / remove permissions of a custom user | UI + API + the user's session | ✅ `admin/users` |
| Lock a custom user: they can no longer change their own data | UI + API + the user's session | ✅ `admin/users` |
| Disable (sign-in refused) / enable | UI + API + the user's session | ✅ `admin/users` |
| Disabling signs out a user who is signed in | UI + the user's open session | ✅ `admin/users` |
| The admin can not disable themself | UI | ✅ `admin/users` |
| Copy password reset link; the user sets a new password with it | UI (clipboard) + the user's browser | ✅ `admin/users` |
| Delete a user (sign-in refused); cancelling keeps them | UI + API | ✅ `admin/users` @smoke |
| Email, display name and password of another user | Not a feature: the admin sets them when inviting; later only a reset link (the user changes their own in Me) | ➖ |
| A custom user with `USER_MANAGEMENT` can only grant what they hold | UI: checkboxes disabled; API: 403 | ⬜ |
| Translator sees translations only; guards redirect elsewhere | UI | ✅ `auth/permissions` |
| User without a role is asked to contact an administrator | UI | ✅ `auth/permissions` |
| API refuses what the permissions don't allow | API | ✅ `api/permissions` |
| Permission matrix: every App API route × each permission | API, data-driven from `@RequirePermission` | ⬜ |

### 4. Me (profile)

Each test uses its own user and follows **pre-check → action → post-check** (the page, after a reload, the API, and
whether the account can sign in).

| Scenario | How | Status |
|---|---|---|
| Opens from the user menu; shows email, verification, role and a custom user's permissions | UI | ✅ `me/profile` |
| An admin has no permission list | UI | ✅ `me/profile` |
| Display name: page, user menu, API, after a reload | UI + API | ✅ `me/profile` @smoke |
| Avatar URL is used; an invalid URL is refused | UI + API | ✅ `me/profile` |
| Cancelling the profile dialog keeps everything | UI + API | ✅ `me/profile` |
| Email change: sign-in with the new email only, unverified, same account | UI + API + sign-in | ✅ `me/profile` |
| Email change refused: wrong current password, email of another user | UI + API + sign-in | ✅ `me/profile` |
| Password change: old one stops working, other sessions end, this one stays | UI + a second session + sign-in | ✅ `me/profile` @smoke |
| Password change refused: wrong current password; under 6 characters can't be submitted | UI + sign-in | ✅ `me/profile` |
| Locked user: message, no buttons, API refuses changes | UI + API | ✅ `me/profile` |
| Google / Microsoft account (no password): email and password can't be changed here | Needs `oauth2-mock-server` as the issuer | ⬜ |

### 5. Spaces (admin) and space settings

Admin → Spaces tests follow **pre-check → action → post-check** (UI, after a reload, and API).

| Scenario | How | Status |
|---|---|---|
| Create a space; it opens and shows in the switcher | UI + API | ✅ `admin/spaces` @smoke |
| Create: cancelling creates nothing; a name under 3 characters is refused | UI + API | ✅ `admin/spaces` |
| Rename a space (same id); cancelling keeps the name | UI + API | ✅ `admin/spaces` |
| Delete a space with its content; cancelling keeps it | UI + API | ✅ `admin/spaces` |
| Create a space from a template (schemas created) | UI + API | ⬜ |
| Switch spaces with the switcher | UI | ✅ `space/navigation` |
| General: rename the space | UI | ✅ `space/general` |
| Locales: default locale can not be deleted; add / remove a locale | UI | ✅ `space/locales` |
| Locales: set default, reorder | UI + API | ⬜ |
| Visual Editor environments: add / edit / remove | UI | ✅ `space/environments` |
| Environments: reorder by drag and drop | UI (`dragTo`) | ⬜ |
| Access tokens: public token works on the CDN API | UI + API | ✅ `space/tokens` @smoke |
| Management token shown once, must be acknowledged | UI | ✅ `space/tokens` |
| Regenerate cuts off the old value; delete removes access | UI + API | ✅ `space/tokens` |
| Token cache TTL edit | UI + CDN redirect `Cache-Control` | ⬜ |
| Danger zone: delete all translations | UI + API | ⬜ |
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
| Field kind settings (min/max length and value, min/max values, path, file type) and their content validation | UI + content editor | ⬜ |
| Schema (One) field, Reference / Link / Asset fields in the content editor | UI + content editor | ⬜ |

### 8. Contents

| Scenario | How | Status |
|---|---|---|
| Folder → document → edit → save → publish → CDN by slug | UI + API | ✅ `content/contents` @smoke |
| Edit survives a reload; unsaved changes warn before leaving | UI | ✅ `content/contents` |
| Delete a folder with everything in it | UI + API | ✅ `content/contents` |
| Move, clone, rename (slug change moves the full slug) | UI + CDN by new slug | ⬜ |
| Unpublish → CDN 404 | UI + API | ⬜ |
| Slug conflict in the same folder (409) | UI | ⬜ |
| Required-field validation blocks saving | UI | ⬜ |
| Translatable fields per locale | UI: switch locale, CDN `?locale=` | ⬜ |
| Reference, link and asset fields; `resolveReference` on the CDN | UI + API | ⬜ |
| Visual Editor: preview iframe with an environment, sync script | UI with a local preview page | ⬜ |
| Draft / Published JSON menu items | UI (new tab) | ⬜ |

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
| Delete a file a content uses: the warning names it; the content stays | UI + API | ✅ `assets/delete` |
| Cancel keeps the file | UI + CDN | ✅ `assets/delete` |
| Move a file or folder, grid layout, image preview | UI | ⬜ |
| Too large an upload (413) | API with `LOCALESS_UPLOAD_MAX_MB` low | ⬜ |
| Unsplash picker | Needs an API key | ➖ |

### 10. Dashboard, navigation, developers

| Scenario | How | Status |
|---|---|---|
| Dashboard counts and per-locale progress | UI | ✅ `space/dashboard` @smoke |
| Every page of a space opens without errors | UI | ✅ `space/navigation` @smoke |
| Open API page renders | UI | ✅ `space/navigation` |
| Webhooks: create in the UI | UI | ✅ `developers/webhooks` |
| Webhooks: signed delivery on publish, logged | API + local receiver + UI | ✅ `developers/webhooks` @smoke |
| Webhooks: disabled webhook does not deliver; content events carry id and full slug | API + receiver | ⬜ |
| Tasks page | Hidden behind `FEATURE_FLAGS.importExport` | ➖ until enabled |

### 11. CDN and Management APIs

| Scenario | How | Status |
|---|---|---|
| Translations: published only, default-locale fallback | API | ✅ `api/cdn-translations` @smoke |
| Translations: draft needs a preview token | API | ✅ `api/cdn-translations` |
| Missing, wrong, management or foreign token refused | API | ✅ `api/cdn-translations` |
| Contents by id and full slug; unpublished 404 | API | ✅ `api/cdn-contents` @smoke |
| Contents draft only for preview tokens | API | ✅ `api/cdn-contents` |
| `cv` redirect and cache headers | API (`maxRedirects: 0`) | ⬜ |
| `/links`, `resolveReference`, `resolveLink` | API | ⬜ |
| Management: read space, push translations | API | ✅ `api/management` @smoke |
| Management: missing, public or foreign token refused | API | ✅ `api/management` |
| Management: schemas pull/push, OpenAPI | API | ⬜ |

### 12. Cross-cutting

| Scenario | How | Status |
|---|---|---|
| No uncaught or reported errors on any page under test | `page` fixture | ✅ |
| Accessibility scan of the main pages | `@axe-core/playwright`, fail on serious/critical | ⬜ |
| Firefox and WebKit | Extra Playwright projects, nightly | ⬜ |
| Visual regression of key pages | `toHaveScreenshot`, fixed data, one OS | ⬜ |
| Dark theme renders | UI: theme switch + screenshot | ⬜ |

## Findings

Bugs the suite found while it was written. Each fix has a unit test, and the e2e test that found it stays as the
regression test.

| Bug | Fix |
|---|---|
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
| Icon-only buttons had no accessible name (screen readers, tests) | `aria-label` from the tooltip text; labels for the translation locale selects and the space name |

The suite also caught bugs that were being fixed at the same time on `refactor/monorepo-structure`; their tests now
guard those fixes: new tokens locked to Public and "Add Webhook" titled "Edit Webhook" (`b7dfc4ec`), inviting a Custom
user failing on the Lock switch (`1258e5d3`), a generic "An error occurred." toast next to every handled API error,
including for a user without a role (`b2e0382d`), and "NaN characters left" in the schema editors (`3d3d2cef`).

### Open findings

| Finding | Where |
|---|---|
| Lists that update live re-render their rows and close an open row menu | Page objects retry opening (`rowMenu`, `expectRowMenu`) |
| Machine translation of a single value (and "Translate other locales" on add) needs TRANSLATION_UPDATE **and** CONTENT_UPDATE (kept from the Firebase callable, pinned by a server test), while "Translate Locale" needs only TRANSLATION_UPDATE; a translator without CONTENT_UPDATE sees the Translate button and gets "Could not be translated." | Product decision; not asserted |
| Tree view: a key that is also the prefix of other keys (`home` next to `home.title`) is a group node and can't be selected, so that translation can't be opened in the tree | Product decision; not asserted |
| Key uniqueness: the UI refuses a key in any letter case, the server only the exact key (via the API `Home.Title` and `home.title` can both exist) | Not asserted |
| Enum values are sorted by name in the content editor, whatever their order in the enum (which the enum editor lets you change by drag); the sort also mutates the shared schema objects | Product decision; `schemas/references` asserts today's order |
| Asset names: a short file name blocks Edit; duplicates allowed on upload but refused (more broadly) in the dialogs; Edit Folder stops at 100 characters | Roadmap to-do [asset-names.md](../../docs/roadmap/asset-names.md); "roadmap check" tests pin today's behaviour |
