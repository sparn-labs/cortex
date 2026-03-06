# Cortex

Context optimization & code analysis for AI coding agents. Keeps your Claude Code sessions lean so they last longer, cost less, and stay focused.

## Quick Start

```bash
npm install -g @sparn/cortex
cd your-project
cortex setup
```

One command handles everything: detects Claude Code, creates the config, installs hooks, starts the background daemon, and generates your `CLAUDE.md`.

You don't need to change anything about how you use Claude Code — cortex works through hooks that fire automatically.

## What It Does

### Token optimization (hooks)

Every time Claude runs a Bash command, reads a file, or greps your codebase, cortex checks the output size. If it's large (3000+ tokens), it generates a content-aware summary.

The compression is type-aware:
- **Test results** — extracts pass/fail lines, skips the noise
- **TypeScript errors** — groups by error code (`TS2304(12), TS7006(3)`)
- **Lint output** — aggregates by rule
- **Git diffs** — lists changed files
- **JSON responses** — shows structure (array length, object keys)
- **Build logs** — pulls error and warning lines

Typical reduction: **60-90%** on verbose outputs.

### Session awareness

At the start of each prompt, cortex shows session health:

```
[cortex] Session: 4.2MB | 3 outputs compressed | ~12K tokens saved
```

When your session grows past 2MB, it nudges Claude to stay concise.

### Cross-session memory

When you start a fresh Claude Code session in a project cortex knows about, it injects a briefing with important context from past sessions — errors, architectural decisions, and active implementation plans.

### Daemon

The background daemon watches your session files and optimizes them when they get large. It auto-starts with Claude Code — if it dies, the next prompt brings it back.

```bash
cortex daemon status    # Check if running
cortex daemon stop      # Stop it
```

## Code Analysis

### `cortex scan`

Quick quality, security, and test coverage check:

```bash
cortex scan                    # Full scan
cortex scan --focus quality    # Quality only
cortex scan --focus security   # Security only
cortex scan --json             # Machine-readable output
cortex scan -o report.md       # Write report to file
```

### `cortex secure`

11-layer OWASP security audit with per-layer scoring and auto-fix:

```bash
cortex secure .                # Full audit
cortex secure . --fix          # Auto-fix where possible
cortex secure . --quick        # Faster scan
cortex secure . -v             # Detailed findings
```

**CI mode:**

```bash
cortex secure . --ci                  # Fail on critical findings
cortex secure . --ci --min-grade B    # Fail if below grade B
cortex secure . --ci --fail-on high   # Fail on high+ severity
```

### `cortex comply`

8-layer regulatory compliance check (GDPR, CCPA, HIPAA, SOC2, PCI-DSS):

```bash
cortex comply .                       # Full audit
cortex comply . --framework gdpr      # Focus on GDPR
cortex comply . --ci --min-grade B    # CI mode
```

## Codebase Intelligence

### Dependency graph

```bash
cortex graph --analyze            # Entry points, hot paths, orphans
cortex graph --focus auth         # Focus on auth-related files
cortex graph --entry src/index.ts # Trace from an entry point
```

### Search

Full-text search backed by SQLite FTS5, with ripgrep fallback:

```bash
cortex search init            # Index your codebase
cortex search validateToken   # Search
cortex search refresh         # Re-index after changes
```

### Docs generation

Auto-generates a `CLAUDE.md` from your project structure, scripts, and dependency graph:

```bash
cortex docs
cortex docs -o docs/CLAUDE.md
```

### Workflow planner

Create implementation plans with token budgets, then execute and verify:

```bash
cortex plan "Add user auth" --files src/auth.ts src/routes.ts
cortex exec <plan-id>
cortex verify <plan-id>
```

## Dashboard

Interactive TUI with 3 monitoring panels (optimization, graph, memory) and an integrated command prompt:

```bash
cortex dashboard
```

## MCP Server

Cortex runs as an MCP server for Claude Desktop or any MCP client:

```bash
cortex mcp:server
```

Exposes four tools: `cortex_optimize`, `cortex_stats`, `cortex_search`, `cortex_consolidate`.

## CLI Reference

```bash
cortex              # Project status
cortex --help       # Essential commands
cortex --help --all # All commands
```

**Essential**: `setup`, `status`, `optimize`, `stats`, `hooks`

**Analysis**: `scan`, `secure`, `comply`, `docs`

**Advanced**: `init`, `graph`, `search`, `plan`, `exec`, `verify`, `config`, `relay`, `consolidate`, `interactive`, `daemon`, `dashboard`

## Configuration

Edit `.cortex/config.yaml` or use the CLI:

```yaml
pruning:
  threshold: 5          # Keep top 5% of context
  aggressiveness: 50    # 0-100

decay:
  defaultTTL: 24        # Hours before context starts fading

realtime:
  tokenBudget: 40000
  autoOptimizeThreshold: 60000

agent: claude-code  # auto-detected during setup
```

```bash
cortex config get pruning.threshold
cortex config set pruning.threshold 10
```

## `.cortexignore`

Exclude files or suppress specific rules:

```
# .cortexignore
src/generated/**
src/legacy/** QUAL-001,QUAL-003
```

## CI Integration

```yaml
# GitHub Actions
- run: npx @sparn/cortex secure . --ci --min-grade B
- run: npx @sparn/cortex comply . --ci --framework gdpr
- run: npx @sparn/cortex scan --json -o scan-report.json
```

## Programmatic API

```typescript
import { createSparsePruner, estimateTokens } from '@sparn/cortex';

const pruner = createSparsePruner({ threshold: 5 });
const result = pruner.prune(largeContext, 5);
```

Full API includes: `createKVMemory`, `createBudgetPruner`, `createDependencyGraph`, `createSearchEngine`, `createWorkflowPlanner`, `createDocsGenerator`, `createIncrementalOptimizer`, `createCortexMcpServer`, `runSecureAudit`, `runComplyAudit`, and more.

## See Also

| Package | What it does |
|---|---|
| [`@sparn/cortex-developer-edition`](https://github.com/sparn-labs/cortex-developer-edition) | Everything in cortex + tech debt tracker + full analysis suite (analyze, history, baselines) |
| [`@sparn/cortex-lite`](https://github.com/sparn-labs/cortex-lite) | Lightweight context compression with a native Rust engine — no CLI, just hooks and a programmatic API |

## Development

```bash
git clone https://github.com/sparn-labs/cortex.git
cd cortex
npm install
npm run build
npm test
npm run typecheck
```

## License

MIT
