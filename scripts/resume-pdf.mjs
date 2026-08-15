// resume-pdf.mjs — render /resume/ (print stylesheet) to public/resume.pdf.
// Local, deliberate step (§5.6): `npm run resume:pdf` after a resume.yaml
// change, commit the artifact alongside it. Builds first, so the PDF's
// *content* always reflects the current YAML and cannot drift from the page.
//
// Its *type size* deliberately can. The PDF is fitted for page balance: the
// largest size on the ladder that fills the foot of every non-final page,
// which is often a step below the 8.5pt the stylesheet declares. A browser
// printing /resume/ applies no such fitting and prints at 8.5pt. Same words,
// same two-page limit, intentionally different type size.
import { execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import {
  RESUME_SIZES,
  MAX_TRAILING_GAP,
  injectMarkers,
  trailingGaps,
  sharedRegion,
} from './lib/page-balance.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4322;

/** SHA-256 of page-balance.mjs's shared region — everything below its header.
 *
 * This file mirrors rescv-pdf-generator/src/page-balance.mjs, which is
 * canonical and records THIS SAME constant. Only the header differs between
 * the copies, and it sits outside the hashed span, so one number serves both.
 * If both repos pass against the same value, the two copies are identical.
 *
 * A repo cannot see the other drift: editing one side and skipping the copy
 * leaves each side internally consistent and passing, with the two recorded
 * constants no longer equal. That is visible on inspection, not at build time.
 * Change the canonical file first, copy across, update both constants. */
const PAGE_BALANCE_SHA = 'f9e81975baafc06d4b79d5cc8fa570a400cc301a47ab6f3cfea2e98cffe0624e';
const CANONICAL = 'rescv-pdf-generator/src/page-balance.mjs';

const balanceSha = createHash('sha256')
  .update(sharedRegion(readFileSync(join(root, 'scripts/lib/page-balance.mjs'), 'utf8')))
  .digest('hex');
if (balanceSha !== PAGE_BALANCE_SHA) {
  throw new Error(
    `scripts/lib/page-balance.mjs shared region hashes to ${balanceSha.slice(0, 12)}, expected ` +
      `${PAGE_BALANCE_SHA.slice(0, 12)}. The shared measurement module changed. Reconcile it ` +
      `against ${CANONICAL}, then set PAGE_BALANCE_SHA to the new value in BOTH repos in the ` +
      `same session — they must record the same number.`,
  );
}

/** Page geometry. Shared with rescv-pdf-generator so the two resumes sit on
 *  the same grid. */
const GEOMETRY = {
  format: 'A4',
  margin: { top: '11mm', bottom: '12mm', left: '13mm', right: '13mm' },
  printBackground: false,
};

const MAX_PAGES = 2;
const STYLE_ID = 'resume-size-override';

/** Loads /resume/ fresh, sets the root type size, and absolutizes site links.
 *
 * Every attempt reloads rather than mutating the previous DOM: injectMarkers
 * wraps last words in anchors, so running it twice over one document would
 * measure its own leftovers. The reload also means the override tag can never
 * stack — it is created once per load and rewritten in place if it survives. */
async function prepare(page, url, size) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate(
    ({ id, size }) => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('style');
        el.id = id;
        document.head.append(el);
      }
      // print-scoped, and !important because the page's own @media print block
      // sets :global(html) { font-size: 8.5pt } and has to lose to the fit
      el.textContent = `@media print { html { font-size: ${size}pt !important; } }`;
    },
    { id: STYLE_ID, size },
  );

  // the PDF outlives this render: site-relative links (the /docs/*
  // credentials) must resolve to production, not the preview server
  await page.evaluate(() => {
    for (const a of document.querySelectorAll('a[href^="/"]')) {
      a.href = new URL(a.getAttribute('href'), 'https://ritchot.me').href;
    }
  });
}

console.log('building…');
execSync('npx astro build', { cwd: root, stdio: 'inherit' });

console.log('serving dist…');
const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], {
  cwd: root,
  stdio: 'pipe',
});

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview server timed out')), 30000);
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes(String(PORT))) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('exit', () => reject(new Error('preview server exited early')));
  });

  const url = `http://localhost:${PORT}/resume/`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // belt to motion.ts's beforeprint reveal: the D24 script no-ops entirely
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // fit: largest size that holds two pages AND fills the foot of page one.
  // The page limit is a gate; balance is a preference that never blocks a write.
  let chosen = null;
  let fallback = null;
  let smallest = null;

  for (const size of RESUME_SIZES) {
    await prepare(page, url, size);
    await page.evaluate(injectMarkers);

    const buffer = await page.pdf(GEOMETRY);
    const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
    const pages = pdf.getPageCount();
    smallest = { size, pages };

    if (pages > MAX_PAGES) continue;

    // the final page may run short; only a hole mid-document counts
    const gaps = trailingGaps(pdf, GEOMETRY).slice(0, -1);
    const gap = gaps.length ? Math.max(...gaps) : 0;

    if (fallback === null) fallback = { size, gap };
    if (gap <= MAX_TRAILING_GAP) {
      chosen = { size, gap };
      break;
    }
  }

  const pick = chosen ?? fallback;
  if (!pick) {
    throw new Error(
      `resume.pdf does not fit ${MAX_PAGES} pages at any size down to ${smallest.size}pt, ` +
        `where it still runs to ${smallest.pages} pages. Tighten print CSS or content.`,
    );
  }
  if (!chosen) {
    console.warn(
      `note: no size on the ladder fills the foot of every page — ${(pick.gap * 100).toFixed(0)}% ` +
        `of a page sits empty mid-document at ${pick.size}pt. An unbreakable block is too tall ` +
        `for the space left. Trim it, or accept the gap.`,
    );
  }

  // reprint clean: the measured renders carry marker annotations
  const out = join(root, 'public/resume.pdf');
  await prepare(page, url, pick.size);
  await page.pdf({ path: out, ...GEOMETRY });
  await browser.close();

  // deliberate document metadata — no machine or user detail
  const doc = await PDFDocument.load(readFileSync(out), { updateMetadata: false });
  doc.setTitle('Michael Ritchot — Resume');
  doc.setAuthor('Michael Ritchot');
  doc.setSubject('Resume');
  doc.setProducer('ritchot.me resume pipeline');
  doc.setCreator('ritchot.me resume pipeline');
  writeFileSync(out, await doc.save());

  // hard gate: the resume never exceeds two pages
  const pages = doc.getPageCount();
  if (pages > MAX_PAGES) {
    throw new Error(`resume.pdf is ${pages} pages — the hard maximum is ${MAX_PAGES}. Tighten print CSS or content.`);
  }

  // the measurement markers must never ship
  const shipped = await PDFDocument.load(readFileSync(out), { updateMetadata: false });
  const markers = shipped
    .getPages()
    .flatMap((p) => {
      const annots = p.node.Annots();
      if (!annots) return [];
      return Array.from({ length: annots.size() }, (_, i) => annots.lookup(i)).filter((a) => {
        const action = a?.lookup?.(a.context.obj('A'));
        const uri = action?.lookup?.(a.context.obj('URI'));
        const href = uri?.decodeText ? uri.decodeText() : uri?.asString?.();
        return href?.includes('marker.invalid');
      });
    }).length;
  if (markers) {
    throw new Error(`resume.pdf carries ${markers} marker.invalid annotation(s) — the clean reprint failed.`);
  }

  console.log(
    `wrote public/resume.pdf (${pages} page${pages === 1 ? '' : 's'} at ${pick.size}pt, ` +
      `${(pick.gap * 100).toFixed(0)}% trailing gap)`,
  );
} finally {
  server.kill();
}
