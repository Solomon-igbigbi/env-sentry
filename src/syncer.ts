import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv, extractKeys } from './parser.js';
import { generateSample } from './generator.js';
import { SyncOptions, SyncResult } from './types.js';

export async function sync(options: SyncOptions): Promise<SyncResult> {
  const { input, output, placeholder, silent } = options;

  // Read source .env
  const envContent = await readFile(input, 'utf8');
  const parsedLines = parseEnv(envContent);
  const newKeys = extractKeys(parsedLines);

  // Read existing .env.sample to compute diff (best-effort)
  let oldKeys: string[] = [];
  try {
    const existingContent = await readFile(output, 'utf8');
    oldKeys = extractKeys(parseEnv(existingContent));
  } catch {
    // File doesn't exist yet — that's fine
  }

  const newKeySet = new Set(newKeys);
  const oldKeySet = new Set(oldKeys);

  const keysAdded = newKeys.filter((k) => !oldKeySet.has(k));
  const keysRemoved = oldKeys.filter((k) => !newKeySet.has(k));

  // Generate and write
  const sampleContent = generateSample(parsedLines, placeholder);
  await writeFile(output, sampleContent, 'utf8');

  const result: SyncResult = {
    keysAdded,
    keysRemoved,
    timestamp: new Date(),
    outputPath: output,
  };

  if (!silent) {
    logResult(result, input);
  }

  return result;
}

function logResult(result: SyncResult, input: string): void {
  const ts = result.timestamp.toISOString();
  console.log(`[env-sentry] ${ts} synced ${input} → ${result.outputPath}`);
  if (result.keysAdded.length > 0) {
    console.log(`  + added:   ${result.keysAdded.join(', ')}`);
  }
  if (result.keysRemoved.length > 0) {
    console.log(`  - removed: ${result.keysRemoved.join(', ')}`);
  }
}
