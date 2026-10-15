// Starts the built Localess server (apps/server/dist) against a fresh embedded Postgres, for Playwright's webServer.
// Every run wipes the data directory, so the server seeds the first admin and the "Hello World" space again.
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const serverMain = resolve(root, 'apps/server/dist/main.js');
const staticDir = resolve(root, 'apps/web/dist/browser');
const dataDir = process.env.LOCALESS_DATA_DIR;

for (const [path, build] of [
  [serverMain, 'pnpm server:build'],
  [resolve(staticDir, 'index.html'), 'pnpm build:prod'],
]) {
  if (!existsSync(path)) {
    console.error(`[e2e] ${path} is missing: run \`${build}\` first (or \`pnpm e2e\`, which builds both).`);
    process.exit(1);
  }
}
if (!dataDir) {
  console.error('[e2e] LOCALESS_DATA_DIR is not set (playwright.config.ts sets it).');
  process.exit(1);
}

rmSync(dataDir, { recursive: true, force: true });

const server = spawn(process.execPath, ['--enable-source-maps', serverMain], {
  env: { ...process.env, LOCALESS_STATIC_DIR: staticDir },
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', code => process.exit(code ?? 0));
