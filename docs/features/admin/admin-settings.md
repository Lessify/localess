# Admin — Settings Module

> Parent: [Admin Overview](overview.md)

## Purpose

Platform-wide application settings — currently covers UI branding (theme colours, text). Intended to expand with additional global configuration sections.

## Route

```
/features/admin/settings          [SETTINGS_MANAGEMENT permission]
  → redirects to /settings/ui
  /ui                             ← UiComponent
```

## Key Files

```
src/app/features/admin/settings/
  settings.component.ts/html/scss    ← tab container
  ui/
    ui.component.ts/html/scss        ← UI settings form
```

## SettingsComponent

Tab-based shell container built on Spartan `hlm-tabs`. Tracks the active tab as a signal and updates the Router on tab change via `onTabActivated()`.

**Injected services:** `Router`

## UiComponent

Reactive form for editing global UI settings — two fields only: `text` and `color` (validated by `SettingsValidator`). Saves via `SettingsService`.

**Injected services:** `FormBuilder`, `FormErrorHandlerService` (field error messages), `SettingsService`, `ChangeDetectorRef`, `NotificationService`

**Key behaviour:**
- Loads current settings in the constructor via `SettingsService.find()` and patches `settings.ui` into the form
- `save()` — calls `SettingsService.updateUi()`, which writes `ui` + `updatedAt` to `configs/settings` with `setDoc(..., { merge: true })`

## Services Used

| Service | Purpose |
|---------|---------|
| `SettingsService` | Read and write global app settings from Firestore |
| `NotificationService` | Toast feedback |
