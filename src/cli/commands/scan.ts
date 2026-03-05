/**
 * Scan Command — Simplified code analysis.
 *
 * Runs 3 analyzers: quality, security, testdocs.
 * No history, no baseline, no dependency graph.
 */

import { resolve } from 'node:path';
import { buildAnalysisContext, getProjectName } from '../../core/analyzers/context-builder.js';
import { createQualityAnalyzer } from '../../core/analyzers/quality-analyzer.js';
import {
  buildReport,
  generateJSONReport,
  generateMarkdownReport,
} from '../../core/analyzers/report-generator.js';
import { computeScore } from '../../core/analyzers/scoring.js';
import { createSecurityAnalyzer } from '../../core/analyzers/security-analyzer.js';
import { createTestDocsAnalyzer } from '../../core/analyzers/testdocs-analyzer.js';
import type {
  AnalysisReport,
  Analyzer,
  AnalyzeThresholds,
  CategoryResult,
} from '../../core/analyzers/types.js';
import { postProcessFindings } from '../../core/analyzers/types.js';

export interface ScanCommandOptions {
  path?: string;
  focus?: string;
  json?: boolean;
  output?: string;
  verbose?: boolean;
  audit?: boolean;
  thresholds?: Partial<AnalyzeThresholds>;
}

export interface ScanCommandResult {
  report: AnalysisReport;
  markdown: string;
  json?: string;
}

const SCAN_ANALYZERS: Array<() => Analyzer> = [
  createQualityAnalyzer,
  createSecurityAnalyzer,
  createTestDocsAnalyzer,
];

export async function scanCommand(options: ScanCommandOptions): Promise<ScanCommandResult> {
  const projectRoot = resolve(options.path || process.cwd());

  // Build analysis context (no graph)
  const context = await buildAnalysisContext(projectRoot, options.thresholds);

  // Run analyzers
  let analyzers = SCAN_ANALYZERS.map((create) => create());

  if (options.focus) {
    const focusCategories = options.focus
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter((c) => ['quality', 'security', 'tests'].includes(c));

    if (focusCategories.length > 0) {
      analyzers = analyzers.filter((a) => focusCategories.includes(a.category));
    }
  }

  const results: CategoryResult[] = [];
  for (const analyzer of analyzers) {
    const raw = await analyzer.analyze(context);
    results.push(postProcessFindings(raw));
  }

  // Compute score
  const score = computeScore(results);

  // Build report
  const projectName = getProjectName(projectRoot);
  const report = buildReport(
    score,
    results,
    projectName,
    projectRoot,
    [...context.stackTags],
    context.files.size,
    0, // totalTokens (no graph)
    0, // entryPoints
    0, // hotPaths
    0, // orphans
    '2.0',
  );

  const markdown = generateMarkdownReport(report, options.verbose);
  const result: ScanCommandResult = { report, markdown };

  if (options.json) {
    result.json = generateJSONReport(report);
  }

  return result;
}
