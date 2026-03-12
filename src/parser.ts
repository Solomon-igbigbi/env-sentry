import { EnvLine, AssignmentLine } from './types.js';

const ASSIGNMENT_RE = /^(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

function detectQuote(value: string): '' | '"' | "'" {
  if (value.startsWith('"')) return '"';
  if (value.startsWith("'")) return "'";
  return '';
}

export function parseEnv(content: string): EnvLine[] {
  const rawLines = content.split('\n');
  const lines: EnvLine[] = [];
  let inContinuation = false;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i].trimEnd(); // strip CRLF / trailing spaces

    // Skip the synthetic empty string after a trailing newline
    if (i === rawLines.length - 1 && raw === '') continue;

    if (inContinuation) {
      const continues = raw.endsWith('\\');
      lines.push({ type: 'continuation', raw });
      inContinuation = continues;
      continue;
    }

    // Blank line
    if (raw.trim() === '') {
      lines.push({ type: 'blank', raw });
      continue;
    }

    // Comment line
    if (raw.trimStart().startsWith('#')) {
      lines.push({ type: 'comment', raw });
      continue;
    }

    // Assignment
    const match = ASSIGNMENT_RE.exec(raw);
    if (match) {
      const hasExport = Boolean(match[1]);
      const key = match[2];
      const value = match[3];
      const continues = value.endsWith('\\');
      const quote = detectQuote(value);

      const line: AssignmentLine = {
        type: 'assignment',
        raw,
        export: hasExport,
        key,
        value,
        quote,
        continues,
      };
      lines.push(line);
      inContinuation = continues;
      continue;
    }

    // Unrecognised line — treat as comment to preserve it
    lines.push({ type: 'comment', raw });
  }

  return lines;
}

export function extractKeys(lines: EnvLine[]): string[] {
  return lines
    .filter((l): l is AssignmentLine => l.type === 'assignment')
    .map((l) => l.key);
}
