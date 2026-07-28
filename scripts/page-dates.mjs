// Derives sitemap lastmod dates for the routes that carry no frontmatter date
// of their own, from the git history of the files backing them, and commits the
// result to src/data/page-dates.json.
//
// The dates are baked rather than read at build time because the deploy builds
// from a `git clone --depth=1`. A shallow clone holds exactly one, parentless
// commit, so git reports every file as introduced by it: `git log -1 -- <path>`
// returns the tip commit's date for *every* path. Not empty — confident, wrong,
// and identical everywhere, which is why guarding on empty output missed it.
// Baking removes the build-time git dependency entirely.
//
//   node scripts/page-dates.mjs           regenerate the file
//   node scripts/page-dates.mjs --check   fail if it is stale (runs in build)
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'src/data/page-dates.json';

const git = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

/** YYYY-MM-DD in UTC — matches Footer.astro, so a date never slips in a
 *  negative-offset timezone. */
const dayOf = (path) => {
  const iso = git(['log', '-1', '--format=%aI', '--', path]);
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.valueOf()) ? undefined : d.toISOString().slice(0, 10);
};

const newest = (days) => days.filter(Boolean).sort().at(-1);

function derive() {
  const map = {};
  const set = (route, day) => {
    if (day) map[route] = day;
  };

  set('/', dayOf('src/pages/index.astro'));
  set('/about/', dayOf('src/pages/about.astro'));
  set('/ai-courses/', dayOf('src/pages/ai-courses.astro'));
  set('/subscribe/', dayOf('src/pages/subscribe.astro'));
  // /resume/ renders src/data/resume.yaml through the page: either can change it.
  set('/resume/', newest([dayOf('src/pages/resume.astro'), dayOf('src/data/resume.yaml')]));

  // Projects were authored in this repo, so git is the honest signal for them —
  // unlike the writing archive, which predates the repo and uses frontmatter.
  const projectDays = readdirSync('src/content/projects')
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => {
      const day = dayOf(`src/content/projects/${file}`);
      set(`/projects/${file.replace(/\.md$/, '')}/`, day);
      return day;
    });
  set('/projects/', newest(projectDays));

  // Sorted keys keep the committed diff readable.
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
}

const serialize = (map) => `${JSON.stringify(map, null, 2)}\n`;
const check = process.argv.includes('--check');

// A shallow clone cannot answer the question, so there is nothing to verify
// against — the committed file is authoritative there, which is the whole point.
if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
  console.log('page-dates: shallow clone — using committed dates, skipping check');
  process.exit(0);
}

const derived = serialize(derive());

if (check) {
  const current = (() => {
    try {
      return readFileSync(OUT, 'utf8');
    } catch {
      return '';
    }
  })();
  if (current !== derived) {
    console.error(
      `page-dates: ${OUT} is stale — a backing file changed since it was generated.\n` +
        'Run `npm run page-dates`, then commit the result.',
    );
    process.exit(1);
  }
  console.log('page-dates: committed dates match git');
} else {
  writeFileSync(OUT, derived);
  console.log(`page-dates: wrote ${OUT}`);
}
