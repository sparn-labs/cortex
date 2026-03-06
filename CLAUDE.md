# @sparn/cortex — Developer Guide

**Stack**: TypeScript, Vitest, Biome, React, Commander.js CLI, SQLite (better-sqlite3), Zod validation

## Commands

- `npm run build` — `tsup`
- `npm run dev` — `tsup --watch`
- `npm run test` — `vitest run`
- `npm run lint` — `biome check .`
- `npm run typecheck` — `tsc --noEmit`
- `npm run mcp:server` — Start MCP server
- `npm run validate` — Run quickstart validation

## Entry Points

- `src/index.ts` — Library API
- `src/cli/index.ts` — CLI entry point
- `src/daemon/index.ts` — Daemon process
- `src/mcp/index.ts` — MCP server
- `src/hooks/` — Claude Code hooks (pre-prompt, post-tool-result, stop-docs-refresh)

## CLI Commands

`setup`, `init`, `scan`, `optimize`, `stats`, `consolidate`, `secure`, `comply`, `docs`, `config`, `daemon`, `hooks`, `status`, `interactive`, `graph`, `search`, `plan`, `exec`, `verify`, `dashboard`

## Structure

- `src/core/` — Core optimization engine (kv-memory, btsp-embedder, budget-pruner, confidence-states, context-pipeline, engram-scorer, sparse-pruner, sleep-compressor, incremental-optimizer)
- `src/core/analyzers/` — Quality, security, testdocs analyzers + scoring + reporting
- `src/core/secure/` — 11-layer OWASP security audit engine
- `src/core/comply/` — 8-layer regulatory compliance engine
- `src/core/docs-generator.ts` — CLAUDE.md auto-generation
- `src/core/search-engine.ts` — FTS5 + ripgrep search
- `src/core/dependency-graph.ts` — Dependency graph analysis
- `src/core/workflow-planner.ts` — Plan/exec/verify workflow
- `src/cli/commands/` — CLI command handlers
- `src/cli/dashboard/` — Ink TUI dashboard (React)
- `src/cli/ui/` — Banner, colors, display helpers
- `src/daemon/` — Background daemon (file tracking, session watching, consolidation)
- `src/hooks/` — Claude Code hooks
- `src/mcp/` — MCP server (4 tools: cortex_optimize, cortex_stats, cortex_search, cortex_consolidate)
- `src/types/` — Config, memory, adapter types
- `src/utils/` — Hash, logger, tokenizer, tfidf, audio, context-parser

## Dependencies (14)

`@inquirer/prompts`, `@modelcontextprotocol/sdk`, `better-sqlite3`, `boxen`, `chalk`, `commander`, `cosmiconfig`, `gpt-tokenizer`, `ink`, `ink-text-input`, `js-yaml`, `ora`, `react`, `zod`
