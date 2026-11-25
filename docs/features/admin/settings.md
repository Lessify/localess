# Admin — Settings Module

> Parent: [Admin Overview](overview.md) · Related: [Configuration](../../deployment/configuration.md#integrations-environment-or-admin--settings) · Design: [2026-10-29 integrations settings](../../superpowers/specs/2026-10-29-integrations-settings-design.md)

## Purpose

Install-wide settings, for admins only. The first section is **Integrations**: an admin connects DeepL, Google Cloud
Translation and Unsplash by pasting a key, with no server access and no restart. Integrations set in the server
environment are shown read-only.

## Route

```
/features/admin/settings          [ADMINS]
```

## Key Files

```
apps/web/src/app/features/admin/settings/
  settings.module.ts / settings-routing.module.ts
  integrations/integrations.component.ts/html   ← the page: cards grouped by category, the primary translation provider
  integrations/integration-card/                 ← one integration: badge, switch, generated form, test result
  integrations/integration.service.ts            ← /api/app/admin/integrations (the list is live)
packages/shared/src/models/integration.model.ts  ← INTEGRATIONS: one definition per integration (fields, lock env vars)
apps/server/src/shared/services/integration.service.ts       ← env → saved in the UI → off, cached, events
apps/server/src/shared/integrations/                         ← per provider: validate, test call, error classification
apps/server/src/modules/integrations/                        ← the admin API
apps/server/src/infra/secrets/secret-box.ts                  ← AES-256-GCM, LOCALESS_SECRET_KEY or secret.key
```

## How an integration's state is decided

1. **Environment:** its lock variable is set (`DEEPL_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `UNSPLASH_API_KEY`). All its values
   come from env; the card shows **Server configuration** and the variable, with only **Test connection**. The API
   answers `409` to any change.
2. **Saved in the UI:** an `integration_settings` row (values sealed in `secrets`, `hints` for display, `status`).
3. **Off.**

## Card states

| Badge | When | Actions |
|-------|------|---------|
| Not connected | No env, no row | Connect → the form generated from the definition's fields, **Test & enable** |
| Server configuration | Env-locked | Test connection |
| Connected | Saved, `verified` | Switch, Test, Replace, Disconnect |
| Not verified | Saved with **Save without testing** (provider unreachable) | As Connected; clears on the first successful call |
| Key rejected / Quota reached | A real call failed on the key or the quota | As Connected; the integration stays on, clears on the next success |
| Key unreadable | The row can't be decrypted on this server | Enter again, Disconnect |

- **Test & enable** makes one real call before saving: a wrong key or an incomplete setup (Google's API not enabled) is
  never saved, and the message says what to fix. When the provider can't be reached, **Save without testing** is offered.
- Saved keys are never sent back to the browser: the card shows the hint (`••••` + last 4 characters; for Google, the
  service account's email). Replace is the only way to change one.
- Switching off keeps the key; Disconnect deletes it (with a confirmation).

## Machine translation

When DeepL and Google are both on, the page shows which is tried first (DeepL / Google). It's locked when
`LOCALESS_TRANSLATE_PRIMARY` is set. The other provider takes the language pairs the primary doesn't support, and the
requests the primary fails on (key, quota, network).

## Live updates

Every change publishes an `integrations` change event (no values in it) to every signed-in user. The page re-reads its
list; every open app re-reads `GET /api/config` (`AppConfigService.watch()`, started by `FeaturesComponent`), so
Translate buttons and the Unsplash picker appear or disappear without a reload. `/api/config` also lists the locales the
connected providers translate (`translate.sourceLocales` / `targetLocales`), which `LocaleService` uses.

## Adding an integration

1. A definition in `packages/shared/src/models/integration.model.ts` (`INTEGRATIONS`): id, category, fields, `lockEnv`.
2. A provider class in `apps/server/src/shared/integrations/` (`validate`, `test`, `classify`), added to
   `integrationProviders()`, and its env values in `integrationEnv()` (`infra/config/config.ts`).
3. The service that uses it reads `IntegrationService.resolve(id)` and records outcomes. No migration and no Angular code.
