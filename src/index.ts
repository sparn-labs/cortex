/**
 * @sparn/cortex — Simple code scanning for everyone
 *
 * Public API surface for the easy edition.
 */

export { buildAnalysisContext, getProjectName } from './core/analyzers/context-builder.js';
export { createCortexIgnore } from './core/analyzers/cortexignore.js';
// ─── Analyzers ───
export { createQualityAnalyzer } from './core/analyzers/quality-analyzer.js';
export {
  buildReport,
  generateJSONReport,
  generateMarkdownReport,
} from './core/analyzers/report-generator.js';
export { computeScore } from './core/analyzers/scoring.js';
export { createSecurityAnalyzer } from './core/analyzers/security-analyzer.js';
export { createTestDocsAnalyzer } from './core/analyzers/testdocs-analyzer.js';
export type {
  AnalysisCategory,
  AnalysisContext,
  AnalysisReport,
  Analyzer,
  AnalyzerFinding,
  AnalyzeThresholds,
  CategoryResult,
  Grade,
  ScoreResult,
  Severity,
} from './core/analyzers/types.js';
export { isLineSuppressed, postProcessFindings } from './core/analyzers/types.js';
// ─── Comply audit ───
export { runComplyAudit } from './core/comply/engine.js';
export { generateComplyJSON, generateComplyMarkdown } from './core/comply/report.js';
export { computeComplyScore } from './core/comply/scorer.js';
export type {
  ComplyFinding,
  ComplyGrade,
  ComplyReport,
} from './core/comply/types.js';
export type {
  DebtSeverity,
  DebtStats,
  DebtStatus,
  DebtTracker,
  TechDebt,
} from './core/debt-tracker.js';
// ─── Debt tracker ───
export { createDebtTracker } from './core/debt-tracker.js';
export type { DocsGenerator, DocsGeneratorConfig } from './core/docs-generator.js';
// ─── Docs generator ───
export { createDocsGenerator } from './core/docs-generator.js';
// ─── Secure audit ───
export { runSecureAudit } from './core/secure/engine.js';
export { generateSecureJSON, generateSecureMarkdown } from './core/secure/report.js';
export { computeSecureScore } from './core/secure/scorer.js';
export type {
  SecureFinding,
  SecureGrade,
  SecureReport,
} from './core/secure/types.js';
// ─── Config ───
export type { CortexConfig, UIConfig } from './types/config.js';
export { DEFAULT_CONFIG } from './types/config.js';
// ─── Utils ───
export { hashContent } from './utils/hash.js';
export type { Logger, LogLevel } from './utils/logger.js';
export { createLogger } from './utils/logger.js';
