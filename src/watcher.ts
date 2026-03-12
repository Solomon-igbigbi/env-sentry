import chokidar from 'chokidar';
import { sync } from './syncer.js';
import { SyncOptions } from './types.js';

export function watch(options: SyncOptions): () => void {
  const { input, silent } = options;

  // Initial sync before entering watch loop
  sync(options).catch((err: unknown) => {
    console.error(`[env-sentry] Initial sync failed: ${(err as Error).message}`);
  });

  const watcher = chokidar.watch(input, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on('change', () => {
    sync(options).catch((err: unknown) => {
      console.error(`[env-sentry] Sync error: ${(err as Error).message}`);
    });
  });

  watcher.on('unlink', () => {
    if (!silent) {
      console.warn(`[env-sentry] Warning: ${input} was deleted. Watching for recreation...`);
    }
  });

  watcher.on('add', (path) => {
    if (path === input || path.endsWith(input)) {
      sync(options).catch((err: unknown) => {
        console.error(`[env-sentry] Sync error after re-add: ${(err as Error).message}`);
      });
    }
  });

  watcher.on('error', (err: unknown) => {
    console.error(`[env-sentry] Watcher error: ${(err as Error).message}`);
  });

  return () => {
    watcher.close().catch(() => {});
  };
}
