// resume-pdf.mjs — render /resume/ (print stylesheet) to public/resume.pdf.
// Local, deliberate step (§5.6): `npm run resume:pdf` after a resume.yaml
// change, commit the artifact alongside it. Builds first so the PDF always
// reflects the current YAML; page and PDF cannot drift.
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4322;

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

  const browser = await chromium.launch();
  const page = await browser.newPage();
  // belt to motion.ts's beforeprint reveal: the D24 script no-ops entirely
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`http://localhost:${PORT}/resume/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = join(root, 'public/resume.pdf');
  await page.pdf({
    path: out,
    format: 'A4',
    margin: { top: '11mm', bottom: '12mm', left: '13mm', right: '13mm' },
    printBackground: false,
  });
  await browser.close();

  // hard gate (5b finding 16): the resume never exceeds two pages
  const doc = await PDFDocument.load(readFileSync(out));
  const pages = doc.getPageCount();
  if (pages > 2) {
    throw new Error(`resume.pdf is ${pages} pages — the hard maximum is 2. Tighten print CSS or content.`);
  }
  console.log(`wrote public/resume.pdf (${pages} page${pages === 1 ? '' : 's'})`);
} finally {
  server.kill();
}
