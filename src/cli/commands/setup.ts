/**
 * Setup command — One-command setup for Cortex.
 *
 * Automates the onboarding flow:
 * 1. Initializes .cortex/ directory with auto-detected config
 * 2. Generates CLAUDE.md
 * 3. Prints summary
 */

import { initCommand } from './init.js';

export interface SetupOptions {
  /** Force overwrite if .cortex/ exists */
  force?: boolean;
  /** Current working directory */
  cwd?: string;
  /** Skip CLAUDE.md generation */
  skipDocs?: boolean;
}

export interface SetupStep {
  name: string;
  status: 'success' | 'skipped' | 'failed';
  message: string;
}

export interface SetupResult {
  steps: SetupStep[];
  configPath: string;
  durationMs: number;
}

export async function setupCommand(options: SetupOptions = {}): Promise<SetupResult> {
  const startTime = Date.now();
  const steps: SetupStep[] = [];

  // Step 1: Initialize .cortex/
  let configPath = '';
  try {
    const initResult = await initCommand({ force: options.force, cwd: options.cwd });
    configPath = initResult.configPath;
    steps.push({
      name: 'init',
      status: 'success',
      message: `Initialized .cortex/ (${initResult.durationMs}ms)`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    steps.push({ name: 'init', status: 'failed', message: msg });
    return {
      steps,
      configPath,
      durationMs: Date.now() - startTime,
    };
  }

  // Step 2: Generate CLAUDE.md
  if (options.skipDocs) {
    steps.push({ name: 'docs', status: 'skipped', message: 'CLAUDE.md generation skipped' });
  } else {
    try {
      const { docsCommand } = await import('./docs.js');
      const docsResult = await docsCommand({});
      steps.push({
        name: 'docs',
        status: 'success',
        message: docsResult.message || 'CLAUDE.md generated',
      });
    } catch (error) {
      steps.push({
        name: 'docs',
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    steps,
    configPath,
    durationMs: Date.now() - startTime,
  };
}
