import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { FirstAdminService } from '../bootstrap/first-admin.service.js';
import { loadConfig } from '../config/config.js';
import { CliModule } from './cli.module.js';

export const PASSWORD_ENV = 'LOCALESS_ADMIN_PASSWORD';

export const USAGE = `Usage: localess-server <command>

Commands:
  db:migrate                          Apply pending database migrations and exit
  admin:create --email <email> [--name <name>]
                                      Create an administrator (and the "Hello World" space)
                                      The password is read from ${PASSWORD_ENV} or prompted for,
                                      never from a flag: argv is visible to other processes.`;

export interface CliIo {
  env: NodeJS.ProcessEnv;
  out(line: string): void;
  promptPassword(question: string): Promise<string>;
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
  const [command, ...rest] = argv;
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

    default:
      io.out(USAGE);
      return command && command !== 'help' && command !== '--help' ? 2 : 0;
  }
}
