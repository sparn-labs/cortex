#!/usr/bin/env node
/**
 * Postinstall script for @sparn/cortex
 * Prints a getting-started message.
 */

function main() {
  // Skip in CI environments
  if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) return;

  console.log('');
  console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[35m  @sparn/cortex\x1b[0m — Simple code scanning for everyone');
  console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('');
  console.log('  \x1b[36mQuick Start:\x1b[0m');
  console.log('    $ cortex setup        # One-command setup');
  console.log('    $ cortex scan         # Code quality scan');
  console.log('    $ cortex secure       # Security audit');
  console.log('    $ cortex comply       # Compliance audit');
  console.log('');
  console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('');
}

main();
