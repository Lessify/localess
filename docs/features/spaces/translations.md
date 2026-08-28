# Spaces — Translations Module

> Parent: [Spaces Overview](overview.md) · Related: [Publish Flow](../../publish-flow.md) · [Tasks](tasks.md) · [Concepts — Translation](../../concepts.md)

## Purpose

Manage all localisation keys for a space. Supports creating, editing, and publishing translations across multiple locales. Includes AI-powered translation, import/export, and tree or list view.

## Route

```
/features/spaces/:spaceId/translations    [TRANSLATION_READ]
```

## Key Files

```
src/app/features/spaces/translations/
  translations.component.ts/html/scss    ← main list/tree view
  add-dialog/                            ← create new translation key
  edit-dialog/                           ← edit key metadata
  edit-id-dialog/                        ← rename a key's ID
  export-dialog/                         ← export to file
  import-dialog/                         ← import from file (creates Task)
  shared/components/
    translation-string-view/ translation-string-edit/  ← STRING type components (only type with an editor UI)
    translation-detail/                  ← per-key detail panel, locale editing, keyboard navigation
    translation-list/                    ← flat/tree list rendering
    translation-filter/                  ← search/filter bar
    translation-status/                  ← visual status badge

src/app/shared/components/
  translate-locale-dialog/               ← shared/global dialog, also used by Contents (bulk AI-translate to a target locale)
```

## TranslationsComponent

The main component is one of the most complex in the app. It renders a hierarchical tree (or flat list) of translation keys across all locales of the selected space.

**Injected services:** `TranslationService`, `TaskService`, `TokenService`, `TranslateService`, `NotificationService`

**Key behaviour:**
- `loadTranslations()` — fetches all translation documents for the space
- Inline editing — clicking a row opens `TranslationDetailComponent` (see below) for the key
- `publishTranslation()` — publishes all translations to Firebase Storage (see [Publish Flow](../../publish-flow.md))
- `openImportDialog()` — opens import dialog → creates a **Task** for background processing
- `openExportDialog()` — opens export dialog → creates a **Task** for background processing
- Layout toggle: **list** (flat) ↔ **tree** (hierarchical), persisted in `LocalSettingsStore.translationLayout`

`TranslationDetailComponent` (`shared/components/translation-detail/`) owns per-key editing: it injects `PlatformService`, `LocaleService`, `TranslateService`, `TranslationService`, `NotificationService`, handles keyboard shortcuts via a `(window:keydown)` host listener (`captureKeyboard()`), and calls `translateAi()`-style AI-assisted translation (Google Translate or DeepL via Remote Config).

## Translation Types

`TranslationType` (`STRING`, `PLURAL`, `ARRAY`) is defined in the data model, but only `STRING` currently has an editor UI:

| Type | Component | Description |
|------|-----------|-------------|
| `STRING` | `TranslationStringEditComponent` / `TranslationStringViewComponent` | Single value per locale — the only type creatable/editable from the UI today |
| `PLURAL` | — | Defined in `TranslationType` enum, no dedicated edit/view component exists |
| `ARRAY` | — | Defined in `TranslationType` enum, no dedicated edit/view component exists |

`AddDialogComponent` hardcodes `type: 'STRING'` on its form — there is no type picker, so new keys are always created as `STRING`.

## Dialogs

| Dialog | Purpose |
|--------|---------|
| `AddDialogComponent` | Create a new translation key (always `STRING` type — no type picker; ID, labels, description, optional client-side auto-translate to other locales) |
| `EditDialogComponent` | Edit key metadata (labels, description) |
| `EditIdDialogComponent` | Rename a translation key ID |
| `ExportDialogComponent` | Choose format and locales to export |
| `ImportDialogComponent` | Upload a translation file → creates a Task |
| `TranslateLocaleDialogComponent` | Bulk AI-translate to a target locale — shared/global component (`src/app/shared/components/translate-locale-dialog/`), also used by Contents' `EditDocumentComponent` |
| `ConfirmationDialogComponent` | Delete confirmation |

## Services Used

| Service | Purpose |
|---------|---------|
| `TranslationService` | CRUD + publish + publishDraft (called automatically after every write) |
| `TaskService` | Create import/export tasks |
| `TokenService` | Retrieve API token for CDN preview links |
| `TranslateService` | AI translation (Google Translate / DeepL) |
| `NotificationService` | Snackbar feedback |
| `LocaleService` | Load space locales (used by `TranslationDetailComponent`, not the main component) |
| `PlatformService` | Platform detection for keyboard shortcuts (used by `TranslationDetailComponent`, not the main component) |

## Draft Generation

Every write operation in `TranslationService` (create, update, updateId, updateLocale, delete) automatically chains a call to `translation-publishdraft` onCall after the Firestore write succeeds. This keeps the draft Storage files (`draft/{locale}.json`) in sync without a Firestore trigger.

## Auto-Translate on Create

`AddDialogComponent` has an "auto-translate" switch for `STRING` keys. Rather than a dedicated `onDocumentCreated` Firestore trigger (removed to reduce deployed function count), `TranslationsComponent.openAddDialog()` resolves every locale value client-side **before** writing anything:
1. If auto-translate is checked, it calls the existing generic `translate` callable (`TranslateService.translate()`, also used for single-cell AI translation) in parallel (`forkJoin`) for each of `space.locales` other than the fallback.
2. All resulting values (fallback + translated locales) are merged into a single `locales` map.
3. `TranslationService.create()` performs **one** Firestore `setDoc` with the full `locales` map already populated — no follow-up per-locale writes.

Per-locale translation failures are caught and logged so one bad translation doesn't block the others or the create itself; that locale is simply left untranslated.
