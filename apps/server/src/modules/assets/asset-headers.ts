/**
 * Raster image types a browser renders as a plain picture. None of them can carry script, so they
 * are safe to show inline. SVG is deliberately absent: it is a document format that runs script.
 */
const INLINE_IMAGE_TYPES = new Set([
  'image/apng',
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/vnd.microsoft.icon',
  'image/webp',
  'image/x-icon',
]);

const SVG_TYPE = 'image/svg+xml';
const PDF_TYPE = 'application/pdf';
const FALLBACK_TYPE = 'application/octet-stream';

/**
 * Applied to every asset response rendered as a document (opened directly rather than embedded
 * via `<img>`/`<video>`, where browsers ignore it). `sandbox` gives the document an opaque origin
 * with scripts disabled, so even a scripted SVG cannot reach the app's storage on this origin.
 * `img-src`/`media-src` keep the browser's own image and media viewers working.
 */
export const ASSET_CSP = "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox";

export interface AssetResponsePolicy {
  /** Value for the `Content-Type` header. */
  contentType: string;
  /** Whether the response must be `Content-Disposition: attachment` instead of `inline`. */
  attachment: boolean;
  /** Security headers to set on the response. */
  headers: Record<string, string>;
}

/**
 * Decides how an asset may be delivered, given its stored MIME type.
 *
 * Assets are served from the same origin as the admin app (`/api/v1/**` is a Hosting rewrite) and
 * their type comes from the uploader, so a type that renders as an active document — HTML, XML,
 * JavaScript, anything unknown — would run on the app origin when the URL is opened. Only types
 * that cannot script (raster images, video, audio) or run in their own viewer sandbox (PDF) are
 * served inline; SVG is inline but under the sandboxing CSP; everything else is an attachment.
 *
 * @param {string | undefined} type MIME type of the bytes being sent
 * @param {boolean} forceAttachment true for the explicit download route
 * @return {AssetResponsePolicy} content type, disposition and headers to apply
 */
export function assetResponsePolicy(type: string | undefined, forceAttachment: boolean): AssetResponsePolicy {
  const contentType = type && type.trim() ? type.trim() : FALLBACK_TYPE;
  const essence = contentType.split(';')[0].trim().toLowerCase();

  const isPdf = essence === PDF_TYPE;
  const inlineSafe =
    INLINE_IMAGE_TYPES.has(essence) || essence === SVG_TYPE || essence.startsWith('video/') || essence.startsWith('audio/') || isPdf;

  const headers: Record<string, string> = { 'X-Content-Type-Options': 'nosniff' };
  // Chrome refuses to open a PDF in its viewer under a `sandbox` CSP; PDF script runs inside the
  // viewer's own sandbox rather than on this origin, so PDF is the one type left without it.
  if (!isPdf) {
    headers['Content-Security-Policy'] = ASSET_CSP;
  }

  return { contentType, attachment: forceAttachment || !inlineSafe, headers };
}
