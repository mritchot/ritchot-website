// Post-build gate (5c format ruling): the built site serves no WebP/AVIF.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const offenders = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(webp|avif)$/i.test(entry.name)) offenders.push(p);
  }
};
walk('dist');

if (offenders.length) {
  console.error('WebP/AVIF found in dist:\n' + offenders.join('\n'));
  process.exit(1);
}
console.log('dist clean: no WebP/AVIF');
