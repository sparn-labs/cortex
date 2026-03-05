# @sparn/cortex — Developer Guide

**Stack**: TypeScript, Vitest, Biome, Commander.js CLI, Zod validation

## Commands

- `npm run build` — `tsup`
- `npm run dev` — `tsup --watch`
- `npm run test` — `vitest run`
- `npm run lint` — `biome check .`
- `npm run typecheck` — `tsc --noEmit`

## Entry Points

- `src/index.ts` — Library API
- `src/cli/index.ts` — CLI entry point (8 commands)

## CLI Commands

`setup`, `init`, `scan`, `secure`, `comply`, `docs`, `debt`, `config`

## Structure

- `src/core/analyzers/` — Quality, security, testdocs analyzers + scoring + reporting
- `src/core/secure/` — 11-layer OWASP security audit engine
- `src/core/comply/` — 8-layer regulatory compliance engine
- `src/core/debt-tracker.ts` — JSON-backed tech debt tracking
- `src/core/docs-generator.ts` — CLAUDE.md auto-generation
- `src/cli/commands/` — CLI command handlers
- `src/cli/ui/` — Banner, colors, display helpers
- `src/types/config.ts` — Config types (UIConfig, ScanConfig)
- `src/utils/` — Hash, logger utilities

## Dependencies (6, zero native)

`boxen`, `chalk`, `commander`, `js-yaml`, `ora`, `zod`
