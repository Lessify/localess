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

| Scenario | How | Status |
|---|---|---|
| Profile shows the account; display name can be changed | UI | ✅ `me/profile` |
| Password change; the old password stops working | UI + API | ✅ `me/profile` |
| Locked user can not change their own data | UI | ✅ `me/profile` |
| Email change (needs the current password) | UI + sign-in with the new email | ⬜ |

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

| Scenario | How | Status |
|---|---|---|
| Add, publish, served by the CDN API | UI + API | ✅ `content/translations` @smoke |
| Edit the value of a second locale | UI + API | ✅ `content/translations` |
| Rename a key, delete a translation | UI | ✅ `content/translations` |
| Search by key and value | UI | ✅ `content/translations` |
| Live updates: a change elsewhere shows without reload | UI + API | ✅ `content/translations` |
| Status and label filters, tree layout | UI | ⬜ |
| Machine translation (stub provider): translate one value, "Translate Locale" for all | UI (`LOCALESS_TRANSLATE_PROVIDER=stub` is set) | ⬜ |
| Import / export | Hidden behind `FEATURE_FLAGS.importExport` | ➖ until enabled |

### 7. Schemas

| Scenario | How | Status |
|---|---|---|
| Create a root schema, add fields, save | UI + API | ✅ `content/schemas` @smoke |
| Delete an unused schema | UI | ✅ `content/schemas` |
| A schema in use can not be deleted | UI | ✅ `content/schemas` |
| Enum schema: add values | UI + API | ⬜ |
| Edit a schema ID (rename), conflict 409 | UI | ⬜ |
| Field kinds and their settings (required, min/max, options source) | UI, then content validation | ⬜ |

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

| Scenario | How | Status |
|---|---|---|
| Upload a file; the CDN API serves it | UI + API | ✅ `content/assets` @smoke |
| Create a folder and upload into it | UI + API | ✅ `content/assets` |
| Delete a file | UI + API | ✅ `content/assets` |
| CDN: original bytes, download, resized image, 404 | API | ✅ `api/cdn-assets` @smoke |
| Rename, alt text, move | UI | ⬜ |
| Grid layout, image preview dialog | UI | ⬜ |
| Too large an upload (413) | API with `LOCALESS_UPLOAD_MAX_MB` low | ⬜ |
| Delete warns when content uses the asset | UI | ⬜ |
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
| Icon-only buttons had no accessible name (screen readers, tests) | `aria-label` from the tooltip text; labels for the translation locale selects and the space name |

The suite also caught bugs that were being fixed at the same time on `refactor/monorepo-structure`; their tests now
guard those fixes: new tokens locked to Public and "Add Webhook" titled "Edit Webhook" (`b7dfc4ec`), inviting a Custom
user failing on the Lock switch (`1258e5d3`), a generic "An error occurred." toast next to every handled API error,
including for a user without a role (`b2e0382d`), and "NaN characters left" in the schema editors (`3d3d2cef`).

### Open findings

| Finding | Where |
|---|---|
| Lists that update live re-render their rows and close an open row menu | Page objects retry opening (`rowMenu`, `expectRowMenu`) |
