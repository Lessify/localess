// Starts the built Localess server (apps/server/dist) against a fresh embedded Postgres, for Playwright's webServer.
// Every run wipes the data directory, so the server seeds the first admin and the "Hello World" space again.
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { resolve } from 'node:path';

import { OAuth2Server } from 'oauth2-mock-server';
import pg from 'pg';

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

// An external Postgres (E2E_DATABASE_URL → DATABASE_URL): emptied like the data directory, so the server migrates a
// blank database and seeds the first admin again.
if (process.env.DATABASE_URL) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('drop schema if exists drizzle cascade; drop schema if exists public cascade; create schema public');
  await client.end();
}

// A mock OpenID provider for Google and Microsoft sign-in. It signs in whoever the test names: tests add `e2e_email`
// (and optionally `e2e_sub`, `e2e_name`, `e2e_verified=false`) to the authorize URL (tests/support/oauth.ts); the
// claims are kept by the issued code and put into the ID token when the server redeems it.
const idp = new OAuth2Server();
await idp.issuer.keys.generate('RS256');
await idp.start(Number(process.env.E2E_IDP_PORT ?? 3101), '127.0.0.1');
const claimsByCode = new Map();
idp.service.on('beforeAuthorizeRedirect', ({ url }, req) => {
  const query = new URL(req.url ?? '', 'http://idp').searchParams;
  const email = query.get('e2e_email');
  if (!email) return;
  const verified = query.get('e2e_verified') !== 'false';
  claimsByCode.set(url.searchParams.get('code'), {
    sub: query.get('e2e_sub') ?? `sub-${email}`,
    email,
    name: query.get('e2e_name') ?? undefined,
    // Google's and Microsoft's ways of saying the email is verified.
    email_verified: verified,
    xms_edov: verified,
  });
});
idp.service.on('beforeTokenSigning', (token, req) => {
  const claims = claimsByCode.get(req.body?.code);
  // The ID token only (it carries the nonce), not the access token.
  if (claims && 'nonce' in token.payload) Object.assign(token.payload, claims);
});

// A mail catcher for "forgot password" emails: the least of SMTP (no TLS, no auth), and the received mails as JSON at
// `GET /messages` on the next port, for tests/support/mail.ts.
const mailPort = Number(process.env.E2E_MAIL_PORT ?? 3102);
const mails = [];
const smtp = createTcpServer(socket => {
  let data = undefined;
  let mail = { to: [], raw: '' };
  const reply = line => socket.write(`${line}\r\n`);
  reply('220 e2e mail catcher');
  let buffer = '';
  socket.on('data', chunk => {
    buffer += chunk.toString('utf8');
    for (let end = buffer.indexOf('\r\n'); end >= 0; end = buffer.indexOf('\r\n')) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (data !== undefined) {
        if (line === '.') {
          mails.push({ ...mail, raw: data, receivedAt: Date.now() });
          data = undefined;
          mail = { to: [], raw: '' };
          reply('250 OK');
        } else {
          data += `${line.startsWith('..') ? line.slice(1) : line}\n`;
        }
        continue;
      }
      const command = line.slice(0, 4).toUpperCase();
      if (command === 'EHLO' || command === 'HELO') reply('250 e2e');
      else if (command === 'MAIL') reply('250 OK');
      else if (command === 'RCPT') {
        mail.to.push((line.match(/<([^>]+)>/) ?? [])[1]);
        reply('250 OK');
      } else if (command === 'DATA') {
        data = '';
        reply('354 End data with <CR><LF>.<CR><LF>');
      } else if (command === 'QUIT') {
        reply('221 Bye');
        socket.end();
      } else reply('250 OK');
    }
  });
});
await new Promise(resolve => smtp.listen(mailPort, '127.0.0.1', resolve));
const mailbox = createHttpServer((request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(mails));
});
await new Promise(resolve => mailbox.listen(mailPort + 1, '127.0.0.1', resolve));

const server = spawn(process.execPath, ['--enable-source-maps', serverMain], {
  env: {
    ...process.env,
    LOCALESS_STATIC_DIR: staticDir,
    LOCALESS_GOOGLE_ISSUER: idp.issuer.url,
    LOCALESS_MICROSOFT_ISSUER: idp.issuer.url,
    LOCALESS_SMTP_URL: `smtp://127.0.0.1:${mailPort}`,
  },
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.kill(signal);
    void idp.stop();
    smtp.close();
    mailbox.close();
  });
}
server.on('exit', code => process.exit(code ?? 0));
