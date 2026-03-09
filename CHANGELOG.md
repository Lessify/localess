# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] – Unreleased (develop)

This is a major release introducing significant architectural changes, new features, and a complete UI redesign. Upgrading from **2.x** requires reviewing the breaking changes listed below.

---

### 🚀 New Features

#### Webhook System
A fully integrated webhook system has been introduced, enabling real-time event notifications to external services whenever content changes occur within a space.

- **Webhook Management UI** – Create, update, enable/disable, and delete webhooks directly from the Space Settings panel.
- **Supported Events** – Webhooks can be subscribed to the following content lifecycle events:
  - `content.published` – fired when a content document is published.
  - `content.unpublished` – fired when a content document is unpublished.
  - `content.deleted` – fired when a content document is deleted.
  - `content.updated` – fired when a content document is updated.
- **Configurable Headers & HMAC Signature** – Each webhook supports custom HTTP headers and an optional secret for payload signature verification, allowing consumers to authenticate incoming payloads.
- **Webhook Delivery Logs** – Every webhook delivery is recorded with the HTTP status code, response time, and any error message, providing full observability into delivery history.
- **Firestore Security Rules** – New security rules have been added for the `/webhooks` and `/webhooks/{id}/logs` collections, scoped to admin and `SPACE_MANAGEMENT` permission holders.

#### Token Permissions (V2 Tokens)
The token system has been redesigned to support granular, role-based access control.

- **Token V2** – A new token version (`version: 2`) introduces an explicit `permissions` array, replacing the previous all-or-nothing token model.
- **Permission Scopes** – Five distinct permissions are now available:
  - `TRANSLATION_PUBLIC` – Access to published translations.
  - `TRANSLATION_DRAFT` – Access to draft translations.
  - `CONTENT_PUBLIC` – Access to published content.
  - `CONTENT_DRAFT` – Access to draft/preview content.
  - `DEV_TOOLS` – Access to developer tooling endpoints (space metadata, OpenAPI schema, translation management).
- **Backward Compatibility** – Existing V1 tokens (without a `version` field) are automatically treated as having `TRANSLATION_PUBLIC`, `TRANSLATION_DRAFT`, `CONTENT_PUBLIC`, and `CONTENT_DRAFT` permissions, ensuring zero downtime for existing integrations.
- **Token Management UI** – The token creation and editing form has been updated to display and configure permissions through a checkbox list with human-readable labels.

#### Translation Draft Version
Translations now support a distinct draft version, enabling a safer publication workflow.

- **Draft Storage Path** – Draft translations are stored at `spaces/{spaceId}/translations/draft/{locale}.json`, separate from the published path, ensuring published content is never inadvertently overwritten during editing.
- **Draft API Access** – The V1 CDN API supports a `version` query parameter; when set to `draft`, the `TRANSLATION_DRAFT` token permission is required.
- **Version-Aware Cache Paths** – The translation service now resolves locale-specific cache paths dynamically based on the requested version, consolidating cache management logic.

#### AI-Powered Locale Translation
New locale translation capabilities allow entire locale sets to be translated automatically using AI or Google Cloud Translation.

- **Locale Translate** – A new background Cloud Function (`translateLocale`) translates all translations in a source locale to a target locale for a given space, leveraging Google Cloud Translation API.
- **Content Locale Translate** – A corresponding function (`translateContentLocale`) translates the locale-specific content of a single content document from a source locale to a target locale.
- **AI Translation for Markdown Fields** – Markdown-type schema fields are now eligible for AI translation, extending auto-translate coverage beyond plain text strings.
- **Translate Locale Dialog** – A new shared dialog component (`TranslateLocaleDialogComponent`) guides users through selecting source and target locales, with validation and descriptive help text.
- **Performance Improvement** – The locale translation pipeline has been optimized to reduce redundant Firestore reads, significantly improving throughput for large translation sets.

#### Translation Filter & Status
The Translations view has been enhanced with a rich filtering system.

- **Filter by Translation Status** – Translations can now be filtered by status: `Translated`, `Partially Translated`, and `Untranslated`.
- **Filter by Locale Status** – An additional `Locale Translated` / `Locale Untranslated` filter allows viewing per-locale completion state.
- **Filter Reset** – A one-click reset action clears all active filters, restoring the full translation list instantly.
- **Unified Status Enums** – `TranslationStatus` and `LocaleStatus` enum values have been updated with explicit prefixes (`TRANSLATION_*`, `LOCALE_*`) to avoid naming collisions and improve clarity in serialized data.

#### Content Unpublish
- **Unpublish Action** – Content documents can now be explicitly unpublished through the Content Action Menu, transitioning them from a published state back to draft. This triggers the `content.unpublished` webhook event.

#### Content Action Menu Enhancements
- **Copy Slug** – A new menu action copies the relative slug of a content document to the clipboard.
- **Copy Full Slug** – A new menu action copies the full hierarchical slug (including all ancestor path segments) to the clipboard, simplifying integration with external systems.

#### Space Danger Zone
- **Delete All Translations** – A new destructive action has been added to the Space Settings Danger Zone panel, allowing administrators to permanently delete all translations within a space. The operation requires explicit confirmation to prevent accidental data loss.

#### UI Version Check & Auto-Reload
- **Version Polling** – The application now periodically checks `/assets/version.json` to detect whether a new deployment has been released.
- **Reload Prompt** – When a new version is detected, a non-intrusive notification is shown, prompting the user to reload the application to pick up the latest changes.
- **Version Generation** – A new `version:generate` npm script generates `src/assets/version.json` at build time, embedding the Git commit SHA for precise version tracking.

#### Developer Tools V1 API (DEV_TOOLS Endpoints)
Two new developer-facing endpoints have been added to the V1 API, secured behind the `DEV_TOOLS` token permission.

- **`GET /api/v1/spaces/:spaceId`** – Returns space metadata including name, available locales, and fallback locale configuration.
- **`GET /api/v1/spaces/:spaceId/open-api`** – Returns a dynamically generated OpenAPI 3.x specification for the content schemas defined in the space, enabling type-safe SDK generation.

---

### 🔄 Changes

#### Angular Upgrade to v21
The entire application has been upgraded to **Angular v21**, including all first-party packages (`@angular/core`, `@angular/forms`, `@angular/material`, `@angular/fire`, `@angular/cdk`, `@angular/router`). The upgrade brings improved performance, enhanced signal support, and updated compilation pipeline.

#### Complete UI Redesign with Spartan/Helm Component Library
The application UI has been comprehensively redesigned using the [Spartan](https://www.spartan.ng/) headless component library (`@spartan-ng/brain`) combined with **Tailwind CSS**, replacing the previous Angular Material-only approach for layout and structural components.

- **42 new Helm UI components** have been added to the `libs/ui/` workspace, covering: accordion, avatar, badge, breadcrumb, button group, card, checkbox, combobox, command palette, dialog, dropdown menu, form field, icon, input, kbd, label, popover, progress, radio group, resizable panels, scroll area, select, separator, sheet, sidebar, skeleton, sonner (toast), spinner, switch, tabs, textarea, toggle, toggle group, tooltip, and typography.
- **Sidebar** – A new structured sidebar component has replaced the previous navigation approach, improving overall layout consistency and responsiveness.
- **Breadcrumb Component** – The custom breadcrumb components have been refactored to use the new Helm breadcrumb library, replacing the previous standalone implementation.
- **Logo Component** – A dedicated `LogoComponent` has been extracted as a standalone shared component (`src/app/shared/components/logo/`), providing a reusable SVG logo asset across the application.
- **Toast Notifications** – Replaced with `ngx-sonner` for a more modern and accessible notification experience.
- **PostCSS & Tailwind Configuration** – Updated PostCSS configuration to support the Tailwind CSS v4 integration used by the Spartan components.

#### V1 API Modular Refactoring
The monolithic `v1.ts` Cloud Function (~445 lines) has been decomposed into three focused Express routers:

- **`v1/cdn.ts` (`CDN`)** – Handles public-facing content and translation delivery: `GET /translations/:locale`, `GET /contents/:contentId`, `GET /contents/slugs/*`, `GET /links`, `GET /assets/:assetId`.
- **`v1/manage.ts` (`MANAGE`)** – Handles programmatic translation management: `POST /translations/:locale` (add-missing, update-existing, delete-missing operations).
- **`v1/dev-tools.ts` (`DEV_TOOLS`)** – Handles developer-facing metadata: `GET /spaces/:spaceId`, `GET /spaces/:spaceId/open-api`.
- **Middleware Layer** – Introduced two middleware modules:
  - `api-key-auth.middleware.ts` – Validates tokens supplied via the `Authorization` header (Bearer scheme).
  - `query-auth.middleware.ts` – Validates tokens supplied via the `?token` query parameter.
  - Both middleware implementations resolve the `TokenV1`/`TokenV2` union, check the relevant permissions, and attach the decoded token to `req.token` for downstream handlers.

#### Translation Management API Enhancements
The `POST /api/v1/spaces/:spaceId/translations/:locale` endpoint now supports three operation types:

- **`add-missing`** – Inserts only translations that do not yet exist in the target locale, leaving existing entries untouched.
- **`update-existing`** – Updates only translations that already exist, never creating new entries.
- **`delete-missing`** – Removes translations from the target locale that are not present in the provided payload, useful for keeping locales in sync with a source of truth.
- **Dry Run Mode** – All three operation types support a `dryRun: true` flag, which simulates the operation and returns the list of affected translation IDs without committing any writes to Firestore.

#### Content Model Enhancements
- **`links` field** – The `ContentDocument` model now includes a `links` string array, tracking explicit link references within a document alongside the existing `references` and `assets` fields.
- **`ContentDocumentApi` type** – The content storage model has been split into `ContentDocumentStorage` (for Cloud Storage JSON serialization) and `ContentDocumentApi` (for V1 API responses). The API type includes resolved `references` as a map of `ContentDocumentApi` objects, enabling deep-linked content resolution in a single API call.
- **Reference Resolution** – The V1 CDN content endpoint now resolves `references` to full content objects and includes them inline in the API response.
- **Link Resolution** – The V1 CDN API populates `links` as a resolved map, enabling consumers to resolve internal links without additional API calls.
- **Content Name & Slug Length** – The maximum allowed length for content document names and slugs has been increased from **50** to **250** characters, accommodating deeper content hierarchies and more descriptive naming conventions.

#### Schema Model Changes
- **`SchemaFieldAsset` / `SchemaFieldAssets`** – Both asset field types now support a single `fileType` filter in addition to the existing multi-type `fileTypes` array, simplifying schema definitions for fields that accept only one file type category.
- **`SchemaFieldOption` / `SchemaFieldOptions`** – Removed the deprecated `source: 'self'` option and the associated inline `SchemaFieldOptionSelectable` model. Option fields must now reference an external schema source, enforcing a cleaner separation between schema definitions and option data.

#### Task Model Refactoring
The generic `Task` interface has been decomposed into strongly-typed discriminated union members, improving type safety throughout the task processing pipeline:

- `TaskAssetExport` – Asset export with optional `path` and exported `file` reference.
- `TaskAssetImport` – Asset import with required `tmpPath` and `file`.
- `TaskAssetRegenMetadata` – Asset metadata regeneration task (no additional fields).
- `TaskContentExport` – Content tree export with optional `path` and `file`.
- `TaskContentImport` – Content import with required `tmpPath` and `file`.
- `TaskSchemaExport` – Schema export with optional `fromDate` for incremental exports and `file`.
- `TaskSchemaImport` – Schema import with `tmpPath` and `file`.
- `TaskTranslationExport` / `TaskTranslationImport` – Translation import/export tasks aligned with the same pattern.

#### Content Cache Architecture
The content cache has been migrated from a per-content-document model to a **space-level cache**, centralizing invalidation and improving consistency when multiple content documents are published simultaneously.

- **`spaceContentCachePath(spaceId)`** – New utility function returns the canonical path for the space-level content cache file.
- **`spaceTranslationCachePath(spaceId)`** – New utility function returns the canonical path for the translation cache file.
- **`translationLocaleCachePath(spaceId, locale, version)`** – Returns the version-aware path for locale translation JSON files.

#### Cloud Build & Deployment Pipeline
The `cloudbuild.yaml` deployment pipeline has been significantly improved:

- **Automatic API Enablement** – A new build step enables all required Google Cloud APIs (`Cloud Functions`, `Cloud Run`, `Artifact Registry`, `Eventarc`, `Cloud Translation`, etc.) at the start of every deployment, eliminating manual pre-configuration.
- **Automatic Firebase App SDK Config** – The Firebase Web App SDK configuration is now fetched dynamically from Firebase during the build using `firebase apps:sdkconfig`, replacing the previous approach of supplying seven individual Cloud Build substitution variables.
- **Version Generation Step** – `npm run version:generate` is executed during the build to embed the current `COMMIT_SHA` into `assets/version.json`, enabling the UI version check feature.
- **Simplified Environment** – The `build:prod` step no longer requires Firebase-specific substitution variables (`_LOCALESS_FIREBASE_*`), reducing configuration overhead for new deployments.
- **CORS Configuration Removed** – The manual `gsutil cors set` step has been removed; CORS is now managed entirely within Firebase configuration.

#### Dependency Updates
- **Functions**: upgraded to `firebase-admin@13`, `firebase-functions@7`, `zod@4`, `express@5`, `deepl-node@1.24`, `exiftool-vendored@35`, `sharp@0.34`.
- **Frontend**: upgraded to `@angular/*@21`, `@angular/fire@21`, `@ngrx/signals@21`, `@ngrx/store-devtools@21`, `marked@17`, `ngx-markdown@21`, `ngx-scrollbar@18`, `@spartan-ng/brain@0.0.1-alpha.644`.
- **Removed**: `src/assets/material-icons.json` (188 k-line asset) has been removed, along with the associated `material.service.ts` and `material.model.ts`. Icon selection now relies on `@ng-icons` with Lucide and Tabler icon sets.

#### Utilities & Code Quality
- **`security-utils.ts` renamed to `user-auth-utils.ts`** – Reflects a clearer naming convention for the user authentication permission helper.
- **`api-auth-utils.ts`** – New utility module consolidating token validation logic shared between the API key and query auth middleware.
- **`webhook-utils.ts`** – New utility module responsible for constructing webhook payloads, computing HMAC-SHA256 signatures, dispatching HTTP requests to webhook endpoints, and persisting delivery logs to Firestore.
- **`translate-utils.ts`** – New utility for content field traversal used by the locale translation pipeline.
- **`translateWithGoogle()`** – The Google Cloud Translation logic has been extracted into a standalone exported function, making it independently callable from both the on-call translate function and the new locale translation pipeline.
- **Async File Save** – Translation publish now uses `await bucket.file(...).save(...)` instead of a fire-and-forget callback, ensuring publish errors are properly propagated and logged.
- **`DestoryRef` Fix** – Corrected lifecycle hook cleanup using Angular's `DestroyRef` injection token, preventing memory leaks in components that subscribe to observables.

#### Firestore Security Rules
- Added security rules for the new `/webhooks` and `/webhooks/{id}/logs` sub-collections within each space, granting read/write access to admins and `SPACE_MANAGEMENT` permission holders, and restricting log writes to server-side operations only.

---

### 🗑️ Removed

- **`cors.json`** – The standalone CORS configuration file has been removed. CORS for Firebase Storage is now managed within the Firebase project settings.
- **`src/polyfills.ts`** – Removed the legacy polyfills file following the Angular v21 upgrade, which no longer requires it.
- **`src/tailwind.css`** – Replaced by the updated `src/styles.css` which integrates Tailwind CSS v4 directives directly.
- **`src/environments/env.ts`** – The environment variable helper file has been removed; environment configuration is now resolved at build time from the Firebase SDK config JSON file.
- **`src/assets/material-icons.json`** – A large static asset (~188,000 lines) previously used to power the Material icon picker has been removed, substantially reducing the build artifact size.
- **`material.service.ts` / `material.model.ts`** – Removed alongside the Material icon picker, as the icon system has migrated to `@ng-icons`.
- **`animate.directive.ts`** – The custom animation directive has been removed as part of the UI library consolidation.
- **Custom `breadcrumb` components** – The custom `BreadcrumbComponent` and `BreadcrumbItemComponent` have been removed in favor of the new Helm breadcrumb library components.
- **`SchemaFieldOptionSelectable`** – Removed; inline option definitions are no longer supported. Options must now reference an external schema source.
- **`src/test.ts`** / **`karma.conf.js`** (renamed to `karma.conf.cjs`) – Minor test infrastructure cleanup aligned with the ESM module migration.

---

### ⚠️ Breaking Changes

1. **Token V2 Permissions** – New deployments will create tokens without `DEV_TOOLS` permission by default. Integrations relying on developer endpoints (`/api/v1/spaces/:spaceId` and `/api/v1/spaces/:spaceId/open-api`) must use a token explicitly granted the `DEV_TOOLS` permission.

2. **Translation Status Enum Values** – The serialized values of `TranslationStatus` have changed:
   - `TRANSLATED` → `TRANSLATION_TRANSLATED`
   - `PARTIALLY_TRANSLATED` → `TRANSLATION_PARTIALLY_TRANSLATED`
   - `UNTRANSLATED` → `TRANSLATION_UNTRANSLATED`
   Any external code or stored data referencing the old enum values must be migrated.

3. **`SchemaFieldOption` / `SchemaFieldOptions`** – The `source: 'self'` value and the inline `options` array have been removed. Schemas using self-defined option lists must be migrated to reference an external options schema.

4. **Content API Response Shape** – The V1 content response now includes a `references` map (resolved content objects) and a `links` map. Consumers should update their response parsing logic accordingly.

5. **Cloud Build Substitution Variables** – The seven `_LOCALESS_FIREBASE_*` Cloud Build substitution variables are no longer used. Deployments must be updated to remove these variables; the Firebase SDK config is now fetched automatically during the build.

6. **`Task` Interface** – The generic `Task` interface has been replaced by a discriminated union of typed task interfaces. Any code that constructs or reads `Task` objects directly must be updated to use the appropriate typed variant.

---

## [2.5.1] – Previous Release (main)

Baseline release. See repository history for details.
