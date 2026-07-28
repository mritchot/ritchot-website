import { execFileSync } from 'node:child_process';
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

/** Author date of a path's last commit. Empty output — a shallow CI clone, or
 *  an untracked file — yields undefined, never a fabricated fallback. */
const gitDay = (path: string): string | undefined => {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%aI', '--', path], {
      cwd: root('.'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out ? isoDay(out) : undefined;
  } catch {
    return undefined;
  }
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

// Projects: git author date of the .md. Honest here, unlike the writing
// archive — these files were authored in this repo, not migrated into it.
const projectDays = markdownIn('src/content/projects').map((file) => {
  const day = gitDay(`src/content/projects/${file}`);
  record(`/projects/${file.replace(/\.md$/, '')}/`, day);
  return day;
});

// Collection indexes move when their newest entry does.
record('/writing/', newest(writingDays));
record('/projects/', newest(projectDays));

// Static pages were genuinely authored in-repo, so git is the real signal.
record('/', gitDay('src/pages/index.astro'));
record('/about/', gitDay('src/pages/about.astro'));
record('/subscribe/', gitDay('src/pages/subscribe.astro'));
record('/ai-courses/', gitDay('src/pages/ai-courses.astro'));
// /resume/ renders src/data/resume.yaml through the page: either can change it.
record('/resume/', newest([gitDay('src/pages/resume.astro'), gitDay('src/data/resume.yaml')]));

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
