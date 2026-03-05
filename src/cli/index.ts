#!/usr/bin/env node

/**
 * Cortex CLI — Simple code scanning for everyone.
 * 8 commands: setup, init, scan, secure, comply, docs, debt, config
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { getBanner } from './ui/banner.js';

function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return '2.0.0';
  }
}

const VERSION = getVersion();

/**
 * Global error handler
 */
async function handleError(error: Error | unknown, context?: string): Promise<void> {
  const { errorRed, synapseViolet } = await import('./ui/colors.js');
  const errorMsg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(errorRed('\n✗ Error:'), errorMsg);
  if (context) console.error(errorRed('Context:'), context);

  if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
    console.error(synapseViolet('\n→ Run: cortex init\n'));
  }

  if (process.env['CORTEX_DEBUG'] === 'true' && stack) {
    console.error(errorRed('\nStack trace:'));
    console.error(stack);
  } else {
    console.error('  Run with CORTEX_DEBUG=true for stack trace\n');
  }

  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  void handleError(reason, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  void handleError(error, 'Uncaught exception');
});

const program = new Command();

program
  .name('cortex')
  .description('Simple code scanning — security, compliance, and quality analysis')
  .version(VERSION, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help for command')
  .enablePositionalOptions();

// ─── setup ───

program
  .command('setup')
  .description('One-command onboarding — creates .cortex/ and generates CLAUDE.md')
  .option('-f, --force', 'Force overwrite if .cortex/ exists')
  .option('--skip-docs', 'Skip CLAUDE.md generation')
  .action(async (opts) => {
    const { brainPink, neuralCyan, dim, errorRed } = await import('./ui/colors.js');
    const { createInitSpinner } = await import('./ui/progress.js');
    const { setupCommand } = await import('./commands/setup.js');

    const spinner = createInitSpinner('Setting up Cortex...');
    spinner.start();

    try {
      const result = await setupCommand({
        force: opts.force,
        skipDocs: opts.skipDocs,
      });

      spinner.stop();
      console.log(getBanner(VERSION));
      console.log(`${brainPink('━'.repeat(60))}`);

      for (const step of result.steps) {
        const icon =
          step.status === 'success'
            ? neuralCyan('✓')
            : step.status === 'skipped'
              ? dim('○')
              : errorRed('✗');
        console.log(`  ${icon} ${step.message}`);
      }

      console.log(
        `\n  ${brainPink('→')} Run ${neuralCyan("'cortex scan .'")} to analyze your code!`,
      );
      console.log(`${brainPink('━'.repeat(60))}\n`);
    } catch (error) {
      spinner.fail('Setup failed');
      await handleError(error, 'setup');
    }
  });

// ─── init ───

program
  .command('init')
  .description('Initialize .cortex/ directory with configuration')
  .option('-f, --force', 'Force overwrite if .cortex/ exists')
  .action(async (opts) => {
    const { createInitSpinner } = await import('./ui/progress.js');
    const { initCommand, displayInitSuccess } = await import('./commands/init.js');

    const spinner = createInitSpinner('Initializing Cortex...');
    spinner.start();

    try {
      const result = await initCommand({ force: opts.force });
      spinner.stop();
      displayInitSuccess(result);
    } catch (error) {
      spinner.fail('Initialization failed');
      await handleError(error, 'init');
    }
  });

// ─── scan ───

program
  .command('scan [path]')
  .description('Scan code for quality and security issues')
  .option('--focus <categories>', 'Focus on specific categories (quality,security,tests)')
  .option('--json', 'Output JSON format')
  .option('-o, --output <file>', 'Write report to file')
  .option('-v, --verbose', 'Show detailed findings')
  .action(async (path, opts) => {
    const { brainPink, neuralCyan, synapseViolet, errorRed, dim, bold } = await import(
      './ui/colors.js'
    );
    const { createOptimizeSpinner } = await import('./ui/progress.js');
    const { scanCommand } = await import('./commands/scan.js');

    const spinner = createOptimizeSpinner('Scanning codebase...');
    spinner.start();

    try {
      const result = await scanCommand({
        path,
        focus: opts.focus,
        json: opts.json,
        output: opts.output,
        verbose: opts.verbose,
      });

      spinner.stop();

      if (opts.json) {
        console.log(result.json);
        return;
      }

      if (opts.output) {
        writeFileSync(opts.output, result.markdown, 'utf-8');
        console.log(neuralCyan(`Report written to ${opts.output}`));
        return;
      }

      // Display report
      const { report } = result;
      const gradeColor =
        report.score.totalScore >= 80
          ? neuralCyan
          : report.score.totalScore >= 50
            ? synapseViolet
            : errorRed;

      console.log(`\n${brainPink('━'.repeat(60))}`);
      console.log(bold('  CORTEX SCAN'));
      console.log(brainPink('━'.repeat(60)));
      console.log(
        `\n  Score: ${gradeColor(`${report.score.totalScore.toFixed(1)}/100`)}  Grade: ${gradeColor(report.score.grade)}`,
      );
      console.log(
        `  Project: ${dim(report.project.name)}  Files: ${dim(String(report.metrics.totalFiles))}`,
      );

      // Category breakdown
      console.log(`\n${bold('  Categories:')}`);
      for (const cat of report.categoryResults) {
        if (cat.isNA) continue;
        const catColor =
          cat.score >= cat.maxPoints * 0.8
            ? neuralCyan
            : cat.score >= cat.maxPoints * 0.5
              ? synapseViolet
              : errorRed;
        console.log(
          `  ${cat.name.padEnd(30)} ${catColor(`${cat.score.toFixed(1)}/${cat.maxPoints}`)}  (${cat.findings.length} findings)`,
        );
      }

      // Top findings
      const topFindings = report.categoryResults
        .flatMap((c) => c.findings)
        .filter((f) => f.severity === 'critical' || f.severity === 'major')
        .slice(0, 5);
      if (topFindings.length > 0) {
        console.log(`\n${bold('  Top Issues:')}`);
        for (const f of topFindings) {
          const sevColor = f.severity === 'critical' ? errorRed : synapseViolet;
          console.log(
            `  ${sevColor(f.severity.toUpperCase().padEnd(8))} ${f.title}${f.filePath ? dim(` (${f.filePath})`) : ''}`,
          );
        }
      }

      console.log(`\n${brainPink('━'.repeat(60))}\n`);
    } catch (error) {
      spinner.fail('Scan failed');
      await handleError(error, 'scan');
    }
  });

// ─── secure ───

program
  .command('secure [path]')
  .description('Full OWASP security audit (11 defense layers)')
  .option('--fix', 'Auto-fix issues where possible')
  .option('--ci', 'CI mode — exit with code 1 on failures')
  .option('--min-grade <grade>', 'Minimum grade required (CI mode)')
  .option('--fail-on <severity>', 'Fail on severity threshold (critical|high|medium)')
  .option('--layer <layer>', 'Run specific layer only')
  .option('-o, --output <format>', 'Output format: markdown|json')
  .option('--output-file <file>', 'Write report to file')
  .option('--quick', 'Quick scan (fewer patterns)')
  .option('--compliance <framework>', 'Map to compliance framework (owasp|pci|hipaa)')
  .option('-v, --verbose', 'Show detailed findings')
  .action(async (path, opts) => {
    const colors = await import('./ui/colors.js');
    const { createOptimizeSpinner } = await import('./ui/progress.js');
    const { secureCommand, displaySecureReport } = await import('./commands/secure.js');

    const spinner = createOptimizeSpinner('Running security audit...');
    spinner.start();

    try {
      const result = await secureCommand({
        path,
        fix: opts.fix,
        ci: opts.ci,
        minGrade: opts.minGrade,
        failOn: opts.failOn,
        layer: opts.layer,
        output: opts.output,
        outputFile: opts.outputFile,
        quick: opts.quick,
        compliance: opts.compliance,
        verbose: opts.verbose,
      });

      spinner.stop();

      if (opts.output === 'json') {
        console.log(result.json);
      } else {
        displaySecureReport(result, colors);
      }

      if (result.exitCode !== 0) {
        process.exit(result.exitCode);
      }
    } catch (error) {
      spinner.fail('Security audit failed');
      await handleError(error, 'secure');
    }
  });

// ─── comply ───

program
  .command('comply [path]')
  .description('Regulatory compliance audit (GDPR, CCPA, HIPAA, SOC2)')
  .option('--ci', 'CI mode — exit with code 1 on failures')
  .option('--min-grade <grade>', 'Minimum grade required (CI mode)')
  .option('--fail-on <severity>', 'Fail on severity threshold (critical|high|medium)')
  .option('--framework <framework>', 'Focus on specific framework (gdpr|ccpa|hipaa|soc2)')
  .option('--layer <layer>', 'Run specific layer only')
  .option('-o, --output <format>', 'Output format: markdown|json')
  .option('--output-file <file>', 'Write report to file')
  .option('--quick', 'Quick scan (fewer patterns)')
  .option('-v, --verbose', 'Show detailed findings')
  .action(async (path, opts) => {
    const colors = await import('./ui/colors.js');
    const { createOptimizeSpinner } = await import('./ui/progress.js');
    const { complyCommand, displayComplyReport } = await import('./commands/comply.js');

    const spinner = createOptimizeSpinner('Running compliance audit...');
    spinner.start();

    try {
      const result = await complyCommand({
        path,
        ci: opts.ci,
        minGrade: opts.minGrade,
        failOn: opts.failOn,
        framework: opts.framework,
        layer: opts.layer,
        output: opts.output,
        outputFile: opts.outputFile,
        quick: opts.quick,
        verbose: opts.verbose,
      });

      spinner.stop();

      if (opts.output === 'json') {
        console.log(result.json);
      } else {
        displayComplyReport(result, colors);
      }

      if (result.exitCode !== 0) {
        process.exit(result.exitCode);
      }
    } catch (error) {
      spinner.fail('Compliance audit failed');
      await handleError(error, 'comply');
    }
  });

// ─── docs ───

program
  .command('docs')
  .description('Auto-generate CLAUDE.md for your project')
  .option('-o, --output <file>', 'Output file path (default: CLAUDE.md)')
  .option('--json', 'Output JSON format')
  .action(async (opts) => {
    const { neuralCyan } = await import('./ui/colors.js');
    const { createInitSpinner } = await import('./ui/progress.js');
    const { docsCommand } = await import('./commands/docs.js');

    const spinner = createInitSpinner('Generating CLAUDE.md...');
    spinner.start();

    try {
      const result = await docsCommand({
        output: opts.output,
        json: opts.json,
      });

      spinner.stop();

      if (opts.json) {
        console.log(result.content);
      } else {
        console.log(neuralCyan('✓'), result.message);
      }
    } catch (error) {
      spinner.fail('Docs generation failed');
      await handleError(error, 'docs');
    }
  });

// ─── debt ───

program
  .command('debt <subcommand> [description]')
  .description('Track technical debt (add|list|resolve|start|stats)')
  .option('--severity <level>', 'Debt severity: P0|P1|P2 (default: P1)')
  .option('--due <date>', 'Repayment date (ISO format)')
  .option('--files <files...>', 'Affected files')
  .option('--token-cost <cost>', 'Estimated token cost')
  .option('--id <id>', 'Debt ID (for resolve/start)')
  .option('--overdue', 'Show only overdue debts (for list)')
  .option('--json', 'Output JSON format')
  .action(async (subcommand, description, opts) => {
    const { neuralCyan, synapseViolet, errorRed, dim, brainPink, bold } = await import(
      './ui/colors.js'
    );
    const { debtCommand } = await import('./commands/debt.js');

    try {
      const result = await debtCommand({
        subcommand,
        description,
        severity: opts.severity,
        due: opts.due,
        files: opts.files,
        tokenCost: opts.tokenCost ? Number(opts.tokenCost) : undefined,
        id: opts.id,
        overdue: opts.overdue,
        json: opts.json,
      });

      if (opts.json && result.json) {
        console.log(result.json);
        return;
      }

      // Format output based on subcommand
      if (subcommand === 'list' && result.debts) {
        console.log(`\n${brainPink('━'.repeat(60))}`);
        console.log(bold(`  TECH DEBT (${result.debts.length} items)`));
        console.log(brainPink('━'.repeat(60)));

        for (const d of result.debts) {
          const sevColor =
            d.severity === 'P0' ? errorRed : d.severity === 'P1' ? synapseViolet : dim;
          const isOverdue = d.status !== 'resolved' && d.repayment_date < Date.now();
          const due = new Date(d.repayment_date).toLocaleDateString();
          console.log(
            `  ${sevColor(d.severity)} ${d.id} ${d.description}${isOverdue ? errorRed(' OVERDUE') : ''} ${dim(`due: ${due}`)}`,
          );
        }

        console.log(`\n${brainPink('━'.repeat(60))}\n`);
      } else if (subcommand === 'stats' && result.stats) {
        console.log(`\n${brainPink('━'.repeat(60))}`);
        console.log(bold('  DEBT STATS'));
        console.log(brainPink('━'.repeat(60)));
        console.log(
          `  Total: ${result.stats.total}  Open: ${result.stats.open}  In Progress: ${result.stats.in_progress}  Resolved: ${result.stats.resolved}`,
        );
        console.log(
          `  Overdue: ${result.stats.overdue > 0 ? errorRed(String(result.stats.overdue)) : neuralCyan('0')}`,
        );
        console.log(`  On-time rate: ${(result.stats.repaymentRate * 100).toFixed(0)}%`);
        console.log(`\n${brainPink('━'.repeat(60))}\n`);
      } else {
        console.log(neuralCyan('✓'), result.message);
      }
    } catch (error) {
      await handleError(error, 'debt');
    }
  });

// ─── config ───

program
  .command('config [subcommand] [key] [value]')
  .description('View or modify Cortex configuration')
  .option('--json', 'Output JSON format')
  .action(async (subcommand, key, value, opts) => {
    const { neuralCyan, errorRed, dim } = await import('./ui/colors.js');
    const { configCommand } = await import('./commands/config.js');

    const cortexDir = resolve(process.cwd(), '.cortex');
    const configPath = resolve(cortexDir, 'config.yaml');

    if (!existsSync(configPath)) {
      console.error(errorRed('✗ No .cortex/ found. Run: cortex init'));
      process.exit(1);
    }

    try {
      const result = await configCommand({
        configPath,
        subcommand: subcommand as 'get' | 'set' | undefined,
        key,
        value,
        json: opts.json,
      });

      if (!result.success) {
        console.error(errorRed('✗'), result.error);
        process.exit(1);
      }

      if (result.json) {
        console.log(result.json);
      } else if (result.editorPath) {
        console.log(dim(`Config: ${result.editorPath}`));
        const content = readFileSync(result.editorPath, 'utf-8');
        console.log(content);
      } else {
        console.log(neuralCyan('✓'), result.message);
      }
    } catch (error) {
      await handleError(error, 'config');
    }
  });

// ─── status (default) ───

program
  .command('status', { isDefault: true })
  .description('Show Cortex status')
  .action(async () => {
    const { brainPink, neuralCyan, dim } = await import('./ui/colors.js');
    const cwd = process.cwd();
    const cortexDir = resolve(cwd, '.cortex');
    const initialized = existsSync(cortexDir);

    console.log(getBanner(VERSION));
    console.log(
      `  ${neuralCyan('Status:')} ${initialized ? neuralCyan('Initialized') : dim('Not initialized')}`,
    );
    console.log(`  ${neuralCyan('Project:')} ${dim(cwd)}`);

    if (initialized) {
      const configExists = existsSync(resolve(cortexDir, 'config.yaml'));
      const debtExists = existsSync(resolve(cortexDir, 'debt.json'));
      console.log(`  Config: ${configExists ? '✓' : '✗'}`);
      console.log(`  Debt tracker: ${debtExists ? '✓' : '✗ (run cortex debt add ...)'}`);
    }

    console.log(brainPink(`\n  Commands: scan | secure | comply | docs | debt\n`));
  });

// Show banner on version
program.on('option:version', () => {
  console.log(getBanner(VERSION));
  process.exit(0);
});

// Parse arguments
program.parse();
