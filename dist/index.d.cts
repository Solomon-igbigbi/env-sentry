interface BlankLine {
    type: 'blank';
    raw: string;
}
interface CommentLine {
    type: 'comment';
    raw: string;
}
interface AssignmentLine {
    type: 'assignment';
    raw: string;
    export: boolean;
    key: string;
    value: string;
    quote: '' | '"' | "'";
    continues: boolean;
}
interface ContinuationLine {
    type: 'continuation';
    raw: string;
}
type EnvLine = BlankLine | CommentLine | AssignmentLine | ContinuationLine;
interface SyncOptions {
    input: string;
    output: string;
    placeholder: string;
    watch: boolean;
    silent: boolean;
}
interface SyncResult {
    keysAdded: string[];
    keysRemoved: string[];
    timestamp: Date;
    outputPath: string;
}

declare function sync(options: SyncOptions): Promise<SyncResult>;

declare function watch(options: SyncOptions): () => void;

declare function parseEnv(content: string): EnvLine[];
declare function extractKeys(lines: EnvLine[]): string[];

declare function generateSample(lines: EnvLine[], placeholder?: string): string;

export { type EnvLine, type SyncOptions, type SyncResult, extractKeys, generateSample, parseEnv, sync, watch };
