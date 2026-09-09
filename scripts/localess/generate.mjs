/**
 * Turns a resolved project config into the artifacts a build and a deploy need.
 *
 * All of them are gitignored. The tracked `firebase.json` is never modified: deploy runs
 * against a generated `firebase.<project-id>.json` via the CLI's `--config` flag, so
 * `git status` stays clean however many projects you deploy to.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The Hosting rewrite that fronts the public REST API. See docs/v1-functions-api.md. */
const PUBLIC_API_FUNCTION = 'publicv1';

/**
 * Returns a copy of a firebase.json object with the public API rewrite pointed at
 * `region`. Pure, so the interesting logic is testable without touching disk.
 */
export function withRewriteRegion(config, region) {
  const rewrites = config.hosting?.rewrites;
  if (!Array.isArray(rewrites)) return config;

  return {
    ...config,
    hosting: {
      ...config.hosting,
      rewrites: rewrites.map(rewrite => (rewrite.function === PUBLIC_API_FUNCTION ? { ...rewrite, region } : rewrite)),
    },
  };
}

/**
 * Writes `firebase.<projectId>.json`. At the default region the output is byte-identical
 * to `firebase.json`, which is what makes this change a provable no-op for anyone who has
 * not opted into a different region.
 */
export function writeFirebaseJson(root, projectId, region) {
  const source = readFileSync(join(root, 'firebase.json'), 'utf8');
  const patched = withRewriteRegion(JSON.parse(source), region);
  const path = join(root, `firebase.${projectId}.json`);
  writeFileSync(path, `${JSON.stringify(patched, null, 2)}\n`);
  return path;
}

/**
 * Writes the region `functions/src/index.ts` reads via setGlobalOptions.
 *
 * Deliberately `functions/.env.<projectId>`, not `functions/.env`. firebase-tools loads
 * `.env` first and then `.env.<projectId>`, so the per-project file wins - which means two
 * configured projects cannot overwrite each other's region, and a plain `functions/.env`
 * stays free for the shared secrets (`DEEPL_API_KEY`, `UNSPLASH_API_KEY`). Setup and deploy
 * only ever write the `.env.<projectId>` belonging to the project they were invoked for;
 * no other environment file is read, rewritten or deleted.
 */
export function writeFunctionsEnv(root, projectId, region) {
  const path = join(root, 'functions', `.env.${projectId}`);
  writeFileSync(path, `REGION=${region}\n`);
  return path;
}
