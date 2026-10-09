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

Add and remove locales from the space (there is no reordering). Set the **fallback locale** — used by the CDN when a requested locale has no
published data. The table is filtered through an `<ll-filter-toolbar>` (`onFilterChange()`).

- `openAddDialog()` — opens `LocaleDialogComponent`, passing the space's existing locales so they are excluded
- `openDeleteDialog(element)` — `ConfirmationDialogComponent`, then deletes the locale (`DELETE /api/app/spaces/:s/locales/:locale`). The action is disabled for the fallback locale, and the server refuses to delete it too
- `markAsFallback(element)` — makes the locale the space's fallback (`PUT /api/app/spaces/:s/locale-fallback`)

**Services:** `LocaleService`, `NotificationService`, `HlmDialogService`, `SpaceStore`

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
633 files, since restricting the glob would have to be regenerated whenever a locale is added. The component cannot stat that folder at
runtime, so the available codes are baked into `locale-flags.ts` by `tools/scripts/generate-locale-flags.mjs`; a wrong constant would point an
`<img>` at a missing asset, which the server's SPA fallback (`SpaFallbackFilter`) answers with `index.html` instead of a 404.
`tools/scripts/generate-locale-flags.test.mjs` (part of `pnpm test:scripts`) fails when the constants and the installed package disagree —
re-run the generator after upgrading it. The collapse list is computed by **comparing file contents**, not by mapping a language to "its"
country: `gb.svg` and `uk.svg` are identical bytes, and matching by name got `en-GB` wrong.

### LocaleDialogComponent

Form: a single `locale` combobox. Options come from `LocaleService.findAllLocales()` minus the locales the space already has (passed in via
the dialog context); the search filters by name. Each option carries its locale icon, and the selected locale's icon is mirrored as an
inline-start addon on the input.

It is a Spartan-framed dialog — `HlmDialogService` to open, `injectBrnDialogContext()` for its input, `BrnDialogRef.close()` to return. All
dialogs in `features/spaces` now follow this pattern (the delete confirmation included), so `LocalesComponent` injects only
`HlmDialogService`. The recipe, the test setup and the width/scrolling traps are in
[Spartan UI Migration → `MatDialog` → `HlmDialogService`](../../spartan-ui-migration.md#matdialog--hlmdialogservice).

---

## TokensComponent

Create and manage API access tokens, displayed in an `ll-table` with columns `id`, `name`, `version`, `permissions`, `usage`, `cacheTtl`,
`updatedAt`, `actions` (`displayedColumns` in `tokens.component.ts`). Tokens come in two shapes:

- **v1** — legacy tokens with an implicit, fixed permission set (`TOKEN_V1_IMPLICIT_PERMISSIONS`)
- **v2** — current tokens with explicit `permissions[]` and an optional `cacheTtl` override

`isTokenV2()` distinguishes the two at runtime, so v1 tokens still render sensibly in the table and edit dialog.

The permissions column is rendered via `permissionsToText()`, which joins the token's `TokenPermission` values into a comma-separated string
(`tokens.component.ts:214-216`). The usage column shows a classification badge computed by `permissionsToUsage()` / `getTokenUsageInfo()`,
which derives a human-readable usage category (e.g. read-only/public vs. draft/write access) from the permission set — for v1 tokens this is
computed from `TOKEN_V1_IMPLICIT_PERMISSIONS` (`tokens.component.ts:218-220`).

**Key behaviour:**

- `openAddDialog()` / `openEditDialog(element)` — open `TokenDialogComponent` to create/edit a token
- `openRegenerateDialog(element)` — opens a `ConfirmationDialogComponent` warning that all clients using the current token immediately lose
  access, then calls `TokenService.regenerate()` to issue a new token value while keeping the same name/permissions/cacheTtl
  (`tokens.component.ts:162-186`)
- `openDeleteDialog(element)` — confirmation dialog then deletes the token
- `copied()` — snackbar feedback when a token ID is copied to clipboard

**Services:** `TokenService`, `NotificationService`, `HlmDialogService`, `SpaceStore`

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

Configure the **visual editor** integration — allows in-context editing when Localess is embedded in a preview environment. The form is an
`environments` `FormArray` of `{ name, url }` groups: `addEnvironment()` / `removeEnvironment(i)` add and remove rows,
`environmentDropDrop()` reorders them by drag-and-drop (CDK), and `save()` writes them via `SpaceService.updateEnvironments()`. The form is
repopulated whenever `SpaceStore.selectedSpace` changes. `captureKeyboard()` (a `(window:keydown)` host listener) saves on Ctrl/Cmd + S.

The URL control uses `SpaceValidator.ENVIRONMENT_URL`, which also requires an absolute `http:`/`https:` URL on a different origin from the app
(error key `previewUrl`). This only gives feedback in the form; the security check that matters runs again when the preview renders. See
"Preview security" in [contents.md](contents.md).

**URL patterns:** a URL without `{` keeps the original convention, `url + locale/ + fullSlug` with the locale left out for the default
locale. A URL with placeholders is filled in instead by `resolvePreviewUrl()` (`core/utils/preview-url.ts`):

| Placeholder    | Value for `blog/hello` in German (fallback locale `en`)               |
|----------------|-----------------------------------------------------------------------|
| `{fullSlug}`   | `blog/hello`                                                          |
| `{slug}`       | `hello`                                                               |
| `{parentSlug}` | `blog`                                                                |
| `{documentId}` | the document id                                                       |
| `{locale}`     | `de`; the space's fallback locale (`en`) for the default locale       |
| `{locale/}`    | `de/`; nothing for the default locale                                 |

Values are URL-encoded per path segment. The validator rejects unknown placeholders (error key `previewUrlPlaceholder`) and checks the URL
filled with `SAMPLE_PREVIEW_CONTEXT`, because `{locale}` may sit in the host. Each valid field shows what it opens for that sample
(`exampleUrl()`). The preview resolves the URL for the open document and locale, checks the result with `isSafePreviewUrl`, and exchanges
messages only with the resolved URL's origin (`ContentPreviewComponent.previewOrigin()`).

**Services:** `SpaceService`, `NotificationService`, `PlatformService`, `SpaceStore`, `LocalSettingsStore`

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
| `SpaceService`        | Update space name and visual editor settings |
| `LocaleService`       | CRUD for space locales                       |
| `TokenService`        | CRUD for API tokens                          |
| `TranslationService`  | Delete all translations (Danger Zone)        |
| `NotificationService` | Snackbar feedback                            |
| `SpaceStore`          | Read selected space data                     |
