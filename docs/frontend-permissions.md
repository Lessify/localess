# User Roles & Permissions

> Related: [Frontend Architecture](frontend-architecture.md) · [Frontend State](frontend-state.md) · [Auth Tokens](auth-tokens.md)

## Two Permission Systems

Localess has **two separate permission systems** that should not be confused:

| System | Used by | Stored in | Enforced by |
|--------|---------|-----------|-------------|
| **User permissions** | CMS users (editors, admins) | Firebase custom claims | Route guards + UI |
| **API token permissions** | Programmatic API consumers | Firestore `tokens` collection | CDN middleware |

This document covers **user permissions**. See [Auth Tokens](auth-tokens.md) for API token permissions.

---

## User Roles

Two roles exist, set via Firebase custom claim `role`:

| Role | Access |
|------|--------|
| `admin` | Full access to everything — bypasses all permission checks |
| `custom` | Granular access — only what's listed in the `permissions` claim |

A `lock: true` claim disables a user from logging in (checked by `UserStore.isLocked`).

---

## User Permissions (granular, `custom` role only)

```typescript
enum UserPermission {
  // Administration
  USER_MANAGEMENT        // Manage users (invite, edit, delete)
  SPACE_MANAGEMENT       // Create/edit/delete spaces and their settings
  SETTINGS_MANAGEMENT    // Edit global app settings

  // Translations
  TRANSLATION_READ       // View translations
  TRANSLATION_CREATE     // Add new translation keys
  TRANSLATION_UPDATE     // Edit translation values
  TRANSLATION_DELETE     // Delete translation keys
  TRANSLATION_PUBLISH    // Publish translations to CDN
  TRANSLATION_EXPORT     // Export translations as file
  TRANSLATION_IMPORT     // Import translations from file

  // Schemas
  SCHEMA_READ            // View schemas
  SCHEMA_CREATE          // Create schema types/fields
  SCHEMA_UPDATE          // Edit schema types/fields
  SCHEMA_DELETE          // Delete schemas
  SCHEMA_EXPORT          // Export schema definitions
  SCHEMA_IMPORT          // Import schema definitions

  // Content
  CONTENT_READ           // View content documents
  CONTENT_CREATE         // Create content documents
  CONTENT_UPDATE         // Edit content documents
  CONTENT_DELETE         // Delete content documents
  CONTENT_PUBLISH        // Publish content to CDN
  CONTENT_EXPORT         // Export content
  CONTENT_IMPORT         // Import content

  // Assets
  ASSET_READ             // View assets
  ASSET_CREATE           // Upload assets
  ASSET_UPDATE           // Edit asset metadata
  ASSET_DELETE           // Delete assets
  ASSET_EXPORT           // Export assets
  ASSET_IMPORT           // Import assets

  // Dev
  DEV_OPEN_API           // Access the Open API / dev tools section
}
```

---

## How Guards Work

Route-level guards use AngularFire's `AuthGuard` + custom `authGuardPipe` functions defined in `features-routing.module.ts`:

```typescript
{
  path: 'spaces/:spaceId/translations',
  canActivate: [AuthGuard],
  data: {
    authGuardPipe: hasPermissionTranslationRead  // reads Firebase customClaims
  }
}
```

Each pipe reads `customClaims` from the Firebase ID token:
```typescript
// admin → always true
// custom → check permissions array includes the required permission
claims['role'] === 'admin' || claims['permissions']?.includes(UserPermission.TRANSLATION_READ)
```

---

## How UI Conditionally Renders

In components, use `UserStore` signals to show/hide UI elements:

```typescript
readonly userStore = inject(UserStore);

// Check role
this.userStore.isRoleAdmin()          // boolean signal

// Check specific permission
this.userStore.permissions()?.includes(UserPermission.CONTENT_PUBLISH)
```

---

## Claims Lifecycle

1. Admin invites a user → Firebase Auth account created with initial `role` + `permissions` via Admin SDK
2. User logs in → ID token issued with claims baked in
3. Admin changes user's role/permissions → claims updated via Admin SDK
4. **Claims only refresh on next ID token refresh** (every ~1 hour, or on next sign-in)
5. `UserStore` reads claims from `getIdTokenResult()` on every app init

---

## Implementation Files

- `src/app/shared/models/user.model.ts` — `User`, `UserRole`, `UserPermission` types
- `src/app/shared/stores/user.store.ts` — reads claims, exposes `isRoleAdmin`, `isLocked`
- `src/app/features/features-routing.module.ts` — all route guards with permission pipes
- `src/app/app-routing.ts` — root `authGuard` (authentication only, not authorization)
- `src/app/shared/services/user.service.ts` — Firestore user CRUD (admin operations)
