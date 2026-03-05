/**
 * Config Command - View or modify configuration
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { load as parseYAML, dump as stringifyYAML } from 'js-yaml';
import type { CortexConfig } from '../../types/config.js';

export interface ConfigCommandOptions {
  /** Path to config.yaml file */
  configPath: string;
  /** Subcommand: get or set */
  subcommand?: 'get' | 'set';
  /** Config key (dotted path) */
  key?: string;
  /** Config value (for set) */
  value?: string;
  /** Output JSON format */
  json?: boolean;
}

export interface ConfigCommandResult {
  success: boolean;
  message?: string;
  error?: string;
  value?: unknown;
  editorPath?: string;
  json?: string;
}

/**
 * Valid config keys with their validation rules
 */
const CONFIG_SCHEMA: Record<
  string,
  {
    path: string[];
    validate: (value: unknown) => boolean;
    errorMessage: string;
    parse: (value: string) => unknown;
  }
> = {
  'ui.colors': {
    path: ['ui', 'colors'],
    validate: (v) => typeof v === 'boolean',
    errorMessage: 'colors must be true or false',
    parse: (v) => v === 'true',
  },
  'ui.verbose': {
    path: ['ui', 'verbose'],
    validate: (v) => typeof v === 'boolean',
    errorMessage: 'verbose must be true or false',
    parse: (v) => v === 'true',
  },
};

export async function configCommand(options: ConfigCommandOptions): Promise<ConfigCommandResult> {
  const { configPath, subcommand, key, value, json } = options;

  try {
    const configYAML = readFileSync(configPath, 'utf-8');
    const config = parseYAML(configYAML) as CortexConfig;

    if (!subcommand) {
      if (json) {
        return { success: true, json: JSON.stringify(config, null, 2) };
      }
      return { success: true, editorPath: configPath, message: `Config file: ${configPath}` };
    }

    if (subcommand === 'get') {
      if (!key) return { success: false, error: 'Key required for get command' };

      const schema = CONFIG_SCHEMA[key];
      if (!schema) {
        return {
          success: false,
          error: `Invalid key: ${key}. Valid keys: ${Object.keys(CONFIG_SCHEMA).join(', ')}`,
        };
      }

      const retrievedValue = getNestedValue(
        config as unknown as Record<string, unknown>,
        schema.path,
      );

      if (json) {
        return {
          success: true,
          value: retrievedValue,
          json: JSON.stringify({ key, value: retrievedValue }, null, 2),
        };
      }

      return { success: true, value: retrievedValue, message: String(retrievedValue) };
    }

    if (subcommand === 'set') {
      if (!key) return { success: false, error: 'Key required for set command' };
      if (value === undefined) return { success: false, error: 'Value required for set command' };

      const schema = CONFIG_SCHEMA[key];
      if (!schema) {
        return {
          success: false,
          error: `Invalid key: ${key}. Valid keys: ${Object.keys(CONFIG_SCHEMA).join(', ')}`,
        };
      }

      const parsedValue = schema.parse(value);
      if (!schema.validate(parsedValue)) {
        return { success: false, error: `Invalid value for ${key}: ${schema.errorMessage}` };
      }

      setNestedValue(config as unknown as Record<string, unknown>, schema.path, parsedValue);
      const updatedYAML = stringifyYAML(config);
      writeFileSync(configPath, updatedYAML, 'utf-8');

      return { success: true, message: `Config updated: ${key} = ${parsedValue}` };
    }

    return { success: false, error: `Unknown subcommand: ${subcommand}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && !Array.isArray(current) && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!key) continue;
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = path[path.length - 1];
  if (lastKey) {
    current[lastKey] = value;
  }
}
