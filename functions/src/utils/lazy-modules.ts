import type archiverFactory from 'archiver';
import type { ExifTool } from 'exiftool-vendored';
import type ffmpegFactory from 'fluent-ffmpeg';
import type sharpFactory from 'sharp';
import type unzipperNs from 'unzipper';

/**
 * Lazy accessors for packages that are expensive to load and rarely needed.
 *
 * Firebase loads the whole of `index.js` on every cold start of *every* function in this
 * codebase, so a top-level `import` here is paid for by all twelve functions regardless of
 * which one is serving the request — the public CDN function was loading a video
 * transcoder, an EXIF binary wrapper and a zip writer it never calls. Loading all of them
 * measured ~350ms of a ~445ms cold start.
 *
 * Each accessor caches the module, so the cost is paid once per instance on first use and
 * never again for the life of that instance. `src/cold-start-imports.test.ts` fails if one
 * of these packages re-enters the eager graph.
 *
 * The `.default` unwrapping is CommonJS interop: these are all CJS packages, so Node puts
 * `module.exports` on the namespace's `default` property when they are dynamically imported.
 */

type SharpFactory = typeof sharpFactory;
type FfmpegFactory = typeof ffmpegFactory;
type ArchiverFactory = typeof archiverFactory;
type UnzipperModule = typeof unzipperNs;

let sharpModule: SharpFactory | undefined;
let ffmpegModule: FfmpegFactory | undefined;
let exiftoolModule: ExifTool | undefined;
let archiverModule: ArchiverFactory | undefined;
let unzipperModule: UnzipperModule | undefined;

/**
 * Image processing pipeline factory.
 * @return {Promise<SharpFactory>} the `sharp` factory
 */
export async function getSharp(): Promise<SharpFactory> {
  sharpModule ??= (await import('sharp')).default;
  return sharpModule;
}

/**
 * Video processing command factory, used for extracting video thumbnails.
 * @return {Promise<FfmpegFactory>} the `fluent-ffmpeg` factory
 */
export async function getFfmpeg(): Promise<FfmpegFactory> {
  ffmpegModule ??= (await import('fluent-ffmpeg')).default;
  return ffmpegModule;
}

/**
 * Shared EXIF reader process pool.
 * @return {Promise<ExifTool>} the `exiftool-vendored` singleton
 */
export async function getExiftool(): Promise<ExifTool> {
  exiftoolModule ??= (await import('exiftool-vendored')).exiftool;
  return exiftoolModule;
}

/**
 * Archive writer factory, used when exporting a space.
 * @return {Promise<ArchiverFactory>} the `archiver` factory
 */
export async function getArchiver(): Promise<ArchiverFactory> {
  archiverModule ??= (await import('archiver')).default;
  return archiverModule;
}

/**
 * Archive reader, used when importing a space.
 * @return {Promise<UnzipperModule>} the `unzipper` namespace
 */
export async function getUnzipper(): Promise<UnzipperModule> {
  unzipperModule ??= (await import('unzipper')).default;
  return unzipperModule;
}
