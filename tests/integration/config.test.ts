/**
 * Integration tests for config command
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configCommand } from '../../src/cli/commands/config.js';

describe('Config Command Integration Tests', () => {
  const testDir = join(process.cwd(), '.test-config-integration');
  const cortexDir = join(testDir, '.cortex');
  const configPath = join(cortexDir, 'config.yaml');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(cortexDir, { recursive: true });

    const defaultConfig = `# Cortex Configuration
ui:
  colors: true
  verbose: false
`;
    writeFileSync(configPath, defaultConfig, 'utf-8');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should get config value by key', async () => {
    const result = await configCommand({
      configPath,
      subcommand: 'get',
      key: 'ui.colors',
    });

    expect(result.success).toBe(true);
    expect(result.value).toBe(true);
  });

  it('should set config value and update YAML', async () => {
    const result = await configCommand({
      configPath,
      subcommand: 'set',
      key: 'ui.verbose',
      value: 'true',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('ui.verbose');

    const updatedConfig = readFileSync(configPath, 'utf-8');
    expect(updatedConfig).toContain('verbose: true');
  });

  it('should reject invalid key', async () => {
    const result = await configCommand({
      configPath,
      subcommand: 'set',
      key: 'invalid.key',
      value: '10',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid.key');
  });

  it('should return editor path when no subcommand', async () => {
    const result = await configCommand({ configPath });

    expect(result.success).toBe(true);
    expect(result.editorPath).toBe(configPath);
  });

  it('should output JSON format when flag set', async () => {
    const result = await configCommand({
      configPath,
      subcommand: 'get',
      key: 'ui.colors',
      json: true,
    });

    expect(result.success).toBe(true);
    expect(result.json).toBeDefined();

    const parsed = JSON.parse(result.json ?? '{}');
    expect(parsed.key).toBe('ui.colors');
    expect(parsed.value).toBe(true);
  });

  it('should output entire config as JSON', async () => {
    const result = await configCommand({
      configPath,
      json: true,
    });

    expect(result.success).toBe(true);
    expect(result.json).toBeDefined();

    const parsed = JSON.parse(result.json ?? '{}');
    expect(parsed.ui.colors).toBe(true);
  });
});
