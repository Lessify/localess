import type sharp from 'sharp';

import { isFlagSet } from './query-flag';

export const VALID_FORMATS = ['webp', 'jpeg', 'png', 'avif'] as const;
export type ImageFormat = (typeof VALID_FORMATS)[number];

/**
 * Check if a value is a supported image format.
 * @param {unknown} v Value to check
 * @return {boolean} true if the value is one of VALID_FORMATS
 */
export function isImageFormat(v: unknown): v is ImageFormat {
  return VALID_FORMATS.includes(v as ImageFormat);
}

/** Stored MIME types that map onto an encoder target, for passthrough detection. */
const SOURCE_MIME_TO_FORMAT: Record<string, ImageFormat> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/avif': 'avif',
};

/**
 * Formats whose encoder is lossless, so re-encoding to the same format only burns CPU.
 *
 * The lossy formats are deliberately excluded. `?f=jpeg` on a JPEG is an explicit request to
 * re-encode, and honouring it is a meaningful size reduction; collapsing it to a passthrough
 * would answer a compression request with the full uncompressed original. A lossless encoder
 * has no such trade to make, so there the collapse is free. Callers who want the stored bytes
 * untouched use the `/original` route.
 */
const LOSSLESS_FORMATS: ReadonlySet<ImageFormat> = new Set<ImageFormat>(['png']);

export const VALID_FITS = ['cover', 'contain', 'inside', 'outside', 'fill'] as const;
export type ImageFit = (typeof VALID_FITS)[number];

/**
 * Check if a value is a supported image fit mode.
 * @param {unknown} v Value to check
 * @return {boolean} true if the value is one of VALID_FITS
 */
export function isImageFit(v: unknown): v is ImageFit {
  return VALID_FITS.includes(v as ImageFit);
}

/**
 * Background used to pad a `contain` resize.
 *
 * Transparent only where the output format is known to carry an alpha channel,
 * otherwise opaque white. An undefined format means the source format is kept,
 * which may be JPEG — and sharp flattens a transparent background to **black**
 * there, so white is the safe default rather than the prettier one.
 * @param {ImageFormat} [format] Requested output format
 * @return {object} a sharp background colour
 */
function containBackground(format?: ImageFormat): { r: number; g: number; b: number; alpha: number } {
  const supportsAlpha = format === 'png' || format === 'webp' || format === 'avif';
  return { r: 255, g: 255, b: 255, alpha: supportsAlpha ? 0 : 1 };
}

/**
 * Apply resize and format/quality transforms to a sharp pipeline.
 * @param {sharp.Sharp} pipeline Sharp pipeline to transform
 * @param {object} opts Transform options
 * @param {number} [opts.width] Target width in pixels
 * @param {number} [opts.height] Target height in pixels
 * @param {number} [opts.quality] Output quality. Omitted means "let the encoder decide" —
 *   see {@link applySharpTransforms} for why that is not the same as passing 80.
 * @param {ImageFormat} [opts.format] Output format
 * @param {ImageFit} [opts.fit] How the image is fitted when BOTH width and height
 *   are given. Ignored otherwise, since sharp preserves aspect ratio with one
 *   dimension and a fit mode would have no effect.
 * @return {sharp.Sharp} the transformed pipeline
 */
export function applySharpTransforms(
  pipeline: sharp.Sharp,
  opts: {
    width?: number;
    height?: number;
    quality?: number;
    format?: ImageFormat;
    fit?: ImageFit;
  }
): sharp.Sharp {
  if (opts.width || opts.height) {
    // `fit` only means something when both dimensions box the output.
    const boxed = Boolean(opts.width && opts.height);
    // Enlargement is deliberately allowed. A caller asking for a width above the source is
    // taken at their word: silently returning the source size instead would mean two URLs
    // resolving to identical bytes, which is the cache fragmentation this endpoint avoids.
    // The upper bound is enforced as a `400` in `parseAssetTransformQuery`, not here.
    const resizeOptions: sharp.ResizeOptions = {};
    if (boxed && opts.fit) {
      resizeOptions.fit = opts.fit;
      if (opts.fit === 'contain') resizeOptions.background = containBackground(opts.format);
    }
    pipeline = pipeline.resize(opts.width ?? null, opts.height ?? null, resizeOptions);
  }
  // An absent `quality` is passed on as absence, not as a number of our choosing, because a
  // quality value is **not portable between codecs**. sharp defaults JPEG and WebP to 80 but
  // AVIF to 50, since AVIF is quantizer-based and sits on a different perceptual curve — the
  // two scales are not the same scale. Forcing 80 onto AVIF produced files several times
  // larger than sharp's default and bigger than the equivalent WebP, which made `?f=avif`
  // the worst format to ask for rather than the best. Per-encoder calibration is the
  // encoder author's job; an explicit `?q=` is the caller's and always wins.
  const quality = opts.quality;
  const q = quality === undefined ? {} : { quality };

  // Carry the source colour profile through when there is one. sharp drops it otherwise, and an
  // untagged wide-gamut image is interpreted as sRGB by the renderer, which shifts its colours.
  //
  // `keepIccProfile()` rather than `withIccProfile('srgb')` deliberately. Converting would tag
  // *every* response, including the overwhelming majority that never carried a profile, at a
  // measured **+506 bytes each** — on a 5 KB thumbnail that is a 10% tax to declare a colour
  // space the renderer already assumes. Keeping costs zero bytes for untagged sources and is
  // strictly less lossy for tagged ones.
  pipeline = pipeline.keepIccProfile();

  if (opts.format === 'jpeg') {
    // mozjpeg's encoder settings — trellis quantisation, overshoot deringing, optimised scans —
    // produce a measurably smaller file at the *same* quality value, so this costs no fidelity.
    // It is not sharp's default because it is slower: roughly 5x the encode time on a 1200x900
    // source, ~19ms to ~108ms. That trade is worth taking here because encoding happens once per
    // URL per cache miss under a 365-day TTL, while the saved bytes are paid for on every hit —
    // and since a bare request re-encodes, this applies to essentially all JPEG traffic.
    pipeline = pipeline.jpeg({ ...q, mozjpeg: true });
  } else if (opts.format === 'webp') {
    pipeline = pipeline.webp(q);
  } else if (opts.format === 'png') {
    // PNG's `quality` only does anything alongside `palette`, which quantises to an 8-bit palette
    // — lossy, and visibly banding on a photograph stored as PNG. So it is opt-in via an explicit
    // `?q=`: a bare `?f=png` stays lossless, `?f=png&q=60` quantises. Measured at roughly a third
    // of the lossless size on screenshot-like content, which is what PNG usually carries here.
    pipeline = quality === undefined ? pipeline.png() : pipeline.png({ palette: true, quality });
  } else if (opts.format === 'avif') {
    pipeline = pipeline.avif(q);
  }
  return pipeline;
}

/**
 * Largest decoded animation this endpoint will resize, in pixels across every frame.
 *
 * Resizing an animation decodes **all** frames at once, so the memory cost is
 * `width * pageHeight * pages`, not the single-frame cost {@link MAX_OUTPUT_DIMENSION} bounds.
 * `functions/src/v1.ts` runs the API at `memory: '1GiB'` with `concurrency: 20`, so one request
 * that decodes 400 MB does not merely fail itself — it takes the container down for the other
 * nineteen tenants.
 *
 * 12 megapixels is roughly 48 MB of RGBA, and sharp needs working space on top of that. It clears
 * the common cases comfortably — a 480x270 clip stays under the cap until about 90 frames — while
 * refusing the 1000x1000x100 uploads that would exhaust the instance. **Tune this against real
 * assets**; it is a conservative starting point, not a measured optimum.
 */
export const MAX_ANIMATED_PIXELS = 12_000_000;

/**
 * Total pixels sharp has to hold to resize an animation — every frame at once.
 *
 * Shared by the two places that enforce {@link MAX_ANIMATED_PIXELS}: the cheap check against
 * stored metadata, which runs *before* the file is downloaded, and the authoritative one against
 * the decoded header afterwards. Keeping the arithmetic in one place is what stops the two
 * drifting into disagreeing about which animations are allowed.
 * @param {number} [width] Frame width
 * @param {number} [frameHeight] Height of a single frame, not the whole strip
 * @param {number} [pages] Frame count
 * @return {number} pixels across every frame, or 0 when any input is unknown
 */
export function decodedAnimationPixels(width?: number, frameHeight?: number, pages?: number): number {
  return (width ?? 0) * (frameHeight ?? 0) * (pages ?? 0);
}

/**
 * Whether sharp's reported page count means a genuine animation.
 *
 * Not `pages !== undefined`, which is what this used to be and is wrong: a **static GIF reports
 * `pages: 1`**, so every still GIF was treated as animated and passed through untransformed —
 * `?w=400` on one silently did nothing. Only a static WebP reports `undefined`.
 * @param {number} [pages] `pages` from sharp metadata
 * @return {boolean} true when the image has more than one frame
 */
export function isAnimatedPages(pages?: number): boolean {
  return (pages ?? 1) > 1;
}

/**
 * The encoder that reproduces a stored MIME type, for a resize that must not change format.
 *
 * Used by the route when `?f=` is absent but a width or height put the request on the transform
 * path anyway: the bytes have to be re-encoded, and they should come back out as what went in.
 * Returns `undefined` for types with no encoder equivalent here — GIF, SVG, TIFF, video — which
 * leaves sharp to infer the output format from the input, as before.
 * @param {string} sourceType Stored asset MIME type
 * @return {ImageFormat | undefined} the encoder to target, or undefined to let sharp infer
 */
export function sourceEncoderFormat(sourceType: string): ImageFormat | undefined {
  return SOURCE_MIME_TO_FORMAT[sourceType];
}

/** Resolved, validated transform parameters for an asset request. */
export interface AssetTransformQuery {
  width?: number;
  height?: number;
  /**
   * Output quality, or `undefined` when the caller did not ask for one.
   *
   * Deliberately not defaulted here. The endpoint imposes no quality of its own — each encoder
   * has its own calibrated default and they are not the same number. See
   * {@link applySharpTransforms}.
   */
  quality?: number;
  format?: ImageFormat;
  fit?: ImageFit;
  thumbnail: boolean;
}

/** Why a request was rejected, ready to be rendered as a `400`. */
export interface AssetTransformQueryError {
  /** The offending query parameter. */
  param: string;
  /** The value that was rejected. */
  value: string;
  message: string;
}

export type AssetTransformQueryResult = { ok: true; query: AssetTransformQuery } | { ok: false; error: AssetTransformQueryError };

/**
 * Hard ceiling on any transformed output edge, in pixels.
 *
 * A request above this is **rejected with `400`**, never clamped. Clamping would map every
 * oversized width onto the same output — `w=9000` and `w=50000` returning identical bytes
 * under two cache keys — which is the fragmentation this endpoint exists to avoid. Rejecting
 * keeps one URL to one output.
 *
 * The ceiling exists for memory, not for bandwidth: sharp holds the full decoded bitmap, so
 * an 8192px edge is roughly 200MB of raw pixels. Raising it further needs the instance
 * `memory`/`concurrency` in `functions/src/v1.ts` revisited with it.
 *
 * Kept here rather than in `config.ts` deliberately: `config.ts` calls `initializeApp()`
 * at module scope, and importing it would drag Firebase Admin initialisation into this
 * module's unit tests. This file must stay side-effect free.
 */
export const MAX_OUTPUT_DIMENSION = 8192;

/**
 * Resolves the encoder target for a request, or `undefined` to serve the stored bytes.
 *
 * `undefined` is what keeps a request *off* the transform path entirely: the route only
 * enters sharp when a width, a height or a format is present. So returning `undefined`
 * here is the passthrough decision, and returning a format is what pulls a request onto
 * the transform path.
 *
 * **Nothing is converted implicitly.** `?f=` is the only thing that changes an image's
 * format — a request that does not ask for one gets the format it uploaded. An earlier
 * revision defaulted `image/jpeg` to WebP; that was removed because a format change is the
 * developer's call, and because it put every bare `<img src>` through a decode and re-encode
 * on each CDN miss to produce bytes nobody had asked for. Passing `?f=webp` or `?f=avif`
 * remains the recommended way to cut transfer size — it is now opt-in.
 *
 * A caller who wants the stored bytes with no re-encode at all uses the `/original` or
 * `/download` route, which never reaches this function.
 * @param {object} params Resolution inputs
 * @param {ImageFormat} [params.requested] Explicit `?f=`
 * @param {string} params.sourceType Stored asset MIME type
 * @param {number} [params.quality] Explicit `?q=`, where the caller supplied one
 * @param {boolean} params.resizing Whether a width or height survived clamping
 * @return {ImageFormat | undefined} the format to encode to, or undefined to serve the stored bytes
 */
export function resolveOutputFormat(params: {
  requested?: ImageFormat;
  sourceType: string;
  quality?: number;
  resizing: boolean;
}): ImageFormat | undefined {
  const { requested, sourceType, quality, resizing } = params;

  if (requested === undefined) return undefined;

  // Asking for a *lossless* format the source already is, with nothing else to change,
  // is a genuine no-op: the encoder would spend CPU to produce equivalent bytes. Serve
  // the stored file instead. An explicit `q` or a resize means the caller does want a
  // re-encode, so those opt back in. Lossy formats never collapse — see LOSSLESS_FORMATS.
  if (!resizing && quality === undefined && LOSSLESS_FORMATS.has(requested) && SOURCE_MIME_TO_FORMAT[sourceType] === requested) {
    return undefined;
  }
  return requested;
}

/** Intrinsic dimensions of the stored original, where known. */
export interface SourceDimensions {
  width?: number;
  height?: number;
}

/**
 * Reduces a requested render size to the largest one the source can actually produce.
 *
 * The route does not serve this size directly — it **redirects** to it. Serving it under the
 * original URL is what the earlier clamp did, and it meant `?w=5000` and `?w=99999` returned
 * identical bytes under two cache keys, so the CDN stored both and sharp ran twice. A redirect
 * collapses every oversized spelling onto one canonical URL instead, which is the same trick
 * the `cv` parameter uses for content.
 *
 * With both dimensions given the *box* is shrunk proportionally rather than each axis being
 * capped independently. Capping per axis changes the box's aspect ratio, and `fit` is defined
 * against that ratio: a 5000x5000 request against a 400x300 source is a square box that crops,
 * but per-axis capping would turn it into 400x300 — a 4:3 box that no longer crops at all.
 *
 * Idempotent by construction, so the redirect cannot loop: the result always fits the source,
 * and a request that fits is returned untouched.
 * @param {object} requested Requested width/height, already parsed and validated
 * @param {SourceDimensions} source Intrinsic dimensions of the original, where known
 * @return {object} the canonical width/height for this source
 */
export function canonicalTransformSize(
  requested: { width?: number; height?: number },
  source: SourceDimensions
): { width?: number; height?: number } {
  const { width, height } = requested;
  if (width === undefined && height === undefined) return requested;

  // The largest factor that brings every requested axis inside the source. An axis whose
  // source dimension is unknown cannot constrain anything, so it is skipped rather than
  // guessed — older assets without metadata keep their previous behaviour.
  let scale = 1;
  if (width !== undefined && source.width !== undefined) scale = Math.min(scale, source.width / width);
  if (height !== undefined && source.height !== undefined) scale = Math.min(scale, source.height / height);
  if (scale >= 1) return requested;

  return {
    width: width === undefined ? undefined : Math.max(1, Math.round(width * scale)),
    height: height === undefined ? undefined : Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Parses and validates the transform query of an asset request.
 *
 * Kept out of the route handler so it is a pure function of the query object —
 * the route then only has to branch on `ok`. That also makes every parsing and
 * validation rule unit-testable without route-level test infrastructure.
 *
 * `q` is bounded to 1–100 and left **undefined** when absent, so each encoder applies its
 * own calibrated default rather than one this endpoint invents. The two enum params are
 * strict — an unrecognised
 * value is rejected so a typo surfaces instead of silently returning an
 * untransformed image. An empty value (`?f=`) counts as absent, not invalid.
 * @param {Record<string, unknown>} query Express request query
 * @return {AssetTransformQueryResult} the parsed query, or the rejection reason
 */
export function parseAssetTransformQuery(query: Record<string, unknown>): AssetTransformQueryResult {
  /**
   * Parsed numeric parameter: absent, a value, or a rejection.
   *
   * Three outcomes rather than two, because "the caller omitted it" and "the caller sent
   * something meaningless" must not collapse into the same `undefined`.
   */
  type NumericResult = { ok: true; value?: number } | { ok: false; error: AssetTransformQueryError };

  /**
   * Parses a numeric parameter and bounds it, rejecting anything outside the accepted range.
   *
   * Out-of-range values are rejected rather than clamped. Clamping silently serves something
   * other than what was asked for, which is the same leniency that let a malformed `w` pass
   * unnoticed — and `q=150` is far more often a caller bug than a request for maximum
   * quality. `@localess/client` applies the identical rule before a URL is even built.
   * @param {string} param Query parameter name
   * @param {unknown} raw Raw query value
   * @param {number} min Smallest accepted value
   * @param {number} [max] Largest accepted value, where the parameter has an upper bound
   * @return {NumericResult} absent, a value, or a rejection
   */
  const parseNumeric = (param: string, raw: unknown, min: number, max?: number): NumericResult => {
    const value = (raw as string | undefined)?.toString() ?? '';
    // An empty value counts as absent, not invalid — matching `f` and `fit`, so the parser
    // has one rule for "omitted" rather than one per parameter.
    if (value === '') return { ok: true };
    // Only a canonical decimal integer is accepted, and this is a *caching* rule more than a
    // parsing one. Every spelling that resolves to the same number is a distinct CDN cache key
    // producing byte-identical output: `q=50`, `q=50.1` and `q=50.5` all encode at 50, and
    // `w=400`, `w=0400`, `w=4e2` all resize to 400. Accepting the aliases multiplies edge
    // entries and re-runs sharp for each, which is the fragmentation this endpoint exists to
    // avoid. One value, one URL.
    if (!/^-?(?:0|[1-9]\d*)$/.test(value)) {
      return { ok: false, error: { param, value, message: `Unsupported '${param}' value '${value}'. Expected a whole number.` } };
    }
    const parsed = parseInt(value, 10);
    if (parsed < min || (max !== undefined && parsed > max)) {
      const range = max !== undefined ? `between ${min} and ${max}` : `greater than or equal to ${min}`;
      return { ok: false, error: { param, value, message: `Unsupported '${param}' value '${value}'. Expected a number ${range}.` } };
    }
    return { ok: true, value: parsed };
  };

  const widthResult = parseNumeric('w', query.w, 1, MAX_OUTPUT_DIMENSION);
  if (!widthResult.ok) return widthResult;
  const heightResult = parseNumeric('h', query.h, 1, MAX_OUTPUT_DIMENSION);
  if (!heightResult.ok) return heightResult;
  const qualityResult = parseNumeric('q', query.q, 1, 100);
  if (!qualityResult.ok) return qualityResult;

  const formatRaw = (query.f as string | undefined)?.toString() || undefined;
  if (formatRaw === 'original') {
    // Removed in v4. The message names the route rather than only listing the accepted set,
    // because a caller reaching this has a working use case, not a typo. Omitting `f` is *not*
    // the answer: that keeps the stored format but still re-encodes at the encoder's default
    // quality. Only `/original` returns the uploaded bytes.
    return {
      ok: false,
      error: {
        param: 'f',
        value: formatRaw,
        message:
          `Unsupported 'f' value 'original'. Expected one of: ${VALID_FORMATS.join(', ')}. ` +
          'For the stored bytes, use GET /api/v1/spaces/{spaceId}/assets/{assetId}/original.',
      },
    };
  }
  if (formatRaw !== undefined && !isImageFormat(formatRaw)) {
    return {
      ok: false,
      error: {
        param: 'f',
        value: formatRaw,
        message: `Unsupported 'f' value '${formatRaw}'. Expected one of: ${VALID_FORMATS.join(', ')}.`,
      },
    };
  }

  const fitRaw = (query.fit as string | undefined)?.toString() || undefined;
  if (fitRaw !== undefined && !isImageFit(fitRaw)) {
    return {
      ok: false,
      error: {
        param: 'fit',
        value: fitRaw,
        message: `Unsupported 'fit' value '${fitRaw}'. Expected one of: ${VALID_FITS.join(', ')}.`,
      },
    };
  }

  // `download` was a disposition flag that also forced the source format — two meanings in one
  // parameter. It is now its own route. Rejected in any spelling, including combined with a
  // transform: a resized download no longer exists, so honouring `?download&w=400` by dropping
  // the resize would silently return something other than what was asked for.
  if (query.download !== undefined) {
    return {
      ok: false,
      error: {
        param: 'download',
        value: (query.download as string | undefined)?.toString() ?? '',
        message: "The 'download' parameter was removed in v4. " + 'Use GET /api/v1/spaces/{spaceId}/assets/{assetId}/download instead.',
      },
    };
  }

  return {
    ok: true,
    query: {
      width: widthResult.value,
      height: heightResult.value,
      // No clamping needed — `parseNumeric` already rejected anything outside 1–100. Left
      // undefined when absent rather than defaulted, which is what lets the lossless no-op
      // collapse tell "the caller asked for 80" from "the caller asked for nothing":
      // `?f=png&q=80` on a PNG is a real re-encode request, while a bare `?f=png` is a no-op.
      quality: qualityResult.value,
      format: formatRaw as ImageFormat | undefined,
      fit: fitRaw as ImageFit | undefined,
      thumbnail: isFlagSet(query.thumbnail),
    },
  };
}
