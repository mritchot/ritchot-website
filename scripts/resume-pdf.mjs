// resume-pdf.mjs — render /resume/ (print stylesheet) to public/resume.pdf.
// Local, deliberate step: `npm run resume:pdf` after a resume.yaml change,
// commit the artifact alongside it. Builds first, so the PDF's *content*
// always reflects the current YAML and cannot drift from the page.
//
// Its *type size* deliberately can. The PDF is fitted for page balance: the
// largest size on the ladder that fills the foot of every non-final page,
// which is often a step below the 8.5pt the stylesheet declares. A browser
// printing /resume/ applies no such fitting and prints at 8.5pt. Same words,
// same two-page limit, intentionally different type size.
import './lib/ensure-node22.mjs';
import { execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import {
  GEOMETRY,
  RESUME_SIZES,
  MAX_TRAILING_GAP,
  fittingPick,
  injectMarkers,
  trailingGaps,
  sharedRegion,
  countMarkerAnnotations,
  probeBoldWidths,
  WEIGHT_PROBE_MIN,
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
const PAGE_BALANCE_SHA = 'b09e1ad40ec246558c148cbb06117a438bc5646cbe9b0ebca4e8d259e6ae79fc';
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

const MAX_PAGES = 2;
const STYLE_ID = 'resume-size-override';

/** Refuses environments that render bold at regular weight. A broken font
 * stack drops the variable weight axis with no error and no textual trace;
 * geometry is the only witness. */
async function assertBoldRenders(page) {
  const { regular, bold } = await page.evaluate(probeBoldWidths);
  if (!(bold > regular * WEIGHT_PROBE_MIN)) {
    throw new Error(
      `bold renders at regular weight here (700 measures ${bold.toFixed(1)} against ` +
        `${regular.toFixed(1)} at 400) — this environment drops the variable weight axis, ` +
        `and every bold character would print regular with no other symptom. Nothing ` +
        `written. Generate from an environment whose Chromium keeps the axis.`,
    );
  }
}

/** Loads /resume/ fresh, sets the root type size, and absolutizes site links.
 *
 * Every attempt reloads rather than mutating the previous DOM: injectMarkers
 * wraps last words in anchors, so running it twice over one document would
 * measure its own leftovers. The reload also means the override tag is
 * created exactly once per attempt. */
async function prepare(page, url, size) {
  // 'load' suffices for a fully local static page; the fonts.ready gate below
  // covers the one late-arriving layout input. 'networkidle' added a ~500ms
  // idle floor to each of up to 11 ladder reloads.
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate(
    ({ id, size }) => {
      const el = document.createElement('style');
      el.id = id;
      document.head.append(el);
      // print-scoped, and !important because the page's own @media print block
      // sets html { font-size: 8.5pt } and has to lose to the fit
      el.textContent = `@media print { html { font-size: ${size}pt !important; } }`;
    },
    { id: STYLE_ID, size },
  );

  // the PDF outlives this render: every non-absolute href (the /docs/*
  // credentials, and any relative or fragment form) must resolve to
  // production, not the preview server
  await page.evaluate(() => {
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) continue;
      a.href = new URL(href, 'https://ritchot.me/resume/').href;
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

// keep the last of stderr so a startup failure names its cause instead of
// hiding behind "exited early"
const stderrTail = [];
server.stderr.on('data', (chunk) => {
  stderrTail.push(String(chunk));
  if (stderrTail.length > 20) stderrTail.shift();
});

try {
  await new Promise((resolve, reject) => {
    const fail = (msg) =>
      reject(new Error(stderrTail.length ? `${msg}\n${stderrTail.join('')}` : msg));
    const timer = setTimeout(() => fail('preview server timed out'), 30000);
    let seen = '';
    server.stdout.on('data', (chunk) => {
      seen += String(chunk);
      // a port conflict makes vite retry on another port; anything it serves
      // from there is not this build, so stop rather than print a stranger
      if (seen.includes('is in use')) {
        clearTimeout(timer);
        fail(`port ${PORT} is already in use — is another astro dev or preview running?`);
        return;
      }
      // match the ready banner's full origin, not bare digits: the digits
      // alone also appear in the port-conflict warning
      if (seen.includes(`http://localhost:${PORT}/`)) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('error', (err) => {
      clearTimeout(timer);
      fail(`preview server failed to spawn: ${err.message}`);
    });
    server.on('exit', () => {
      clearTimeout(timer);
      fail('preview server exited early');
    });
  });

  const url = `http://localhost:${PORT}/resume/`;

  // belt over the banner match: the page itself must answer before we print
  for (let i = 0; ; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) break;
    } catch {}
    if (i === 20) throw new Error(`preview server never served ${url}`);
    await new Promise((r) => setTimeout(r, 250));
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // measurement must not race any motion; emulate reduced-motion as a belt
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // fit: largest size that holds two pages AND fills the foot of page one.
    // The policy lives in the shared region; this loop only renders and feeds it.
    const fit = fittingPick({ maxPages: MAX_PAGES, balance: MAX_TRAILING_GAP });
    let probed = false;

    for (const size of RESUME_SIZES) {
      await prepare(page, url, size);
      if (!probed) {
        await assertBoldRenders(page);
        probed = true;
      }
      const markers = await page.evaluate(injectMarkers);
      if (markers === 0) {
        throw new Error(
          'injectMarkers matched no blocks — the selectors in page-balance.mjs ' +
            'drifted from resume.astro, and the balance fit would silently no-op.',
        );
      }

      const buffer = await page.pdf(GEOMETRY);
      const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
      if (fit.consider(size, pdf.getPageCount(), trailingGaps(pdf, GEOMETRY))) break;
    }

    const { pick, balanced, smallest } = fit.result();
    if (!pick) {
      throw new Error(
        `resume.pdf does not fit ${MAX_PAGES} pages at any size down to ${smallest.size}pt, ` +
          `where it still runs to ${smallest.pages} pages. Tighten print CSS or content.`,
      );
    }
    if (!balanced) {
      console.warn(
        `note: no size on the ladder fills the foot of every page — ${(pick.gap * 100).toFixed(0)}% ` +
          `of a page sits empty mid-document at ${pick.size}pt. An unbreakable block is too tall ` +
          `for the space left. Trim it, or accept the gap.`,
      );
    }

    // reprint clean: the measured renders carry marker annotations
    await prepare(page, url, pick.size);
    const buffer = await page.pdf(GEOMETRY);

    // every gate runs before anything reaches disk, matching the canonical
    // generator: page limit first, then metadata, then the marker scan over
    // the exact bytes that will be written
    const doc = await PDFDocument.load(buffer, { updateMetadata: false });
    const pages = doc.getPageCount();
    if (pages > MAX_PAGES) {
      throw new Error(
        `resume.pdf would be ${pages} pages — the hard maximum is ${MAX_PAGES}. Nothing written.`,
      );
    }

    // deliberate document metadata — no machine or user detail
    doc.setTitle('Michael Ritchot — Resume');
    doc.setAuthor('Michael Ritchot');
    doc.setSubject('Resume');
    doc.setProducer('ritchot.me resume pipeline');
    doc.setCreator('ritchot.me resume pipeline');
    const bytes = await doc.save();

    // the measurement markers must never ship
    const shipped = await PDFDocument.load(bytes, { updateMetadata: false });
    const markers = countMarkerAnnotations(shipped);
    if (markers) {
      throw new Error(
        `resume.pdf would carry ${markers} marker.invalid annotation(s) — the clean reprint ` +
          `failed. Nothing written.`,
      );
    }

    writeFileSync(join(root, 'public/resume.pdf'), bytes);
    console.log(
      `wrote public/resume.pdf (${pages} page${pages === 1 ? '' : 's'} at ${pick.size}pt, ` +
        `${(pick.gap * 100).toFixed(0)}% trailing gap)`,
    );
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
