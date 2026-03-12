import { describe, it, expect } from 'vitest';
import { parseEnv } from '../src/parser.js';
import { generateSample } from '../src/generator.js';

describe('generateSample', () => {
  it('strips values from assignments', () => {
    const lines = parseEnv('KEY=secretvalue\n');
    const sample = generateSample(lines);
    expect(sample).toBe('KEY=\n');
  });

  it('preserves comments verbatim', () => {
    const lines = parseEnv('# This is a comment\nKEY=val\n');
    const sample = generateSample(lines);
    expect(sample).toContain('# This is a comment');
  });

  it('preserves blank lines', () => {
    const lines = parseEnv('KEY1=a\n\nKEY2=b\n');
    const sample = generateSample(lines);
    expect(sample).toBe('KEY1=\n\nKEY2=\n');
  });

  it('preserves double-quoted empty value', () => {
    const lines = parseEnv('KEY="hello"\n');
    const sample = generateSample(lines);
    expect(sample).toBe('KEY=""\n');
  });

  it('preserves single-quoted empty value', () => {
    const lines = parseEnv("KEY='hello'\n");
    const sample = generateSample(lines);
    expect(sample).toBe("KEY=''\n");
  });

  it('collapses multiline to single KEY= line', () => {
    const lines = parseEnv('KEY=line1 \\\n  line2 \\\n  line3\nOTHER=x\n');
    const sample = generateSample(lines);
    expect(sample).toBe('KEY=\nOTHER=\n');
  });

  it('preserves export prefix', () => {
    const lines = parseEnv('export MY_VAR=secret\n');
    const sample = generateSample(lines);
    expect(sample).toBe('export MY_VAR=\n');
  });

  it('uses placeholder when specified', () => {
    const lines = parseEnv('KEY=secret\n');
    const sample = generateSample(lines, 'YOUR_VALUE_HERE');
    expect(sample).toBe('KEY=YOUR_VALUE_HERE\n');
  });

  it('placeholder overrides quote style', () => {
    const lines = parseEnv('KEY="secret"\n');
    const sample = generateSample(lines, 'PLACEHOLDER');
    expect(sample).toBe('KEY=PLACEHOLDER\n');
  });

  it('ends with a single trailing newline (POSIX)', () => {
    const lines = parseEnv('KEY=val\n');
    const sample = generateSample(lines);
    expect(sample.endsWith('\n')).toBe(true);
    expect(sample.endsWith('\n\n')).toBe(false);
  });

  it('handles empty file', () => {
    const lines = parseEnv('');
    const sample = generateSample(lines);
    expect(sample).toBe('\n');
  });
});
