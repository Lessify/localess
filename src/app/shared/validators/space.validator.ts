import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { PreviewUrlContext, resolvePreviewUrl, unknownPreviewUrlPlaceholders } from '@core/utils/preview-url';

import { CommonValidator } from './common.validator';

/**
 * Whether `url` may be loaded as a visual-editor preview iframe.
 *
 * The preview iframe is trusted with `bypassSecurityTrustResourceUrl`, and the URL comes from the
 * space, which a space manager can also write through the API (the server applies the same scheme
 * check, `zPreviewUrl`, but cannot check the app origin). So only an absolute
 * `http:`/`https:` URL on another origin is accepted: a `javascript:` URL would run inside the app,
 * and a same-origin page could lift the iframe sandbox and reach the app's session.
 *
 * @param url - environment URL to check
 * @param appOrigin - origin of the running app; defaults to `window.location.origin`
 */
export function isSafePreviewUrl(url: unknown, appOrigin: string | undefined = globalThis.location?.origin): url is string {
  if (typeof url !== 'string' || url.trim() === '') return false;
  let parsed: URL;
  try {
    // No base URL: relative values throw, which is what rejects them.
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  return !appOrigin || parsed.origin !== appOrigin;
}

function previewUrl(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value == null || value === '') {
    return null; // `required` reports empty values
  }
  const unknown = unknownPreviewUrlPlaceholders(value);
  if (unknown.length > 0) {
    return { previewUrlPlaceholder: unknown.join(', ') };
  }
  // Checked with its placeholders filled in, since `{locale}` may sit in the host.
  return isSafePreviewUrl(resolvePreviewUrl(value, SAMPLE_PREVIEW_CONTEXT)) ? null : { previewUrl: true };
}

/** A document used to check, and show an example of, an environment URL. */
export const SAMPLE_PREVIEW_CONTEXT: PreviewUrlContext = {
  documentId: 'document-id',
  fullSlug: 'blog/hello',
  slug: 'hello',
  parentSlug: 'blog',
  localeId: 'de',
  fallbackLocaleId: 'en',
};

export class SpaceValidator {
  public static NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(30),
  ];

  public static ENVIRONMENT_NAME: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpaceAround,
    Validators.minLength(3),
    Validators.maxLength(30),
  ];
  public static ENVIRONMENT_URL: ValidatorFn[] = [
    Validators.required,
    CommonValidator.noSpace,
    Validators.minLength(3),
    Validators.maxLength(250),
    previewUrl,
  ];
}
