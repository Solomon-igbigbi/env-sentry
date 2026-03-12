import { EnvLine, AssignmentLine } from './types.js';

function emptyValue(line: AssignmentLine, placeholder: string): string {
  if (placeholder !== '') return placeholder;
  if (line.quote === '"') return '""';
  if (line.quote === "'") return "''";
  return '';
}

export function generateSample(lines: EnvLine[], placeholder = ''): string {
  const outputLines: string[] = [];

  for (const line of lines) {
    switch (line.type) {
      case 'blank':
      case 'comment':
        outputLines.push(line.raw);
        break;

      case 'assignment': {
        const prefix = line.export ? 'export ' : '';
        const val = emptyValue(line, placeholder);
        outputLines.push(`${prefix}${line.key}=${val}`);
        break;
      }

      case 'continuation':
        // Skipped — the assignment line was already collapsed to KEY=
        break;
    }
  }

  // POSIX: end with a single trailing newline
  return outputLines.join('\n') + '\n';
}
