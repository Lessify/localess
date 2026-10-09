import 'reflect-metadata';
import { createInterface } from 'node:readline';
import { Logger } from '@nestjs/common';
import { runCli } from './cli/commands.js';

function promptPassword(question: string): Promise<string> {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Echo nothing while typing.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => undefined;
    process.stdout.write(question);
    rl.question('', answer => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

Logger.overrideLogger(['fatal', 'error', 'warn']);
runCli(process.argv.slice(2), { env: process.env, out: line => console.log(line), promptPassword }).then(
  code => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
