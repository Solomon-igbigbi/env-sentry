# env-sentry

Keep `.env.sample` in sync with `.env` automatically — strips values, preserves keys, comments, blank lines, and overall file structure.

## Problem

Developers forget to update `.env.sample` when adding new environment variables. New team members clone the repo, copy `.env.sample`, and encounter mysterious runtime failures because their sample is stale.

`env-sentry` solves this by watching `.env` and regenerating `.env.sample` whenever it changes.

## Install

```bash
npm install --save-dev env-sentry
# or
npm install -g env-sentry
```

## CLI Usage

```bash
# One-shot sync (safe for CI/CD — exits 0 on success, 1 on error)
env-sentry

# Watch mode — stays alive and re-syncs on every .env change
env-sentry --watch

# Custom paths
env-sentry --input config/.env --output config/.env.sample

# Add a placeholder value instead of empty string
env-sentry --placeholder "CHANGE_ME"

# Suppress output
env-sentry --silent
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-i, --input <path>` | `.env` | Source .env file |
| `-o, --output <path>` | `.env.sample` | Output .env.sample file |
| `-p, --placeholder <str>` | `""` | Value placeholder |
| `-w, --watch` | off | Watch mode |
| `-s, --silent` | off | Suppress output |
| `-V, --version` | | Show version |
| `-h, --help` | | Show help |

## Programmatic API

```typescript
import { sync, watch } from 'env-sentry';

// One-shot
const result = await sync({
  input: '.env',
  output: '.env.sample',
  placeholder: '',
  watch: false,
  silent: false,
});
console.log(result.keysAdded);   // ['NEW_KEY']
console.log(result.keysRemoved); // ['OLD_KEY']

// Watch mode
const stop = watch({
  input: '.env',
  output: '.env.sample',
  placeholder: '',
  watch: true,
  silent: false,
});

// Graceful shutdown
stop();
```

## What it does

Given this `.env`:

```env
# Application
APP_NAME=MyApp
APP_ENV=production

# Secrets
DB_PASS=supersecret
API_KEY=abc123xyz
```

It generates this `.env.sample`:

```env
# Application
APP_NAME=
APP_ENV=

# Secrets
DB_PASS=
API_KEY=
```

Structure, comments, and blank lines are preserved exactly. Only values are stripped.

## NestJS / Monorepo Integration

**Development (with concurrently):**

```json
{
  "scripts": {
    "start:dev": "concurrently \"env-sentry --watch\" \"nest start --watch\""
  }
}
```

**Git pre-commit hook (husky):**

```bash
# .husky/pre-commit
npx env-sentry --no-watch
git add .env.sample
```

This ensures `.env.sample` is always committed alongside `.env` changes.

## Edge Cases

| Case | Behavior |
|------|----------|
| `KEY=val=with=equals` | Captures everything after first `=` |
| `KEY=` (already empty) | Preserved as `KEY=` |
| `"quoted values"` | Preserved as `KEY=""` |
| `'single quoted'` | Preserved as `KEY=''` |
| `export KEY=val` | Preserved as `export KEY=` |
| Duplicate keys | Both lines preserved |
| CRLF line endings | Stripped cleanly |
| Multiline `\` continuation | Collapsed to single `KEY=` |
| `# KEY=value` (commented) | Treated as comment, not a key |
| File deleted while watching | Warning logged, no crash |
| `.env` not found (one-shot) | Exit code 1 with clear error |

## License

MIT
