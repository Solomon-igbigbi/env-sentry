import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sync } from '../src/syncer.js';
import { SyncOptions } from '../src/types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'env-sentinel-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function opts(overrides: Partial<SyncOptions> = {}): SyncOptions {
  return {
    input: join(tmpDir, '.env'),
    output: join(tmpDir, '.env.sample'),
    placeholder: '',
    watch: false,
    silent: true,
    ...overrides,
  };
}

describe('sync', () => {
  it('creates .env.sample from .env', async () => {
    await writeFile(join(tmpDir, '.env'), 'KEY=secret\nOTHER=value\n');
    await sync(opts());
    const sample = await readFile(join(tmpDir, '.env.sample'), 'utf8');
    expect(sample).toBe('KEY=\nOTHER=\n');
  });

  it('reports keysAdded when .env.sample does not exist', async () => {
    await writeFile(join(tmpDir, '.env'), 'NEW_KEY=value\n');
    const result = await sync(opts());
    expect(result.keysAdded).toContain('NEW_KEY');
    expect(result.keysRemoved).toHaveLength(0);
  });

  it('reports keysAdded for new keys', async () => {
    await writeFile(join(tmpDir, '.env'), 'EXISTING=a\n');
    await writeFile(join(tmpDir, '.env.sample'), 'EXISTING=\n');

    await writeFile(join(tmpDir, '.env'), 'EXISTING=a\nNEW_KEY=b\n');
    const result = await sync(opts());
    expect(result.keysAdded).toEqual(['NEW_KEY']);
    expect(result.keysRemoved).toHaveLength(0);
  });

  it('reports keysRemoved for deleted keys', async () => {
    await writeFile(join(tmpDir, '.env'), 'KEEP=a\nGONE=b\n');
    await writeFile(join(tmpDir, '.env.sample'), 'KEEP=\nGONE=\n');

    await writeFile(join(tmpDir, '.env'), 'KEEP=a\n');
    const result = await sync(opts());
    expect(result.keysRemoved).toEqual(['GONE']);
  });

  it('preserves structure (comments + blanks)', async () => {
    const envContent = '# App\nAPP_NAME=MyApp\n\n# DB\nDB_PASS=secret\n';
    await writeFile(join(tmpDir, '.env'), envContent);
    await sync(opts());
    const sample = await readFile(join(tmpDir, '.env.sample'), 'utf8');
    expect(sample).toBe('# App\nAPP_NAME=\n\n# DB\nDB_PASS=\n');
  });

  it('returns correct outputPath and timestamp', async () => {
    await writeFile(join(tmpDir, '.env'), 'K=v\n');
    const before = new Date();
    const result = await sync(opts());
    const after = new Date();
    expect(result.outputPath).toBe(join(tmpDir, '.env.sample'));
    expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('throws when input file does not exist', async () => {
    await expect(sync(opts({ input: join(tmpDir, 'nonexistent.env') }))).rejects.toThrow();
  });

  it('uses placeholder when specified', async () => {
    await writeFile(join(tmpDir, '.env'), 'SECRET=mysecret\n');
    await sync(opts({ placeholder: 'CHANGE_ME' }));
    const sample = await readFile(join(tmpDir, '.env.sample'), 'utf8');
    expect(sample).toBe('SECRET=CHANGE_ME\n');
  });

  it('handles fixture: basic.env', async () => {
    const { readFile: rf } = await import('node:fs/promises');
    const content = await rf(new URL('./fixtures/basic.env', import.meta.url), 'utf8');
    await writeFile(join(tmpDir, '.env'), content);
    await sync(opts());
    const sample = await readFile(join(tmpDir, '.env.sample'), 'utf8');
    expect(sample).toContain('DB_PASS=');
    expect(sample).not.toContain('supersecret');
    expect(sample).not.toContain('abc123xyz');
    expect(sample).toContain('# Database');
  });

  it('handles fixture: edge-cases.env', async () => {
    const { readFile: rf } = await import('node:fs/promises');
    const content = await rf(new URL('./fixtures/edge-cases.env', import.meta.url), 'utf8');
    await writeFile(join(tmpDir, '.env'), content);
    await sync(opts());
    const sample = await readFile(join(tmpDir, '.env.sample'), 'utf8');
    // Multiline collapsed
    expect(sample).toContain('MULTILINE_KEY=');
    expect(sample).not.toContain('line one');
    // Export preserved
    expect(sample).toContain('export EXPORTED_KEY=');
    // Double-quoted empty
    expect(sample).toContain('DOUBLE_QUOTED=""');
    // Single-quoted empty
    expect(sample).toContain("SINGLE_QUOTED=''");
    // Values stripped
    expect(sample).not.toContain('secret');
  });
});
