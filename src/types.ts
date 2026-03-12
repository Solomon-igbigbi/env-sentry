export type LineType = 'blank' | 'comment' | 'assignment' | 'continuation';

export interface BlankLine {
  type: 'blank';
  raw: string;
}

export interface CommentLine {
  type: 'comment';
  raw: string;
}

export interface AssignmentLine {
  type: 'assignment';
  raw: string;
  export: boolean;
  key: string;
  value: string;
  quote: '' | '"' | "'";
  continues: boolean; // ends with backslash
}

export interface ContinuationLine {
  type: 'continuation';
  raw: string;
}

export type EnvLine = BlankLine | CommentLine | AssignmentLine | ContinuationLine;

export interface SyncOptions {
  input: string;
  output: string;
  placeholder: string;
  watch: boolean;
  silent: boolean;
}

export interface SyncResult {
  keysAdded: string[];
  keysRemoved: string[];
  timestamp: Date;
  outputPath: string;
}
