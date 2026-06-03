'use strict';

// Minimal zero-dependency test runner: discovers every *.test.js file in this
// directory and runs each in its own Node process. A non-zero exit from any
// file fails the whole run. Used by `npm test` and CI.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

if (files.length === 0) {
  console.error('No *.test.js files found in', dir);
  process.exit(1);
}

let failed = 0;
for (const f of files) {
  process.stdout.write(`\n── ${f} ──\n`);
  try {
    execFileSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  } catch (e) {
    failed++;
    console.error(`✗ ${f} failed`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${files.length} test file(s) failed`);
  process.exit(1);
}
console.log(`\n✓ All ${files.length} test file(s) passed`);
