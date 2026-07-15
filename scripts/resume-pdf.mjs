// resume-pdf.mjs — render /resume/ (print stylesheet) to public/resume.pdf.
// Local, deliberate step (§5.6): `npm run resume:pdf` after a resume.yaml
// change, commit the artifact alongside it. Builds first so the PDF always
// reflects the current YAML; page and PDF cannot drift.
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

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
  await page.pdf({
    path: join(root, 'public/resume.pdf'),
    format: 'A4',
    margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' },
    printBackground: false,
  });
  await browser.close();
  console.log('wrote public/resume.pdf');
} finally {
  server.kill();
}
