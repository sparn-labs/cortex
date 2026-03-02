#!/usr/bin/env node
/**
 * PostToolUse Hook - Compresses verbose tool output
 *
 * After tools like Bash, Read, Grep execute, this hook checks if
 * the output is very large and adds a compressed summary as
 * additionalContext so Claude can quickly reference key information.
 *
 * CRITICAL: Always exits 0 (never disrupts Claude Code).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { estimateTokens } from '../utils/tokenizer.js';

const DEBUG = process.env['CORTEX_DEBUG'] === 'true';
const LOG_FILE = process.env['CORTEX_LOG_FILE'] || join(homedir(), '.cortex-hook.log');

// Only add summaries for outputs over this many estimated tokens
const SUMMARY_THRESHOLD = 3000;

// Session stats file for tracking running totals
const SESSION_STATS_FILE = join(homedir(), '.cortex', 'session-stats.json');

interface SessionStats {
  sessionId: string;
  outputsCompressed: number;
  totalTokensBefore: number;
  totalTokensAfter: number;
  lastUpdated: number;
}

function loadSessionStats(sessionId: string): SessionStats {
  try {
    if (existsSync(SESSION_STATS_FILE)) {
      const data = JSON.parse(readFileSync(SESSION_STATS_FILE, 'utf-8')) as SessionStats;
      if (data.sessionId === sessionId) {
        return data;
      }
    }
  } catch {
    // ignore
  }
  return {
    sessionId,
    outputsCompressed: 0,
    totalTokensBefore: 0,
    totalTokensAfter: 0,
    lastUpdated: Date.now(),
  };
}

function saveSessionStats(stats: SessionStats): void {
  try {
    const dir = join(homedir(), '.cortex');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(SESSION_STATS_FILE, JSON.stringify(stats), 'utf-8');
  } catch {
    // ignore
  }
}

function log(message: string): void {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    appendFileSync(LOG_FILE, `[${timestamp}] [post-tool] ${message}\n`);
  }
}

interface HookInput {
  session_id?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_use_id?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
}

function extractText(response: unknown): string {
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object') {
    return JSON.stringify(response);
  }
  return String(response ?? '');
}

/**
 * Summarize large bash output with content-aware strategies
 */
function summarizeBash(text: string, command: string): string {
  const lines = text.split('\n');

  // Check for test results
  if (/\d+ (pass|fail|skip)/i.test(text) || /Tests?:/i.test(text)) {
    const resultLines = lines.filter(
      (l) => /(pass|fail|skip|error|Tests?:|Test Suites?:)/i.test(l) || /^\s*(PASS|FAIL)\s/.test(l),
    );
    if (resultLines.length > 0) {
      return `[cortex] Test output summary (${lines.length} lines):\n${resultLines.slice(0, 15).join('\n')}`;
    }
  }

  // TypeScript errors: group by error code
  if (/TS\d{4,5}:/.test(text)) {
    const errorCodes = new Map<string, number>();
    for (const line of lines) {
      const match = line.match(/TS(\d{4,5}):/);
      if (match?.[1]) {
        const code = `TS${match[1]}`;
        errorCodes.set(code, (errorCodes.get(code) || 0) + 1);
      }
    }
    const totalErrors = Array.from(errorCodes.values()).reduce((a, b) => a + b, 0);
    const codesSummary = Array.from(errorCodes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => `${code}(${count})`)
      .join(', ');
    return `[cortex] TypeScript: ${totalErrors} errors across ${errorCodes.size} codes: ${codesSummary}`;
  }

  // Lint output: aggregate by rule
  if (/\d+ (problem|error|warning|issue)/i.test(text) || /lint/i.test(command)) {
    const rules = new Map<string, number>();
    for (const line of lines) {
      // eslint/biome style: rule-name at end
      const match = line.match(/\s([a-z][\w/.-]+)\s*$/);
      if (match?.[1]?.includes('/')) {
        rules.set(match[1], (rules.get(match[1]) || 0) + 1);
      }
    }
    if (rules.size > 0) {
      const rulesSummary = Array.from(rules.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([rule, count]) => `${rule}(${count})`)
        .join(', ');
      return `[cortex] Lint: ${lines.length} lines, ${rules.size} rules: ${rulesSummary}`;
    }
  }

  // npm/yarn output: summarize package operations
  if (/npm\s+(warn|info|notice)|added\s+\d+\s+packages/i.test(text)) {
    const added = text.match(/added\s+(\d+)\s+packages?/i);
    const removed = text.match(/removed\s+(\d+)\s+packages?/i);
    const updated = text.match(/changed\s+(\d+)\s+packages?/i);
    const audit = text.match(/(\d+)\s+vulnerabilit/i);
    const parts = ['[cortex] npm:'];
    if (added) parts.push(`${added[1]} added`);
    if (removed) parts.push(`${removed[1]} removed`);
    if (updated) parts.push(`${updated[1]} changed`);
    if (audit) parts.push(`${audit[1]} vulnerabilities`);
    if (parts.length > 1) return parts.join(' ');
  }

  // Check for build errors
  if (/(error|warning|failed)/i.test(text)) {
    const errorLines = lines.filter((l) => /(error|warning|failed|fatal)/i.test(l));
    if (errorLines.length > 0) {
      return `[cortex] Build output summary (${errorLines.length} errors/warnings from ${lines.length} lines):\n${errorLines.slice(0, 10).join('\n')}`;
    }
  }

  // Check for git diff
  if (/^diff --git/m.test(text)) {
    const files: string[] = [];
    for (const line of lines) {
      const match = line.match(/^diff --git a\/(.*?) b\/(.*)/);
      if (match?.[2]) files.push(match[2]);
    }
    return `[cortex] Git diff: ${files.length} files changed: ${files.join(', ')}`;
  }

  // JSON responses: show structure
  const trimmed = text.trim();
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 3000) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return `[cortex] JSON array: ${parsed.length} items`;
      }
      const keys = Object.keys(parsed);
      return `[cortex] JSON object: ${keys.length} keys: ${keys.slice(0, 10).join(', ')}`;
    } catch {
      // Not valid JSON, fall through
    }
  }

  // Generic: show line count and first/last few lines
  return `[cortex] Command \`${command}\` produced ${lines.length} lines of output. First 3: ${lines.slice(0, 3).join(' | ')}`;
}

/**
 * Summarize large file read
 */
function summarizeFileRead(text: string, filePath: string): string {
  const lines = text.split('\n');
  const tokens = estimateTokens(text);

  // Find key structures
  const exports = lines.filter((l) => /^export\s/.test(l.trim()));
  const functions = lines.filter((l) => /function\s+\w+/.test(l));
  const classes = lines.filter((l) => /class\s+\w+/.test(l));

  const parts = [`[cortex] File ${filePath}: ${lines.length} lines, ~${tokens} tokens.`];

  if (exports.length > 0) {
    parts.push(
      `Exports: ${exports
        .slice(0, 5)
        .map((e) => e.trim().substring(0, 60))
        .join('; ')}`,
    );
  }
  if (functions.length > 0) {
    parts.push(
      `Functions: ${functions
        .slice(0, 5)
        .map((f) => f.trim().substring(0, 40))
        .join(', ')}`,
    );
  }
  if (classes.length > 0) {
    parts.push(`Classes: ${classes.map((c) => c.trim().substring(0, 40)).join(', ')}`);
  }

  return parts.join(' ');
}

/**
 * Summarize grep/search results
 */
function summarizeSearch(text: string, pattern: string): string {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const fileMap = new Map<string, number>();

  for (const line of lines) {
    const match = line.match(/^(.*?):\d+:/);
    if (match?.[1]) {
      fileMap.set(match[1], (fileMap.get(match[1]) || 0) + 1);
    }
  }

  if (fileMap.size > 0) {
    const summary = Array.from(fileMap.entries())
      .slice(0, 5)
      .map(([f, c]) => `${f} (${c})`)
      .join(', ');
    return `[cortex] Search for "${pattern}": ${lines.length} matches across ${fileMap.size} files. Top files: ${summary}`;
  }

  return `[cortex] Search for "${pattern}": ${lines.length} result lines`;
}

/**
 * Summarize glob results by grouping by directory
 */
function summarizeGlob(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const dirMap = new Map<string, number>();

  for (const line of lines) {
    const parts = line.trim().split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    dirMap.set(dir, (dirMap.get(dir) || 0) + 1);
  }

  const dirSummary = Array.from(dirMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([dir, count]) => `${dir}/ (${count})`)
    .join(', ');

  return `[cortex] Glob: ${lines.length} files across ${dirMap.size} directories. Top: ${dirSummary}`;
}

async function main(): Promise<void> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf-8');

    let input: HookInput;
    try {
      input = JSON.parse(raw);
    } catch {
      log('Failed to parse JSON input');
      process.exit(0);
      return;
    }

    const toolName = input.tool_name ?? 'unknown';
    const text = extractText(input.tool_response);
    const tokens = estimateTokens(text);

    log(`Tool: ${toolName}, response tokens: ~${tokens}`);

    if (tokens < SUMMARY_THRESHOLD) {
      log('Under threshold, no summary needed');
      process.exit(0);
      return;
    }

    let summary = '';

    switch (toolName) {
      case 'Bash': {
        const command = String(input.tool_input?.['command'] ?? '');
        summary = summarizeBash(text, command);
        break;
      }
      case 'Read': {
        const filePath = String(input.tool_input?.['file_path'] ?? '');
        summary = summarizeFileRead(text, filePath);
        break;
      }
      case 'Grep': {
        const pattern = String(input.tool_input?.['pattern'] ?? '');
        summary = summarizeSearch(text, pattern);
        break;
      }
      case 'Glob': {
        summary = summarizeGlob(text);
        break;
      }
      default: {
        const lines = text.split('\n');
        summary = `[cortex] ${toolName} output: ${lines.length} lines, ~${tokens} tokens`;
        break;
      }
    }

    if (summary) {
      // Estimate compressed token count from the summary
      const summaryTokens = estimateTokens(summary);
      const reduction = tokens > 0 ? ((tokens - summaryTokens) / tokens) * 100 : 0;

      // Add compression metric line
      const compressionLine = `[cortex] ${toolName} output: ${tokens}→${summaryTokens} tokens (${reduction.toFixed(0)}% reduction)`;

      // Track session stats
      const sessionId = input.session_id || 'unknown';
      const stats = loadSessionStats(sessionId);
      stats.outputsCompressed += 1;
      stats.totalTokensBefore += tokens;
      stats.totalTokensAfter += summaryTokens;
      stats.lastUpdated = Date.now();
      saveSessionStats(stats);

      log(`Summary: ${summary.substring(0, 100)}`);
      const fullContext = `${compressionLine}\n${summary}`;
      const output = JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: fullContext,
        },
      });
      process.stdout.write(output);
    }

    process.exit(0);
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(0);
  }
}

main();
