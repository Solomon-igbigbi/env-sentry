#!/usr/bin/env node
import { Command } from 'commander';
import { sync } from './syncer.js';
import { watch } from './watcher.js';
import { SyncOptions } from './types.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
) as { version: string };

const program = new Command();

program
  .name('env-sentry')
  .description('Keep .env.sample in sync with .env automatically')
  .version(pkg.version)
  .option('-i, --input <path>', 'Source .env file', '.env')
  .option('-o, --output <path>', 'Output .env.sample file', '.env.sample')
  .option('-p, --placeholder <str>', 'Value placeholder (replaces all values)', '')
  .option('-w, --watch', 'Watch mode — stay alive and re-sync on changes')
  .option('-s, --silent', 'Suppress output')
  .action(async (opts: { input: string; output: string; placeholder: string; watch?: boolean; silent?: boolean }) => {
    const options: SyncOptions = {
      input: opts.input,
      output: opts.output,
      placeholder: opts.placeholder,
      watch: opts.watch ?? false,
      silent: opts.silent ?? false,
    };

    if (options.watch) {
      const stop = watch(options);

      const shutdown = () => {
        if (!options.silent) console.log('\n[env-sentry] Shutting down...');
        stop();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } else {
      try {
        await sync(options);
      } catch (err: unknown) {
        console.error(`[env-sentry] Error: ${(err as Error).message}`);
        process.exit(1);
      }
    }
  });

program.parse(process.argv);
