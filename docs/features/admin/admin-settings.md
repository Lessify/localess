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

Tab-based shell container. Tracks the active tab as a signal and updates the Router on tab change via `onTabActivated()`.

**Injected services:** `Router`

## UiComponent

Form for editing global UI settings (branding colours, label overrides). Saves via `SettingsService`.

**Injected services:** `FormBuilder`, `SettingsService`, `NotificationService`

**Key behaviour:**
- Loads current settings on init via `SettingsService.find()`
- `save()` — patches settings document in Firestore

## Services Used

| Service | Purpose |
|---------|---------|
| `SettingsService` | Read and write global app settings from Firestore |
| `NotificationService` | Snackbar feedback |
