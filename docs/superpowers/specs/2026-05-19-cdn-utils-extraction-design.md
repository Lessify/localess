# CDN Utils Extraction — Design

## Goal

Move standalone utility definitions out of `functions/src/v1/cdn.ts` into the existing `functions/src/utils/` folder, split by concern.

## New Files

### `functions/src/utils/image-transform.ts`

Exports:
- `VALID_FORMATS` — `['webp', 'jpeg', 'png'] as const`
- `ImageFormat` — type alias for the tuple union
- `isImageFormat(v: unknown): v is ImageFormat` — type predicate
- `applySharpTransforms(pipeline, opts): sharp.Sharp` — Sharp resize/format/quality helper

Depends on: `sharp` (already a functions dependency)

### `functions/src/utils/locale-utils.ts`

Exports:
- `resolveLocaleFilePath(spaceId, locale, fallbackLocale?): string` — returns the Storage path for a locale's translation file, falling back to the fallback locale path if provided

Depends on: nothing (pure string logic)

## Changes to `functions/src/v1/cdn.ts`

- Remove all four definitions above
- Add two import lines:
  ```typescript
  import { ImageFormat, isImageFormat, applySharpTransforms } from '../utils/image-transform';
  import { resolveLocaleFilePath } from '../utils/locale-utils';
  ```
- No logic changes — pure move

## Out of Scope

- No changes to `services/`, `models/`, other utils files
- No changes to route handler logic
- No barrel export update to `utils/index.ts` (none exists)
