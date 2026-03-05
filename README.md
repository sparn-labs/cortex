# Cortex

Simple code scanning for everyone.

One command to check your code for security vulnerabilities, regulatory compliance issues, and quality problems. No setup complexity, no native dependencies, no jargon.

## Quick Start

```bash
npm install -g @sparn/cortex
cd your-project
cortex setup
```

That's it. Run your first scan:

```bash
cortex scan
```

You'll get a letter grade (A through F) with specific, actionable findings.

## Commands

### `cortex setup`

One-command onboarding. Initializes the `.cortex/` config directory and auto-generates a `CLAUDE.md` for your project:

```bash
cortex setup              # Init config + generate docs
cortex setup --skip-docs  # Init config only
cortex setup --force      # Overwrite existing config
```

> `cortex init` does the same as `cortex setup --skip-docs` — it only creates `.cortex/config.yaml` without generating docs.

### `cortex scan`

Run quality, security, and test coverage checks at once:

```bash
cortex scan                    # Full scan
cortex scan --focus quality    # Just quality
cortex scan --focus security   # Just security
cortex scan --json             # Machine-readable output
cortex scan -o report.md       # Write report to file
cortex scan -v                 # Show all findings
```

### `cortex secure`

Full 11-layer OWASP security audit with per-layer scoring:

```bash
cortex secure .                          # Full audit
cortex secure . --fix                    # Auto-fix where possible
cortex secure . --quick                  # Faster scan, fewer patterns
cortex secure . --layer injection        # Single layer only
cortex secure . --compliance owasp       # Map to framework (owasp|pci|hipaa)
cortex secure . -o json --output-file report.json
cortex secure . -v                       # Detailed findings
```

**CI mode:**

```bash
cortex secure . --ci                     # Fail on critical findings
cortex secure . --ci --min-grade B       # Fail if below grade B
cortex secure . --ci --fail-on high      # Fail on high+ severity
```

### `cortex comply`

8-layer regulatory compliance check covering GDPR, CCPA, HIPAA, SOC2, and PCI-DSS:

```bash
cortex comply .                          # Full audit
cortex comply . --framework gdpr         # Focus on GDPR
cortex comply . --quick                  # Faster scan
cortex comply . --layer encryption       # Single layer only
cortex comply . -o json --output-file report.json
cortex comply . -v                       # Detailed findings
```

**CI mode:**

```bash
cortex comply . --ci                     # Fail on critical findings
cortex comply . --ci --min-grade B       # Fail if below grade B
cortex comply . --ci --fail-on high      # Fail on high+ severity
```

### `cortex docs`

Auto-generate a `CLAUDE.md` file describing your project structure, stack, scripts, and key files:

```bash
cortex docs                # Generate CLAUDE.md
cortex docs -o docs/AI.md  # Custom output path
cortex docs --json         # Output structure as JSON
```

### `cortex debt`

Track technical debt with severity levels and due dates:

```bash
cortex debt add "Fix N+1 queries" --severity P0 --due 2026-04-01 --files src/db.ts
cortex debt list                 # Show all items
cortex debt list --overdue       # Show overdue only
cortex debt start <id>           # Mark as in progress
cortex debt resolve <id>         # Mark as resolved
cortex debt stats                # Show debt statistics
```

### `cortex config`

View or modify `.cortex/config.yaml`:

```bash
cortex config                    # Show full config
cortex config get ui.colors      # Get a value
cortex config set ui.verbose true  # Set a value
cortex config --json             # Output as JSON
```

### `cortex` (no args)

Shows project status: initialization state, config presence, debt tracker status, and available commands.

## `.cortexignore`

Exclude files or suppress specific rules:

```
# .cortexignore
src/generated/**
src/legacy/** QUAL-001,QUAL-003
```

## CI Integration

Add to your pipeline:

```yaml
# GitHub Actions example
- run: npx @sparn/cortex secure . --ci --min-grade B
- run: npx @sparn/cortex comply . --ci --framework gdpr
```

Exit codes: `0` = pass, `1` = findings exceed threshold.

## For Developers

Need advanced features like memory optimization, dependency graphs, hooks, MCP servers, or background daemons? See [@sparn/cortex-developer-edition](https://www.npmjs.com/package/@sparn/cortex-developer-edition).

## Development

```bash
git clone https://github.com/sparn-labs/cortex.git
cd cortex
npm install
npm run build
npm test
npm run lint
npm run typecheck
```

## License

MIT
