# Spaces — Translations Module

> Parent: [Spaces Overview](overview.md) · Related: [Publish Flow](../../publish-flow.md) · [Tasks](tasks.md) · [Concepts — Translation](../../concepts.md)

## Purpose

Manage all localisation keys for a space. Supports creating, editing, and publishing translations across multiple locales. Includes AI-powered translation, history tracking, import/export, and tree or list view.

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
  shared/
    string-view/ string-edit/            ← STRING type components
    plural-view/ plural-edit/            ← PLURAL type components
    array-view/  array-edit/             ← ARRAY type components
    translation-status/                  ← visual status badge
    translation-history/                 ← history sidebar
```

## TranslationsComponent

The main component is one of the most complex in the app. It renders a hierarchical tree (or flat list) of translation keys across all locales of the selected space.

**Injected services:** `TranslationService`, `TranslationHistoryService`, `LocaleService`, `TaskService`, `TokenService`, `TranslateService`, `NotificationService`, `PlatformService`

**Key behaviour:**
- `loadTranslations()` — fetches all translation documents for the space
- Inline editing — clicking a cell opens the appropriate edit component (string/plural/array)
- `publishTranslation()` — publishes all translations to Firebase Storage (see [Publish Flow](../../publish-flow.md))
- `translateAi(key, targetLocale)` — calls `TranslateService` for AI-assisted translation (Google Translate or DeepL via Remote Config)
- `openImportDialog()` — opens import dialog → creates a **Task** for background processing
- `openExportDialog()` — opens export dialog → creates a **Task** for background processing
- Keyboard shortcuts for fast navigation between cells
- Layout toggle: **list** (flat) ↔ **tree** (hierarchical), persisted in `LocalSettingsStore.translationLayout`

## Translation Types

| Type | Component | Description |
|------|-----------|-------------|
| `STRING` | `TranslationStringEditComponent` | Single value per locale |
| `PLURAL` | `TranslationPluralEditComponent` | Plural forms per locale |
| `ARRAY` | `TranslationArrayEditComponent` | List of strings per locale |

## Dialogs

| Dialog | Purpose |
|--------|---------|
| `AddDialogComponent` | Create a new translation key (type, ID, labels, description) |
| `EditDialogComponent` | Edit key metadata (labels, description, autoTranslate flag) |
| `EditIdDialogComponent` | Rename a translation key ID |
| `ExportDialogComponent` | Choose format and locales to export |
| `ImportDialogComponent` | Upload a translation file → creates a Task |
| `TranslateLocaleDialogComponent` | Bulk AI-translate to a target locale |
| `ConfirmationDialogComponent` | Delete confirmation |

## Services Used

| Service | Purpose |
|---------|---------|
| `TranslationService` | CRUD + publish |
| `TranslationHistoryService` | Load and display edit history per key |
| `LocaleService` | Load space locales |
| `TaskService` | Create import/export tasks |
| `TokenService` | Retrieve API token for CDN preview links |
| `TranslateService` | AI translation (Google Translate / DeepL) |
| `NotificationService` | Snackbar feedback |
| `PlatformService` | Platform detection (keyboard shortcuts differ per OS) |
