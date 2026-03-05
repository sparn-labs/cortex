/**
 * Docs Command - Auto-generate CLAUDE.md
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDocsGenerator } from '../../core/docs-generator.js';

export interface DocsCommandOptions {
  output?: string;
  json?: boolean;
}

export interface DocsCommandResult {
  content: string;
  outputPath?: string;
  message: string;
}

export async function docsCommand(options: DocsCommandOptions): Promise<DocsCommandResult> {
  const projectRoot = resolve(process.cwd());

  const generator = createDocsGenerator({ projectRoot });
  const content = await generator.generate();

  if (options.json) {
    return {
      content,
      message: `CLAUDE.md generated (${content.split('\n').length} lines)`,
    };
  }

  const outputPath = options.output || resolve(projectRoot, 'CLAUDE.md');
  writeFileSync(outputPath, content, 'utf-8');

  return {
    content,
    outputPath,
    message: `CLAUDE.md generated at ${outputPath} (${content.split('\n').length} lines)`,
  };
}
