/**
 * Configuration types for Cortex (Easy Edition).
 */

/**
 * UI configuration.
 */
export interface UIConfig {
  /** Enable colored output (default: true) */
  colors: boolean;

  /** Verbose logging (default: false) */
  verbose: boolean;
}

/**
 * Scan command configuration.
 */
export interface ScanConfig {
  thresholds?: {
    maxCyclomaticComplexity?: number;
    maxFunctionLength?: number;
    maxFileLength?: number;
    minTestCoverage?: number;
  };
  secretsIgnorePatterns?: string[];
  excludePatterns?: string[];
}

/**
 * Complete Cortex configuration.
 */
export interface CortexConfig {
  ui: UIConfig;
  /** Scan command settings */
  scan?: ScanConfig;
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: CortexConfig = {
  ui: {
    colors: true,
    verbose: false,
  },
};
