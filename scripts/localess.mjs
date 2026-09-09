#!/usr/bin/env node
/**
 * The Localess CLI.
 *
 * Three commands share project identification, marker handling and local file generation,
 * so they live behind one entry point rather than as separate scripts. The npm aliases
 * (`npm run setup:firebase`, `npm run deploy`, `npm run sync`) forward to it.
 *
 *   localess setup    provision Firebase infrastructure and record the markers
 *   localess deploy   build and deploy Localess to a marked project
 *   localess sync     regenerate the local project files from remote state
 */
import { isPromptAbort } from './localess/prompts.mjs';
import { UsageError } from './localess/usage.mjs';

const COMMANDS = {
  setup: { module: './localess/commands/setup.mjs', summary: 'Provision Firebase infrastructure for a project' },
  deploy: { module: './localess/commands/deploy.mjs', summary: 'Build and deploy Localess to a managed project' },
  sync: { module: './localess/commands/sync.mjs', summary: 'Regenerate local project files from remote state' },
};

function printCommands() {
  console.log('\nUsage: localess <command> [options]\n');
  for (const [name, { summary }] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(8)} ${summary}`);
  }
  console.log('\nRun `localess <command> --help` for the options of one command.\n');
}

const [name, ...argv] = process.argv.slice(2);

if (name === undefined || name === '--help' || name === '-h') {
  printCommands();
  process.exit(name === undefined ? 1 : 0);
}

if (!Object.hasOwn(COMMANDS, name)) {
  console.error(`\n\x1b[31mUnknown command: ${name}\x1b[0m`);
  printCommands();
  process.exit(1);
}

const { run, USAGE, FAILURE_HINT } = await import(COMMANDS[name].module);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`\n${USAGE}\n`);
  process.exit(0);
}

try {
  await run(argv);
} catch (error) {
  // Ctrl-C at a prompt is a choice, not a failure - exit quietly.
  if (isPromptAbort(error)) {
    console.error(`\n\x1b[90mCancelled.${FAILURE_HINT ? ` ${FAILURE_HINT}` : ''}\x1b[0m\n`);
    process.exit(130);
  }
  if (error instanceof UsageError) {
    console.error(`\n\x1b[31m${error.message}\x1b[0m\n\n  ${USAGE}\n`);
    process.exit(1);
  }
  console.error(`\n\x1b[31m${name} failed:\x1b[0m ${error.message}\n`);
  if (FAILURE_HINT) console.error(`${FAILURE_HINT}\n`);
  process.exit(1);
}
