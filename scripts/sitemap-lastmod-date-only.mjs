// Post-build formatter: <lastmod> as YYYY-MM-DD, matching ai-literacy-platform.
// astro.config.ts feeds the sitemap date-only values, but @astrojs/sitemap gives
// the `sitemap` package no way to set lastmodDateOnly, so it expands every one
// to a full ISO timestamp. Collapsing back is lossless — and only midnight-UTC
// values are touched, so a genuinely time-stamped entry would survive untouched.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIDNIGHT_UTC = /<lastmod>(\d{4}-\d{2}-\d{2})T00:00:00\.000Z<\/lastmod>/g;

let trimmed = 0;
const finals = [];
for (const name of readdirSync('dist').filter((f) => /^sitemap.*\.xml$/.test(f))) {
  const path = join('dist', name);
  const before = readFileSync(path, 'utf8');
  const after = before.replace(MIDNIGHT_UTC, (_, day) => {
    trimmed += 1;
    return `<lastmod>${day}</lastmod>`;
  });
  if (after !== before) writeFileSync(path, after);
  finals.push([name, after]);
}

// Postcondition: the config feeds the sitemap only date-only values, so any
// midnight-UTC timestamp still present means the pattern above rotted against
// a new serialization — fail rather than ship it with a green build.
const rotted = finals.filter(([, text]) => /<lastmod>[^<]*T00:00:00[^<]*<\/lastmod>/.test(text));
if (rotted.length > 0) {
  console.error(
    `sitemap lastmod: midnight-UTC timestamps survived in ${rotted.map(([n]) => n).join(', ')} — ` +
      'the normalizer pattern no longer matches the sitemap serialization',
  );
  process.exit(1);
}

console.log(`sitemap lastmod: ${trimmed} value(s) normalized to YYYY-MM-DD`);
