import { defineConfig } from 'tsup';

export default defineConfig([
  // Library entry (dual CJS + ESM)
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  // CLI entry (ESM only — shebang from source is preserved by tsup)
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: false,
  },
]);
