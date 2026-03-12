import { describe, it, expect } from 'vitest';
import { parseEnv, extractKeys } from '../src/parser.js';

describe('parseEnv', () => {
  it('parses blank lines', () => {
    const lines = parseEnv('\n\n');
    expect(lines.every((l) => l.type === 'blank')).toBe(true);
  });

  it('parses comment lines', () => {
    const lines = parseEnv('# a comment\n  # indented comment');
    expect(lines[0]).toMatchObject({ type: 'comment', raw: '# a comment' });
    expect(lines[1]).toMatchObject({ type: 'comment', raw: '  # indented comment' });
  });

  it('parses simple assignment', () => {
    const lines = parseEnv('KEY=value\n');
    expect(lines[0]).toMatchObject({ type: 'assignment', key: 'KEY', value: 'value', export: false });
  });

  it('parses export assignment', () => {
    const lines = parseEnv('export MY_KEY=secret\n');
    expect(lines[0]).toMatchObject({ type: 'assignment', key: 'MY_KEY', export: true });
  });

  it('parses empty value', () => {
    const lines = parseEnv('EMPTY=\n');
    expect(lines[0]).toMatchObject({ type: 'assignment', key: 'EMPTY', value: '' });
  });

  it('parses double-quoted value', () => {
    const lines = parseEnv('KEY="hello world"\n');
    expect(lines[0]).toMatchObject({ type: 'assignment', key: 'KEY', quote: '"' });
  });

  it('parses single-quoted value', () => {
    const lines = parseEnv("KEY='hello world'\n");
    expect(lines[0]).toMatchObject({ type: 'assignment', key: 'KEY', quote: "'" });
  });

  it('handles equals in value', () => {
    const lines = parseEnv('KEY=a=b=c\n');
    expect(lines[0]).toMatchObject({ type: 'assignment', key: 'KEY', value: 'a=b=c' });
  });

  it('handles CRLF line endings', () => {
    const lines = parseEnv('KEY=value\r\nOTHER=x\r\n');
    expect(lines[0]).toMatchObject({ type: 'assignment', key: 'KEY', value: 'value' });
    expect(lines[1]).toMatchObject({ type: 'assignment', key: 'OTHER', value: 'x' });
  });

  it('parses multiline backslash continuation', () => {
    const lines = parseEnv('KEY=line1 \\\n  line2 \\\n  line3\n');
    expect(lines[0]).toMatchObject({ type: 'assignment', key: 'KEY', continues: true });
    expect(lines[1]).toMatchObject({ type: 'continuation' });
    expect(lines[2]).toMatchObject({ type: 'continuation' });
  });

  it('handles duplicate keys — both preserved', () => {
    const lines = parseEnv('KEY=first\nKEY=second\n');
    const assignments = lines.filter((l) => l.type === 'assignment');
    expect(assignments).toHaveLength(2);
  });

  it('treats commented key as comment, not assignment', () => {
    const lines = parseEnv('# KEY=value\n');
    expect(lines[0].type).toBe('comment');
  });
});

describe('extractKeys', () => {
  it('returns only assignment keys', () => {
    const lines = parseEnv('# comment\nKEY=val\nOTHER=x\n');
    expect(extractKeys(lines)).toEqual(['KEY', 'OTHER']);
  });

  it('includes exported keys', () => {
    const lines = parseEnv('export EXPORTED=val\n');
    expect(extractKeys(lines)).toContain('EXPORTED');
  });
});
