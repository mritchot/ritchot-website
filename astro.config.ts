import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { parse as parseYaml } from 'yaml';
import rehypeCodeClasses from './src/lib/rehype-code-classes';
import rehypeExternalLinks from './src/lib/rehype-external-links';
import rehypeFigures from './src/lib/rehype-figures';
import rehypeImgDims from './src/lib/rehype-img-dims';
import rehypeSidenotes from './src/lib/rehype-sidenotes';
import rehypeShy from './src/lib/rehype-shy';

// --- sitemap lastmod -------------------------------------------------------
// Google treats lastmod as a recrawl hint and discounts it site-wide once it
// proves unreliable, so a wrong value is worse than none: anything that cannot
// be sourced honestly below is omitted rather than guessed.

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** YYYY-MM-DD in UTC, or undefined when the value is unusable. UTC throughout:
 *  a bare frontmatter date is midnight UTC, and formatting it in a negative
 *  offset slips it a day — the same reason Footer.astro pins timeZone: 'UTC'. */
const isoDay = (value: unknown): string | undefined => {
  if (value == null || typeof value === 'boolean') return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.valueOf()) ? undefined : d.toISOString().slice(0, 10);
};

const frontmatter = (path: string): Record<string, unknown> => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, 'utf8'));
  if (!match) return {};
  try {
    return (parseYaml(match[1]) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
};

const markdownIn = (dir: string) =>
  readdirSync(root(dir))
    .filter((f) => f.endsWith('.md'))
    .sort();

const newest = (days: (string | undefined)[]): string | undefined =>
  days.filter((d): d is string => Boolean(d)).sort().at(-1);

const lastmod = new Map<string, string>();
const record = (route: string, day: string | undefined) => {
  if (day) lastmod.set(route, day);
};

// Writing posts: frontmatter `updated ?? date` — what the optional `updated`
// field is for. Git dates are worthless here; the repo was created at
// migration, so every post's history starts long after it was published.
// Deriving from git would claim the whole archive changed in July 2026.
const writingDays = markdownIn('src/content/writing').map((file) => {
  const data = frontmatter(root(`src/content/writing/${file}`));
  // Mirrors slugOf() in src/lib/writing.ts: the schema's optional `slug`
  // override wins, so the filename is not always the route.
  const slug = typeof data.slug === 'string' && data.slug ? data.slug : file.replace(/\.md$/, '');
  const day = isoDay(data.updated) ?? isoDay(data.date);
  record(`/writing/${slug}/`, day);
  return day;
});

// The /writing/ index moves when its newest entry does.
record('/writing/', newest(writingDays));

// Everything else — the static pages, /projects/ and the case studies — has no
// frontmatter date, so its date comes from the git history of the file backing
// it. Those are baked into page-dates.json at authoring time rather than read
// here: the deploy builds from a --depth=1 clone, where `git log` reports the
// tip commit's date for every path, which would stamp all of them with the
// deploy date on every deploy. `npm run page-dates` regenerates the file and
// the build fails if it goes stale. See scripts/page-dates.mjs.
for (const [route, day] of Object.entries(
  JSON.parse(readFileSync(root('src/data/page-dates.json'), 'utf8')) as Record<string, string>,
)) {
  record(route, day);
}

export default defineConfig({
  site: 'https://ritchot.me',
  output: 'static',
  markdown: {
    // Built-in Shiki emits inline style attributes; the CSP forbids them.
    // rehypeCodeClasses re-highlights fences with class-based output.
    syntaxHighlight: false,
    // external links first, so the sidenote copies cloned from footnote
    // definitions inherit target/rel; then figures (structure), code classes,
    // and sidenotes; rehypeShy runs last so the sidenote copies exist (and are
    // skipped) before soft hyphens are baked into the remaining prose text.
    rehypePlugins: [
      rehypeExternalLinks,
      rehypeFigures,
      rehypeImgDims,
      rehypeCodeClasses,
      rehypeSidenotes,
      rehypeShy,
    ],
  },
  integrations: [
    sitemap({
      serialize(item) {
        const day = lastmod.get(new URL(item.url).pathname);
        if (day) item.lastmod = day;
        return item;
      },
    }),
  ],
  build: {
    // The CSP in public/_headers is style-src 'self': inline <style> is blocked,
    // so stylesheets must always be emitted as external files.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // script-src 'self' likewise blocks inline scripts: small bundled
      // assets must never be inlined into the HTML.
      assetsInlineLimit: 0,
    },
  },
});
