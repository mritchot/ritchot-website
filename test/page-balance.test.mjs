// The shared page-balance module is mirrored from rescv-pdf-generator and
// guarded by a hash both repos record. resume:pdf checks it at run time; this
// binds the same check into `npm test` and CI, so an unreconciled edit fails
// here instead of detonating at the next PDF regeneration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import {
  sharedRegion,
  trailingGaps,
  countMarkerAnnotations,
  fittingPick,
} from '../scripts/lib/page-balance.mjs';

const balance = readFileSync(new URL('../scripts/lib/page-balance.mjs', import.meta.url), 'utf8');
const script = readFileSync(new URL('../scripts/resume-pdf.mjs', import.meta.url), 'utf8');

test('shared region hashes to the constant resume-pdf.mjs records', () => {
  const recorded = script.match(/PAGE_BALANCE_SHA = '([0-9a-f]{64})'/)?.[1];
  assert.ok(recorded, 'PAGE_BALANCE_SHA not found in resume-pdf.mjs');
  const actual = createHash('sha256').update(sharedRegion(balance)).digest('hex');
  assert.equal(
    actual,
    recorded,
    'page-balance.mjs shared region drifted from its recorded hash — reconcile against the ' +
      'canonical copy in rescv-pdf-generator/src/page-balance.mjs and update the constant in ' +
      'BOTH repos in the same session',
  );
});

test('sharedRegion refuses a file without the marker', () => {
  assert.throws(() => sharedRegion('// no marker here'), /cannot locate the hashed region/);
});

test('a page with no markers reads as full, not as a hole', async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const gaps = trailingGaps(pdf, { margin: { top: '11mm', bottom: '12mm' } });
  assert.deepEqual(gaps, [0]);
  assert.equal(countMarkerAnnotations(pdf), 0);
});

test('fittingPick keeps the largest size that fits and balances, ignoring the final page', () => {
  const fit = fittingPick({ maxPages: 2, balance: 0.1 });
  assert.equal(fit.consider(8.5, 3, [0, 0, 0]), false);
  assert.equal(fit.consider(8.4, 2, [0.05, 0.9]), true);
  assert.deepEqual(fit.result(), {
    pick: { size: 8.4, gap: 0.05 },
    balanced: true,
    smallest: { size: 8.4, pages: 2 },
  });
});

test('fittingPick falls back to the largest fitting size when nothing balances', () => {
  const fit = fittingPick({ maxPages: 2, balance: 0.1 });
  assert.equal(fit.consider(8.5, 2, [0.4, 0]), false);
  assert.equal(fit.consider(8.4, 2, [0.2, 0]), false);
  const { pick, balanced } = fit.result();
  assert.deepEqual(pick, { size: 8.5, gap: 0.4 });
  assert.equal(balanced, false);
});

test('fittingPick yields a null pick when nothing fits', () => {
  const fit = fittingPick({ maxPages: 1, balance: 0.1 });
  assert.equal(fit.consider(13, 2, [0, 0]), false);
  assert.equal(fit.consider(9.5, 2, [0, 0]), false);
  assert.deepEqual(fit.result(), {
    pick: null,
    balanced: false,
    smallest: { size: 9.5, pages: 2 },
  });
});
