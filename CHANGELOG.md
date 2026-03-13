# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-13

### Changed
- Package published under scoped name `@solomonigbigbi/env-sentry` (previously `env-sentry`)
- CLI binary renamed from `env-sentinel` to `env-sentry`

## [0.1.0] - 2026-03-13

### Added
- Initial release
- One-shot sync of `.env` → `.env.sample` via `sync()`
- Watch mode via `watch()` using chokidar
- CLI with `--input`, `--output`, `--placeholder`, `--watch`, `--silent` flags
- Preserves comments, blank lines, quoted values, `export` declarations, and CRLF line endings
- Collapses multiline `\` continuation lines
- Programmatic API with TypeScript types
- CommonJS + ESM dual build output
