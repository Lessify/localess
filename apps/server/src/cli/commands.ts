import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { FirstAdminService } from '../auth/users/first-admin.service.js';
import type { FirebaseScryptParams } from '../auth/firebase-scrypt.js';
import { DATABASE, Database } from '../infra/database/database.module.js';
import { FirebaseImporter } from './firebase-import/firebase-importer.js';
import { FirebaseAdminSource, FirebaseSource } from './firebase-import/firebase-source.js';
import { STORAGE_DRIVER, StorageDriver } from '../infra/storage/storage.driver.js';
import { runChecks } from './check.js';
import { loadConfig } from '../infra/config/config.js';
import { CliModule } from './cli.module.js';

export const PASSWORD_ENV = 'LOCALESS_ADMIN_PASSWORD';

export const USAGE = `Usage: localess-server <command>

Commands:
  db:migrate                          Apply pending database migrations and exit
  check                               Report what this install has and lacks (exit 1 on failures)
  import:firebase --project <id> [--bucket <name>] [--no-files]
                                      Copy a Firebase-era Localess project into this server (re-runnable).
                                      Credentials: GOOGLE_APPLICATION_CREDENTIALS. Password hashes need
                                      FIREBASE_SCRYPT_SIGNER_KEY, _SALT_SEPARATOR, _ROUNDS, _MEM_COST.
  admin:create --email <email> [--name <name>]
                                      Create an administrator (and the "Hello World" space)
                                      The password is read from ${PASSWORD_ENV} or prompted for,
                                      never from a flag: argv is visible to other processes.`;

export interface CliIo {
  env: NodeJS.ProcessEnv;
  out(line: string): void;
  promptPassword(question: string): Promise<string>;
  /** Opens the Firebase project to import from (tests pass a fake). */
  firebaseSource?: (projectId: string, bucket?: string) => Promise<FirebaseSource>;
}

/** The project's password hash parameters, from env only (the signer key is a secret). */
export function scryptParamsFromEnv(env: NodeJS.ProcessEnv): FirebaseScryptParams | undefined {
  const signerKey = env['FIREBASE_SCRYPT_SIGNER_KEY'];
  const saltSeparator = env['FIREBASE_SCRYPT_SALT_SEPARATOR'];
  if (!signerKey || !saltSeparator) return undefined;
  return {
    signerKey,
    saltSeparator,
    rounds: Number(env['FIREBASE_SCRYPT_ROUNDS'] ?? 8),
    memCost: Number(env['FIREBASE_SCRYPT_MEM_COST'] ?? 14),
  };
}

async function withContext<T>(
  env: NodeJS.ProcessEnv,
  run: (app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>) => Promise<T>,
): Promise<T> {
  // The boot-time first-admin hook must not race the command.
  const config = { ...loadConfig(env), firstAdmin: undefined };
  // Quiet by default; LOCALESS_LOG_LEVEL opts back into the boot log.
  const logger = env['LOCALESS_LOG_LEVEL'] ? config.logLevels : (['fatal', 'error', 'warn'] as const).slice();
  const app = await NestFactory.createApplicationContext(CliModule.forRoot(config), { logger });
  try {
    return await run(app);
  } finally {
    await app.close();
  }
}

/** Returns the process exit code. */
export async function runCli(argv: string[], io: CliIo): Promise<number> {
  // `pnpm localess -- <command>` forwards the `--` itself (npm swallows it); accept both forms.
  const [command, ...rest] = argv[0] === '--' ? argv.slice(1) : argv;
  switch (command) {
    case 'db:migrate':
      await withContext(io.env, async () => io.out('Database schema is up to date.'));
      return 0;

    case 'admin:create': {
      const { values } = parseArgs({ args: rest, options: { email: { type: 'string' }, name: { type: 'string' } } });
      if (!values.email) {
        io.out(USAGE);
        return 2;
      }
      const password = io.env[PASSWORD_ENV] || (await io.promptPassword('Password for the new admin: '));
      const created = await withContext(io.env, app =>
        app.get(FirstAdminService).create({ email: values.email!, password, displayName: values.name }),
      );
      io.out(`Created admin ${values.email} (user ${created.userId}) and the "Hello World" space (${created.spaceId}).`);
      return 0;
    }

    case 'check': {
      const results = await withContext(io.env, app =>
        runChecks(loadConfig(io.env), app.get<Database>(DATABASE), app.get<StorageDriver>(STORAGE_DRIVER)),
      );
      const mark = { ok: '✓', warn: '!', fail: '✗' } as const;
      for (const result of results) io.out(`${mark[result.status]} ${result.name}: ${result.detail}`);
      return results.some(it => it.status === 'fail') ? 1 : 0;
    }

    case 'import:firebase': {
      const { values } = parseArgs({
        args: rest,
        options: { project: { type: 'string' }, bucket: { type: 'string' }, 'no-files': { type: 'boolean' } },
      });
      if (!values.project) {
        io.out(USAGE);
        return 2;
      }
      const scrypt = scryptParamsFromEnv(io.env);
      const source = await (io.firebaseSource ?? ((project, bucket) => FirebaseAdminSource.connect(project, bucket)))(
        values.project,
        values.bucket,
      );
      try {
        const report = await withContext(io.env, app =>
          new FirebaseImporter(source, app.get<Database>(DATABASE), app.get<StorageDriver>(STORAGE_DRIVER), {
            scrypt,
            files: !values['no-files'],
          }).run(),
        );
        const { warnings, ...counts } = report;
        io.out(`Imported from ${values.project}:`);
        for (const [name, value] of Object.entries(counts)) io.out(`  ${name}: ${value}`);
        if (warnings.length) {
          io.out(`${warnings.length} warning(s):`);
          for (const warning of warnings) io.out(`  ! ${warning}`);
        }
        return 0;
      } finally {
        await source.close();
      }
    }

    default:
      io.out(USAGE);
      return command && command !== 'help' && command !== '--help' ? 2 : 0;
  }
}
