/** Re-execs this process onto an installed Node that satisfies the engines
 * floor (22.12) when the invoking one predates it.
 *
 * Fresh non-interactive shells — coding agents included — resolve whatever
 * Node the machine's default PATH carries, which can sit years behind the
 * version the repo develops against. Without this guard the failure surfaces
 * as a broken run minutes in (Astro refuses old Node at build time) or not at
 * all. Import this module first, for its side effect.
 *
 * The found binary's directory is prepended to PATH for the re-exec, so child
 * processes (`npx`, `npm`) resolve the same Node rather than the stale one.
 * Kept as an identical copy in both PDF-producing repos (rescv-pdf-generator
 * src/, ritchot-website scripts/lib/); edit both or neither.
 */
import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

const REQUIRED = [22, 12, 0];

const parse = (v) => v.replace(/^v/, '').split('.').map(Number);

function atLeast(version, floor) {
  const parts = parse(version);
  for (let i = 0; i < floor.length; i += 1) {
    if ((parts[i] ?? 0) > floor[i]) return true;
    if ((parts[i] ?? 0) < floor[i]) return false;
  }
  return true;
}

if (!atLeast(process.versions.node, REQUIRED)) {
  const wanted = REQUIRED.join('.');

  // one hop only: a second trip here means the found binary lied
  if (process.env.ENSURE_NODE_REEXEC) {
    console.error(`Node ${process.versions.node} still below ${wanted} after re-exec; giving up.`);
    process.exit(1);
  }

  const nvmNodes = join(process.env.NVM_DIR ?? join(homedir(), '.nvm'), 'versions/node');
  const nvmCandidates = existsSync(nvmNodes)
    ? readdirSync(nvmNodes)
        .filter((v) => atLeast(v, REQUIRED))
        .sort((a, b) => {
          const [x, y] = [parse(a), parse(b)];
          return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
        })
        .map((v) => join(nvmNodes, v, 'bin/node'))
    : [];

  const found = [...nvmCandidates, '/opt/homebrew/bin/node', '/usr/local/bin/node']
    .filter(existsSync)
    .find((bin) => {
      const probe = spawnSync(bin, ['--version'], { encoding: 'utf8' });
      return probe.status === 0 && atLeast(probe.stdout.trim(), REQUIRED);
    });

  if (!found) {
    console.error(
      `Node ${process.versions.node} is below the required ${wanted} and no newer install was ` +
        `found (looked in nvm's versions, Homebrew, /usr/local). Install one, or run:\n` +
        `  source ~/.nvm/nvm.sh && nvm install 22\nthen retry.`,
    );
    process.exit(1);
  }

  const result = spawnSync(found, process.argv.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      ENSURE_NODE_REEXEC: '1',
      PATH: `${dirname(found)}:${process.env.PATH ?? ''}`,
    },
  });
  process.exit(result.status ?? 1);
}
