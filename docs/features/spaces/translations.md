# Spaces — Translations Module

> Parent: [Spaces Overview](overview.md) · Related: [Publish Flow](../../publish-flow.md) · [Tasks](tasks.md) ·
> [Concepts — Translation](../../concepts.md)

> **Hidden for now:** Import and Export are switched off in the UI (`FEATURE_FLAGS.importExport`) until the issues in [Import / Export](../../roadmap/import-export.md) are fixed.

## Purpose

Manage all localisation keys for a space. Supports creating, editing, and publishing translations across multiple locales. Includes
AI-powered translation, import/export, and tree or list view.

## Route

```
/features/spaces/:spaceId/translations    [TRANSLATION_READ]
```

## Key Files

```
apps/web/src/app/features/spaces/translations/
  translations.component.ts/html/scss    ← main list/tree view
  add-dialog/                            ← create new translation key
  edit-dialog/                           ← edit key metadata
  edit-id-dialog/                        ← rename a key's ID
  export-dialog/                         ← export to file
  import-dialog/                         ← import from file (creates Task)
  shared/components/
    translation-string-view/ translation-string-edit/  ← STRING type components (only type with an editor UI)
    translation-detail/                  ← per-key detail panel, locale editing, keyboard navigation
    translation-list/                    ← flat/tree list rendering (renders `<ll-tree>`)
    translation-filter/                  ← search/filter bar
    translation-status/                  ← visual status badge

apps/web/src/app/shared/models/
  translation.model.ts                   ← Translation, TranslationType, etc.

apps/web/src/app/shared/components/
  translate-locale-dialog/               ← shared/global dialog, also used by Contents (bulk AI-translate to a target locale)
```

## TranslationsComponent

The main component is one of the most complex in the app. It renders a hierarchical tree (or flat list) of translation keys across all
locales of the selected space.

**Injected services:** `TranslationService`, `TaskService`, `TokenService`, `TranslateService`, `NotificationService`, `HlmDialogService`, `LocalSettingsStore`, `SpaceStore`

**Key behaviour:**

- `ngOnInit()` — loads all translations for the space via `translationService.findAll(spaceId)` (a live query over `GET /api/app/spaces/:s/translations`, refetched on `translations` change events)
- Inline editing — clicking a row opens `TranslationDetailComponent` (see below) for the key
- `publish()` — publishes all translations (`POST /api/app/spaces/:s/translations/publish`), which writes one `translation_published` row per locale (see [Publish Flow](../../publish-flow.md))
- `openImportDialog()` — opens import dialog → creates a **Task** for background processing
- `openExportDialog()` — opens export dialog → creates a **Task** for background processing
- `openTranslateLocaleDialog()` — opens the shared `TranslateLocaleDialogComponent` → calls `translationService.translateLocale(spaceId, sourceLocale, targetLocale)` (`POST /api/app/spaces/:s/translations/translate-locale`) to bulk-translate one locale into another with the configured machine-translation provider, in a single transaction
- Layout toggle: **list** (flat) ↔ **tree** (hierarchical), persisted in `LocalSettingsStore.translationLayout`

`TranslationDetailComponent` (`shared/components/translation-detail/`) owns per-key editing: it injects `PlatformService`, `LocaleService`,
`TranslateService`, `TranslationService`, `NotificationService`, `HlmDialogService`, handles keyboard shortcuts via a `(window:keydown)` host listener
(`captureKeyboard()`), and runs AI-assisted translation in `translate()`, which goes through `TranslateService.translate()` → `POST /api/app/translate`
(the provider — DeepL, Google Cloud Translation, or a development stub — is chosen server-side from env). It also opens the per-key dialogs: `openEditDialog()`, `openEditIdDialog()` and
`openDeleteDialog()` (`EditDialogComponent`, `EditIdDialogComponent`, `ConfirmationDialogComponent`).

**Only the translate button is gated by provider support here**, not the two selects. Those selects also choose which locale is displayed
and hand-edited, so every locale of the space stays selectable — a locale Google cannot translate is still one an author writes by hand.
`isLocaleTranslatable(source, target)` disables the button when the pair is identical or when either end is unsupported in its own direction
(`canTranslateFrom()` / `canTranslateTo()` → `LocaleService.isLocaleTranslatableFrom()` / `isLocaleTranslatableTo()`), and
`translateTooltip()` says which of the three it is rather than leaving a dead button unexplained.

The directions are asked separately because Google models them separately. `TranslateLocaleDialogComponent` and the content-side per-field
menus disable their locale options too — those pick nothing but the translation — and the Locales settings table reports both directions per
locale, see [Space Settings → Translation support](settings.md#translation-support).

## Translation Types

`TranslationType` (`STRING`, `PLURAL`, `ARRAY`) is defined in the data model, but only `STRING` currently has an editor UI:

| Type     | Component                                                           | Description                                                                  |
| -------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `STRING` | `TranslationStringEditComponent` / `TranslationStringViewComponent` | Single value per locale — the only type creatable/editable from the UI today |
| `PLURAL` | —                                                                   | Defined in `TranslationType` enum, no dedicated edit/view component exists   |
| `ARRAY`  | —                                                                   | Defined in `TranslationType` enum, no dedicated edit/view component exists   |

`AddDialogComponent` hardcodes `type: 'STRING'` on its form — there is no type picker, so new keys are always created as `STRING`.

## Dialogs

| Dialog                           | Purpose                                                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AddDialogComponent`             | Create a new translation key (always `STRING` type — no type picker; Key, labels, description, optional client-side auto-translate to other locales)                   |
| `EditDialogComponent`            | Edit key metadata (labels, description)                                                                                                                               |
| `EditIdDialogComponent`          | Rename a translation key (`PUT …/:id/key`, addressed by the UUID `id`)                                                                                                 |
| `ExportDialogComponent`          | Choose format and locales to export                                                                                                                                   |
| `ImportDialogComponent`          | Upload a translation file → creates a Task                                                                                                                            |
| `TranslateLocaleDialogComponent` | Bulk AI-translate to a target locale — shared/global component (`apps/web/src/app/shared/components/translate-locale-dialog/`), also used by Contents' `EditDocumentComponent` |
| `ConfirmationDialogComponent`    | Delete confirmation                                                                                                                                                   |

## Services Used

| Service               | Purpose                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `TranslationService`  | CRUD + publish + translate-locale via `/api/app/spaces/:s/translations` (reads are live)                 |
| `TaskService`         | Create import/export tasks                                                                               |
| `TokenService`        | Retrieve API token for CDN preview links                                                                 |
| `TranslateService`    | AI translation via `POST /api/app/translate` (`translate()` single, `translateBatch()` batch)            |
| `NotificationService` | Snackbar feedback                                                                                        |
| `LocaleService`       | Load space locales (used by `TranslationDetailComponent`, not the main component)                        |
| `PlatformService`     | Platform detection for keyboard shortcuts (used by `TranslationDetailComponent`, not the main component) |

## Draft Generation

There is no separate draft publish. Draft translations (`?version=draft` on the public API) are computed on read from the
`translations` table, and every translation write bumps the space's `translation_version` and emits a change event in the same
transaction. `updatedBy` is set by the server from the session, not sent by the client.

## Auto-Translate on Create

`AddDialogComponent` has an "auto-translate" switch for `STRING` keys. Rather than a server-side hook on create,
`TranslationsComponent.openAddDialog()` resolves every locale value client-side **before** writing anything:

1. If auto-translate is checked, it calls the generic `POST /api/app/translate` endpoint (`TranslateService.translate()`, also used for
   single-cell AI translation) in parallel (`forkJoin`) for each of `space.locales` other than the fallback.
2. All resulting values (fallback + translated locales) are merged into a single `locales` map.
3. `TranslationService.create()` sends **one** `POST /api/app/spaces/:s/translations` with the full `locales` map already populated — no follow-up per-locale
   writes.

Per-locale translation failures are caught and logged so one bad translation doesn't block the others or the create itself; that locale is
simply left untranslated.
