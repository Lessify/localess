# Spaces — Settings Module

> Parent: [Spaces Overview](overview.md) · Related: [Auth Tokens](../../auth-tokens.md) · [CDN & Caching](../../cdn-caching.md)

## Purpose

Configure a specific space — manage locales, API tokens, visual editor integration, general metadata, and destructive danger-zone
operations.

> Webhooks moved out of Settings into the **Developers** section — see [Webhooks](../../webhooks.md).

## Routes

```
/features/spaces/:spaceId/settings    [SPACE_MANAGEMENT]
  → redirects to /settings/general
  /general          ← GeneralComponent
  /locales          ← LocalesComponent
  /visual-editor    ← VisualEditorComponent
  /tokens           ← TokensComponent
  /danger-zone      ← DangerZoneComponent
```

## Key Files

```
apps/web/src/app/features/spaces/settings/
  settings.component.ts/html/scss     ← tab container
  general/
  locales/
    locale-dialog/
  visual-editor/
  tokens/
    token-dialog/
  danger-zone/
```

## SettingsComponent

Tab-based shell. Tracks the active tab in an `activeTab` signal (initialised from the current URL segment in the constructor) and updates it
in `onTabActivated(tabLink)` when a tab is clicked; the tabs themselves are router links to the child routes.

---

## GeneralComponent

Edit the space name and other top-level space metadata. Reads current data from `SpaceStore.selectedSpace()`.

**Services:** `SpaceService`, `NotificationService`, `SpaceStore`

---

## LocalesComponent

Add, remove and reorder the space's locales, and set the **default locale**: new translations are created in it, content stores
its values in the bare field, and a locale with no value falls back to it. The table is one page from the server
(`GET /api/app/spaces/:s/locales`, `Page<SpaceLocale>`, a `PagedList`, see [pagination](../../server/pagination.md)): in the
space's order (the order used everywhere in the app) until the Id or Name header sorts it (cleared: the space's order again), and
searched by the locale's id or name through an `<ll-filter-toolbar>` (`onFilterChange()`). It reloads on the space's `spaces` change
event, so a change answers nothing the screen reads. The default is the space's `defaultLocaleId`.
`GET /api/app/spaces/:s/locales/names` answers every locale of the space as `IdName[]`, in its order.

- `openAddDialog()` — opens `LocaleDialogComponent`, which loads every locale from `GET /api/app/locales` (database data, read-only)
  minus the space's own, and adds the pick by id (`POST /api/app/spaces/:s/locales {localeId}`, answers the `SpaceLocale`; an id not in the
  `locales` table is refused)
- `openDeleteDialog(element)` — `ConfirmationDialogComponent`, then deletes the locale (`DELETE /api/app/spaces/:s/locales/:locale`, 204). The action is disabled for the default locale, and the server refuses to delete it too
- `openSetDefaultDialog(element)` — `ConfirmationDialogComponent` warning that content values stored for the default locale are not
  moved (they are read as the new locale from then on; translations are unaffected), then `PUT /api/app/spaces/:s/default-locale {defaultLocaleId}`
  (answers the `Space`; served by `SpaceController.setDefaultLocale`, apart from `PATCH /spaces/:s`: its own process)
- `move(element, ±1)` / `canMove()` — **Move Up / Move Down** in the row menu: moves the locale one place in the space's order
  (its index read from `SpaceStore`, which holds all of them): `POST /api/app/spaces/:s/locales/:locale/move {position}`, 204. The
  server takes the locale to `position` (0 the first; -1, or past the end, the last), shifts the others and writes only the rows that change
  (a swap: two); already there, nothing is written and no event is sent. The same call serves a drag and drop, or Move to First / Last
  (`0` / `-1`)

**Services:** `SpaceLocaleService` (this feature's, `settings/locales/space-locale.service.ts`: the page, add, move, delete), `SpaceService` (`setDefaultLocale`), `LocaleService` (translate support), `NotificationService`, `HlmDialogService`, `SpaceStore`

### Translation support

A space can hold any locale from the list, but only a subset can be handed to the translation provider. The table reports the two directions
separately:

| Column             | Means                                   | Backed by                                  |
| ------------------ | --------------------------------------- | ------------------------------------------ |
| **Translate From** | usable as the _source_ of a translation | `LocaleService.isLocaleTranslatableFrom()` |
| **Translate To**   | usable as the _target_ of a translation | `LocaleService.isLocaleTranslatableTo()`   |

They are separate because Google Cloud Translation models them separately - `SupportedLanguage` carries `supportSource` and `supportTarget`,
and they are allowed to differ. Every locale we list is bidirectional today (`GCP_BIDIRECTIONAL_LOCALES`), with `GCP_SOURCE_ONLY_LOCALES`
and `GCP_TARGET_ONLY_LOCALES` standing empty next to it; a language later observed to be one-way is a one-line move rather than a
restructure.

The lists are defined once, in `packages/shared/src/locales.ts`: the server validates requests against them when its provider is Google,
and `LocaleService` uses the same sets to decide what the UI offers and when to enable the translate button. The DeepL lists live in the
same file; the server validates against them when configured for DeepL, but the UI still offers the Google set.

### Locale icons

`ll-locale-icon` (`apps/web/src/app/shared/components/locale-icon/`) renders the badge shown in the locales table and in the add-locale dropdown.
It is also used in Contents (`edit-document`), Translations (`translations.component`, export and import dialogs, `translation-filter`,
`translation-detail`) and the shared `translate-locale-dialog`.

A flag cannot identify a language: one language is spoken in many countries, and picking a country for a bare `de` or `ar` means guessing.
So the icon shows what the locale id actually says and nothing more:

| Locale id          | Icon                                 | Why                                                                            |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------ |
| `de-CH`, `it-CH`   | two circles — language, then country | the id names both, and the two flags differ. The case the component exists for |
| `de-DE`, `en-GB`   | one circle                           | both flags are the _same picture_; showing it twice reads as a rendering bug   |
| `agq-CM`           | country flag only                    | no language flag exists for Aghem                                              |
| `de`, `zh-Hans`    | language flag only                   | the id names no region — nothing to infer one from                             |
| `ar-001`, `es-419` | language circle, then the UN flag    | UN M49 macro-regions ("World", "Latin America") belong to no country           |
| `asa`, `bez`       | the language code as text            | neither flag exists                                                            |

`localeIcon()` splits the id with **`Intl.Locale`**, which reads scripts correctly (`shi-Latn-MA` → region `MA`) and, crucially, does not
infer: `en` has no region and stays that way. `maximize()` would turn it into `en-Latn-US`, which is the wrong answer for a content locale.

Two consequences worth knowing:

- **Scripts are invisible.** `zh-Hans` and `zh-Hant` get the same icon, as do `sr-Cyrl`/`sr-Latn`. Flags cannot express a writing system.
  That, plus the fact that a flag never names a language, is why the icon is `aria-hidden` and every call site keeps the locale name beside
  it.
- **English is the UK flag.** circle-flags uses it for the `en` language, so `en-GB` collapses to one circle while `en-US` shows 🇬🇧 🇺🇸.
  Change it in `LANGUAGE_FLAGS` handling if that reads wrong for your authors.

**Two whole circles that overlap slightly, language in front.** This took two passes to get right. Halving one circle with a hairline
divider read as a single smudged flag at 16px; two fully separate circles read as two unrelated icons. They now share **15% of a circle**
(`$overlap` in the stylesheet), which reads as one badge made of two flags, and the language circle sits on top (`z-index` on `--language`)
so it is the one that stays whole.

Both circles are **absolutely positioned** against the two ends of the host — `left: 0` and `right: 0` — rather than offset with a negative
margin. At `2 - $overlap` wide that leaves exactly the intended overlap, and it avoids percentage margins, which resolve against an
auto-sized flex container and would be unreliable.

The badge is therefore **wider than it is tall** — ~30px at `h-4` — and it keeps that width **even for a locale with one flag**. That is
deliberate: a badge that shrank to its content pulled the label of every one-flag row left of its neighbours, so a filtered list (search
"German" in the add-locale dropdown) came out visibly ragged. The lone circle is pinned to the leading edge, so the language flag lines up
too; what varies between rows is only the empty space after it.

Consequently the host sets a **height only** (`h-4`), never `size-*`: a fixed width clips the second flag, which is what a `size-4` host
class did before this was understood. The width comes from an `aspect-ratio`, which also gives the box a definite width for the percentage
offsets above. Changing `h-4` to `h-5` is all it takes to resize the badge.

A hairline `var(--border)` ring is drawn inside each circle, because the flags are circular artwork on a transparent background: a white
flag like Japan's, or the white band of Italy's, has no visible edge against a light row without it.

**Where the data comes from.** Flags are the `circle-flags` package (MIT), copied into `assets/flags` by an `angular.json` asset glob — all
633 files. The constants cover every language flag and every two-letter (ISO 3166) region flag of the package, independent of the
locale list, which lives in the database. The component cannot stat that folder at
runtime, so the available codes are baked into `locale-flags.ts` by `tools/scripts/generate-locale-flags.mjs`; a wrong constant would point an
`<img>` at a missing asset, which the server's SPA fallback (`SpaFallbackFilter`) answers with `index.html` instead of a 404.
`tools/scripts/generate-locale-flags.test.mjs` (part of `pnpm test:scripts`) fails when the constants and the installed package disagree —
re-run the generator after upgrading it. The collapse list (`IDENTICAL_FLAG_PAIRS`, `language-region` pairs) is computed by **comparing file contents**, not by mapping a language to "its"
country: `gb.svg` and `uk.svg` are identical bytes, and matching by name got `en-GB` wrong.

### LocaleDialogComponent

Form: a single `locale` combobox. Options come from `LocaleService.findAll()` minus the locales the space already has (passed in via
the dialog context); the search filters by name. Each option carries its locale icon, and the selected locale's icon is mirrored as an
inline-start addon on the input.

It is a Spartan-framed dialog — `HlmDialogService` to open, `injectBrnDialogContext()` for its input, `BrnDialogRef.close()` to return. All
dialogs in `features/spaces` now follow this pattern (the delete confirmation included), so `LocalesComponent` injects only
`HlmDialogService`. The recipe, the test setup and the width/scrolling traps are in
[Spartan UI Migration → `MatDialog` → `HlmDialogService`](../../spartan-ui-migration.md#matdialog--hlmdialogservice).

---

## TokensComponent

Create and manage API tokens ([Auth Tokens](../../auth-tokens.md)), displayed in an `ll-table` with columns `hint`, `name`, `type`,
`cacheTtl`, `updatedAt`, `actions` (`displayedColumns` in `tokens.component.ts`). A new space already has one token, the
**Auto Generated Preview Token**. The table is one page from the server (`PagedList`, `SpaceTokenService.findAll`,
`GET …/tokens?page=&size=&sort=&direction=&search=`), newest first unless sorted by Name or Updated At; the search box
matches the name or the hint. It reloads on every `tokens` change event.

- **Token** shows the `hint` (prefix and last 4 characters, e.g. `mgt_…aB3x`), never the whole value.
- **Type** is a badge (icon and label from `TOKEN_TYPE_INFO`, `shared/models/token.model.ts`), its description as tooltip.
- **Cache TTL** shows `—` for management tokens, which are never cached.

**Token dialog** (`token-dialog/`): name, the type as choice cards (`hlm-radio-group`, the same markup as the template choice in
Admin → Spaces → Create), one card per type with where to use it, and the Cache TTL field for Public and Preview only. The type
is chosen on create and shown locked on edit (it can't change).

**Show-once dialog** (`token-secret-dialog/`): after a management token is created or regenerated, its value and the
`localess login --origin … --space … --token …` command, each with a copy button, and "You won't see this token again".
It opens with `disableClose`, `closeOnOutsidePointerEvents: false` and no ✕: Escape or a stray click can't lose the value;
only its "I've copied it" button closes it.

**Key behaviour:**

- `openAddDialog()` / `openEditDialog(element)` — open `TokenDialogComponent`; edit sends the name and cache TTL only
- `openRegenerateDialog(element)` — confirmation that every client using the current token loses access, then
  `SpaceTokenService.regenerate()`: same id, type and name under a new value (shown once for management tokens)
- `openDeleteDialog(element)` — confirmation dialog then deletes the token
- `copied()` — feedback when a public or preview token value is copied (management tokens have no copy button)

**Services:** `SpaceTokenService`, `NotificationService`, `HlmDialogService`, `SpaceStore`

### TokenDialogComponent

Form fields (`token-dialog.component.ts:62-66`; helpers follow below it):

- `name` — token name
- `permissions[]` — rendered as checkboxes grouped by category (Translation, Content, Development), not a plain multiselect;
  `isPermissionSelected()` / `togglePermission()` manage the underlying `string[]` form control. A computed `usageInfo` (via `getTokenUsageInfo()`) shows
  a live usage-classification badge as permissions are toggled.
- `cacheTtl` — optional numeric override (in seconds) for how long the CDN caches this token's redirect responses; `resetCacheTtl()` clears
  it back to the space/system default. See [CDN & Caching](../../cdn-caching.md) for how `cacheTtl` affects redirect `Cache-Control`
  behaviour on the backend (including `cacheTtl: 0` disabling caching entirely).

> See [Auth Tokens](../../auth-tokens.md) for the full token permission model and how tokens are validated on the CDN.

---

## VisualEditorComponent

Configure the **visual editor** integration — allows in-context editing when Localess is embedded in a preview environment. Environments
(`space_environments`: id, name, url, position) are managed one by one and every change is saved at once; names may repeat, the id tells
them apart, and the first is the default ("(default)" beside its name, whatever the table's sort or search). The table is one page
from the server, like Locales (`GET /api/app/spaces/:s/environments`, `Page<SpaceEnvironment>`, a `PagedList`, see
[pagination](../../server/pagination.md)): in the space's order until the Name or URL header sorts it (cleared: the space's order
again), searched by name or URL through an `<ll-filter-toolbar>` (`onFilterChange()`). It reloads on the space's `spaces` change
event. `GET …/environments/names` answers every environment as `IdNameUrl[]` (`{ id, name, url }`), in its order.

- `openAddDialog()` / `openEditDialog(environment)` — `EnvironmentDialogComponent` (name + URL, with the example URL under the field), then
  `SpaceEnvironmentService.create()` (`POST /api/app/spaces/:s/environments`, appended last) or `update()`
  (`PUT …/environments/:id`, name and URL together); both answer the `SpaceEnvironment`
- `openDeleteDialog(environment)` — `ConfirmationDialogComponent`, then `SpaceEnvironmentService.remove()` (`DELETE …/environments/:id`, 204)
- `move(environment, ±1)` / `canMove()` — **Move Up / Move Down** in the row menu: moves the environment one place in the
  space's order: `POST …/environments/:id/move {position}`, 204, as for locales (the others shift, -1 or past the end is the last, only the
  rows that change are written)

The space's order and the default come from `SpaceStore.environments()`: every environment as `IdNameUrl`
(`SpaceEnvironmentService.findAllNames()`, `GET …/environments/names`, live), which the content Visual Editor also uses for its
preview URLs (its environment picker and the selected environment are `IdNameUrl` too).

The dialog's URL control uses `SpaceValidator.ENVIRONMENT_URL`, which also requires an absolute `http:`/`https:` URL on a different origin from the app
(error key `previewUrl`). This only gives feedback in the form; the security check that matters runs again when the preview renders. See
"Preview security" in [contents.md](contents.md).

**URL patterns:** a URL without `{` keeps the original convention, `url + locale/ + fullSlug` with the locale left out for the default
locale. A URL with placeholders is filled in instead by `resolvePreviewUrl()` (`core/utils/preview-url.ts`):

| Placeholder    | Value for `blog/hello` in German (default locale `en`)               |
|----------------|-----------------------------------------------------------------------|
| `{fullSlug}`   | `blog/hello`                                                          |
| `{slug}`       | `hello`                                                               |
| `{parentSlug}` | `blog`                                                                |
| `{documentId}` | the document id                                                       |
| `{locale}`     | `de`; the space's default locale (`en`) on the `default` sentinel       |
| `{locale/}`    | `de/`; nothing for the default locale                                 |

Values are URL-encoded per path segment. The validator rejects unknown placeholders (error key `previewUrlPlaceholder`) and checks the URL
filled with `SAMPLE_PREVIEW_CONTEXT`, because `{locale}` may sit in the host. Each valid field shows what it opens for that sample
(`exampleUrl()`). The preview resolves the URL for the open document and locale, checks the result with `isSafePreviewUrl`, and exchanges
messages only with the resolved URL's origin (`ContentPreviewComponent.previewOrigin()`).

**Services:** `SpaceEnvironmentService` (the page, add, update, delete, move), `NotificationService`, `PlatformService`, `SpaceStore`, `LocalSettingsStore`

---

## DangerZoneComponent

Destructive, irreversible operations. Currently only one action is implemented:

- **Delete All Translations** — `deleteTranslations()` calls `TranslationService.deleteAll()` to remove every translation in the space

Requires explicit confirmation via `ConfirmationDialogComponent`. There is no "delete space" action here — space deletion is not implemented
in this component.

**Services:** `TranslationService`, `NotificationService`, `HlmDialogService`, `SpaceStore`

---

## Services Used

| Service               | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `SpaceService`        | Update the space name; set its default locale (`SpaceController`) |
| `SpaceLocaleService`  | The space's locales: page, add, move, delete (`SpaceLocaleController`; in `settings/locales/`) |
| `SpaceEnvironmentService` | The space's Visual Editor environments: page, names, add, update, delete, move (`SpaceEnvironmentController`) |
| `LocaleService`       | The locale catalog (`LocaleController`) and what the translation provider supports |
| `SpaceTokenService`   | CRUD for API tokens                          |
| `TranslationService`  | Delete all translations (Danger Zone)        |
| `NotificationService` | Snackbar feedback                            |
| `SpaceStore`          | Read selected space data                     |
