#!/usr/bin/env node
// Runs the node:test suite. The strip-types flag must sit on the node
// invocation itself, where the shell's default Node — not the shim — decides
// the version; this wrapper re-execs onto Node ≥22.12 first, then spawns the
// runner. CI pins Node from .nvmrc, so there this is a passthrough.
import './lib/ensure-node22.mjs';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tests = readdirSync(join(root, 'test'))
  .filter((f) => f.endsWith('.test.mjs'))
  .map((f) => join('test', f));

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--test', ...tests],
  { cwd: root, stdio: 'inherit' },
);
process.exit(result.status ?? 1);
